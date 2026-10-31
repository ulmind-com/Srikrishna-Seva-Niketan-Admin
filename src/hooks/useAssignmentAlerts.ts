import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";
import { stopAnyActiveAudio } from "@/utils/audioAlert";

/** The ring tone lives in public/. The filename has spaces — encode them. */
const SOUND_URL = "/new%20assignments%20comming.mp3";

let sharedAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
let synthInterval: any = null;
let isAlertActive = false;
let activeOneTouch: (() => void) | null = null;

/** Initialize or get the shared HTMLAudioElement. */
function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_URL);
    sharedAudio.loop = true;
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

/** Get or initialize the shared Web Audio AudioContext. */
function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Play a dual-tone urgent chime using Web Audio API as a fallback. */
function playSynthBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1320, now + 0.15); // E6

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  } catch {}
}

/** Immediately stop ALL alert sounds (audio file + synthetic beeps) and vibrations. */
export function stopDutyAlert() {
  isAlertActive = false;

  // Remove any pending one-touch autoplay resume listeners
  if (activeOneTouch && typeof window !== "undefined") {
    window.removeEventListener("touchstart", activeOneTouch, true);
    window.removeEventListener("pointerdown", activeOneTouch, true);
    window.removeEventListener("click", activeOneTouch, true);
    activeOneTouch = null;
  }

  if (sharedAudio) {
    try {
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
    } catch {}
  }

  // Cancel any general audio and speech synthesis
  stopAnyActiveAudio();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}

/** Trigger alert audio and vibration. */
export function playDutyAlert(): Promise<boolean> {
  isAlertActive = true;

  // 1. Device vibration for mobile nurses
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([300, 150, 300, 150, 600]);
    } catch {}
  }

  // 2. Play the official MP3 recording
  const audio = getSharedAudio();
  audio.currentTime = 0;
  audio.muted = false;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    return playPromise
      .then(() => true)
      .catch(() => {
        // If autoplay is blocked by browser policy:
        // A. Start Web Audio synthesized chime interval
        if (!synthInterval && isAlertActive) {
          playSynthBeep();
          synthInterval = setInterval(() => {
            if (isAlertActive) {
              playSynthBeep();
            } else {
              clearInterval(synthInterval);
              synthInterval = null;
            }
          }, 800);
        }

        // B. Attach a one-time global touch listener to start the MP3 on ANY touch
        const oneTouch = () => {
          if (isAlertActive && sharedAudio) {
            sharedAudio.play().catch(() => {});
          }
          if (synthInterval) {
            clearInterval(synthInterval);
            synthInterval = null;
          }
          window.removeEventListener("touchstart", oneTouch, true);
          window.removeEventListener("pointerdown", oneTouch, true);
          window.removeEventListener("click", oneTouch, true);
          if (activeOneTouch === oneTouch) activeOneTouch = null;
        };
        activeOneTouch = oneTouch;
        window.addEventListener("touchstart", oneTouch, { capture: true, once: true });
        window.addEventListener("pointerdown", oneTouch, { capture: true, once: true });
        window.addEventListener("click", oneTouch, { capture: true, once: true });

        return false;
      });
  }
  return Promise.resolve(true);
}

// Global unlocker: prime audio on the very first user interaction anywhere
if (typeof window !== "undefined") {
  const primeAudio = () => {
    getAudioContext();
    const a = getSharedAudio();
    // Warm up audio buffer silently if not currently active
    if (!isAlertActive) {
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    }
  };
  window.addEventListener("pointerdown", primeAudio, { capture: true, once: true });
  window.addEventListener("touchstart", primeAudio, { capture: true, once: true });
  window.addEventListener("keydown", primeAudio, { capture: true, once: true });
}

export interface AssignmentAlerts {
  pending: StaffAssignment[];
  needsGesture: boolean;
  enableSound: () => void;
  stop: () => void;
  dismiss: (id?: string) => void;
  isLoading: boolean;
}

/**
 * Polls the nurse's pending duties and rings `new assignments comming.mp3`
 * on loop until none remain or duty is accepted/dismissed.
 */
export function useAssignmentAlerts(enabled: boolean): AssignmentAlerts {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const q = useQuery({
    queryKey: ["staff-pending-assignments"],
    queryFn: () => staffPortalService.assignments(true),
    refetchInterval: 10_000,
    enabled,
  });

  const rawPending = q.data?.items ?? [];
  const pending = rawPending.filter((item) => !dismissedIds.has(item.id));
  const pendingCount = pending.length;
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    if (pendingCount > 0) {
      playDutyAlert().then((started) => {
        setNeedsGesture(!started);
      });
    } else {
      stopDutyAlert();
      setNeedsGesture(false);
    }
  }, [pendingCount]);

  // Clean up on complete unmount
  useEffect(() => {
    return () => {
      stopDutyAlert();
    };
  }, []);

  const enableSound = useCallback(() => {
    playDutyAlert().then(() => setNeedsGesture(false));
  }, []);

  const dismiss = useCallback((id?: string) => {
    stopDutyAlert();
    if (id) {
      setDismissedIds((prev) => new Set(prev).add(id));
    } else {
      // dismiss all currently pending
      setDismissedIds(new Set(rawPending.map((p) => p.id)));
    }
  }, [rawPending]);

  const stop = useCallback(() => {
    stopDutyAlert();
    setDismissedIds(new Set(rawPending.map((p) => p.id)));
  }, [rawPending]);

  return { pending, needsGesture, enableSound, stop, dismiss, isLoading: q.isLoading };
}
