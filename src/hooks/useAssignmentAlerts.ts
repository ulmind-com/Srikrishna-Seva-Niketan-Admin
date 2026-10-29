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
