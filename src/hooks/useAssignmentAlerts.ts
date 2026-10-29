import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";

/** The ring tone lives in public/. The filename has spaces — encode them. */
const SOUND_URL = "/new%20assignments%20comming.mp3";

export interface AssignmentAlerts {
  pending: StaffAssignment[];
  /** True when the browser blocked autoplay — a user gesture is needed first. */
  needsGesture: boolean;
  /** Call from a click to unlock + start the ring. */
  enableSound: () => void;
  /** Stop the ring immediately (e.g. right after accept/decline). */
  stop: () => void;
  isLoading: boolean;
}

/**
 * Polls the nurse's pending duties and rings `new assignments comming.mp3`
 * on loop until none remain. Browsers block autoplay until the user interacts,
 * so the first ring may need a gesture — surfaced via `needsGesture`.
 */
export function useAssignmentAlerts(enabled: boolean): AssignmentAlerts {
  const q = useQuery({
    queryKey: ["staff-pending-assignments"],
    queryFn: () => staffPortalService.assignments(true),
    refetchInterval: 20_000,
    enabled,
  });

  const pending = q.data?.items ?? [];
  const pendingCount = pending.length;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  // Keep the latest pending count readable from the one-off gesture listener.
  const pendingCountRef = useRef(pendingCount);
  pendingCountRef.current = pendingCount;
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const a = new Audio(SOUND_URL);
    a.loop = true;
    a.preload = "auto";
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  // Browsers block autoplay until the user interacts with the page. Prime the
  // audio on the FIRST interaction anywhere so a later ring just works without
  // the nurse having to find the "Tap to enable" button.
  useEffect(() => {
    const prime = () => {
      const a = audioRef.current;
      if (!a || unlockedRef.current) return;
      // Unlock silently: mute, play to satisfy the autoplay gesture, then either
      // keep ringing (if a duty is already pending) or reset — never a blip.
      const pendingNow = pendingCountRef.current > 0;
      a.muted = !pendingNow;
      a.play()
        .then(() => {
          unlockedRef.current = true;
          setNeedsGesture(false);
          if (pendingNow) {
            a.muted = false;
          } else {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          }
        })
        .catch(() => {
          a.muted = false;
        });
    };
    const opts = { capture: true } as const;
    window.addEventListener("pointerdown", prime, opts);
    window.addEventListener("keydown", prime, opts);
    window.addEventListener("touchstart", prime, opts);
    return () => {
      window.removeEventListener("pointerdown", prime, opts);
      window.removeEventListener("keydown", prime, opts);
      window.removeEventListener("touchstart", prime, opts);
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (pendingCount > 0) {
      a.play()
        .then(() => {
          unlockedRef.current = true;
          setNeedsGesture(false);
        })
        .catch(() => setNeedsGesture(true));
    } else {
      a.pause();
      a.currentTime = 0;
      setNeedsGesture(false);
    }
  }, [pendingCount]);

  const enableSound = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.play()
      .then(() => {
        unlockedRef.current = true;
        setNeedsGesture(false);
      })
      .catch(() => {});
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  }, []);

  return { pending, needsGesture, enableSound, stop, isLoading: q.isLoading };
}
