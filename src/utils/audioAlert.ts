/**
 * High-fidelity alert tone synthesizer & player.
 *
 * Uses Web Audio API for instantaneous zero-latency alert chimes,
 * with graceful fallback to the custom assignment MP3 audio file.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a clean, high-priority dual-tone hospital dispatch chime.
 * Tone: A5 (880Hz) transitioning to E6 (1318.5Hz) with harmonic resonance.
 */
export function playSynthesizedChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone (880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);

    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second harmonic tone (1318.5 Hz) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.5, now + 0.15);

    gain2.gain.setValueAtTime(0.01, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn("Synthesized chime failed", e);
  }
}

/**
 * Plays the official alert sound + triggers mobile device vibration.
 */
export function playDutyAlertSound(): void {
  // 1. Device vibration
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 500]);
    } catch {
      // ignore
    }
  }

  // 2. Audio playback: try custom MP3 audio, fallback to synthesized chime
  try {
    const audio = new Audio("/new assignments comming.mp3");
    audio.volume = 0.85;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy or missing file: fallback to synthesized chime
        playSynthesizedChime();
      });
    }
  } catch {
    playSynthesizedChime();
  }
}

