import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BellRing, CalendarCheck, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { env } from "@/config/env";
import { tokenStore } from "@/services/api/tokens";
import { playDutyAlertSound } from "@/utils/audioAlert";

/**
 * LiveNotificationListener
 * 
 * Polls the backend for new unread notifications every 6 seconds.
 * When a high-priority event is detected:
 *   1. New Booking ("prottekta booking e")
 *   2. Duty Accepted by Nurse
 *   3. Duty Declined by Nurse (with Reason)
 * It plays the ringing sound and shows a full-screen alert modal with action.
 */

// ─── Sound ───────────────────────────────────────────────────
let ringTimer: ReturnType<typeof setInterval> | null = null;

function playSound() {
  playDutyAlertSound();
}

function startRinging() {
  stopRinging();
  playSound();
  ringTimer = setInterval(playSound, 3500);
}

function stopRinging() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}

// ─── Raw fetch helpers ─────────────────────────────────────────
async function fetchUnreadCount(): Promise<number> {
  const token = tokenStore.getAccess();
  if (!token) return -1;

  const res = await fetch(`${env.API_BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return -1;
  const json = await res.json();
  return json?.data?.unread ?? 0;
}

async function fetchLatestNotification(): Promise<{
  id: string;
  title: string;
  message: string;
  type?: string;
  reference_id?: string;
} | null> {
  const token = tokenStore.getAccess();
  if (!token) return null;

  const res = await fetch(
    `${env.API_BASE_URL}/notifications?page=1&page_size=1&is_read=false`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const item = json?.data?.items?.[0];
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.type,
    reference_id: item.reference_id,
  };
}

// ─── Component ───────────────────────────────────────────────
export function LiveNotificationListener() {
  const navigate = useNavigate();
  const isAlertingRef = useRef(false);
  const lastAlertedIdRef = useRef<string | null>(null);

  const [alert, setAlert] = useState<{
    id: string;
    title: string;
    message: string;
    type?: string;
    kind: "booking" | "accepted" | "declined" | "general";
  } | null>(null);

  const poll = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      if (count <= 0) return;

      if (isAlertingRef.current) return;

      const latest = await fetchLatestNotification();
      if (!latest) return;

      // Don't re-alert for the exact same dismissed notification in memory
      if (lastAlertedIdRef.current === latest.id) return;

      const titleLower = (latest.title || "").toLowerCase();
      const isBooking = latest.type === "booking";
      const isDutyAccepted = titleLower.includes("accepted");
      const isDutyDeclined = titleLower.includes("declined");

      // Only trigger audio ring & modal for high-priority operational events:
      // 1. Every new patient booking
      // 2. Nurse accepted duty assignment
      // 3. Nurse declined duty assignment
      if (!isBooking && !isDutyAccepted && !isDutyDeclined) {
        return;
      }

      isAlertingRef.current = true;
      lastAlertedIdRef.current = latest.id;

      let displayTitle = latest.title;
      let kind: "booking" | "accepted" | "declined" | "general" = "general";

      if (isDutyAccepted) {
        kind = "accepted";
        displayTitle = "✅ Duty Accepted by Nurse";
      } else if (isDutyDeclined) {
        kind = "declined";
        displayTitle = "🚨 Duty Declined — Reassign Needed";
      } else if (isBooking) {
        kind = "booking";
        displayTitle = "🛎️ New Patient Booking Received";
      }

      setAlert({
        id: latest.id,
        title: displayTitle,
        message: latest.message,
        type: latest.type,
        kind,
      });

      startRinging();
    } catch (err) {
      console.warn("[LiveNotif] Poll error:", err);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 7000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      stopRinging();
    };
  }, [poll]);

  const dismiss = useCallback(() => {
    setAlert(null);
    stopRinging();
    setTimeout(() => {
      isAlertingRef.current = false;
    }, 2500);
  }, []);

  const viewDetails = useCallback(() => {
    const kind = alert?.kind;
    const navType = alert?.type;
    setAlert(null);
    stopRinging();
    isAlertingRef.current = false;

    if (kind === "accepted" || kind === "declined" || navType === "assignment") {
      navigate("/assignments");
    } else if (kind === "booking" || navType === "booking") {
      navigate("/bookings");
    } else if (navType === "contact") {
      navigate("/contact");
    } else if (navType === "rental") {
      navigate("/equipment");
    } else {
      navigate("/notifications");
    }
  }, [alert, navigate]);

  return (
    <AnimatePresence>
      {alert && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 35 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card text-card-foreground text-center shadow-2xl border border-border"
          >
            {/* Top accent bar */}
            <div
              className={`h-2 w-full ${
                alert.kind === "accepted"
                  ? "bg-emerald-500"
                  : alert.kind === "declined"
                  ? "bg-rose-500"
                  : "bg-primary"
              }`}
            />

            <div className="px-6 pt-7 pb-8 sm:px-8">
              {/* Animated Icon Ring */}
              <div
                className={`mx-auto mb-5 relative flex h-20 w-20 items-center justify-center rounded-full ${
                  alert.kind === "accepted"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : alert.kind === "declined"
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute inset-0 rounded-full ${
                    alert.kind === "accepted"
                      ? "bg-emerald-500/20"
                      : alert.kind === "declined"
                      ? "bg-rose-500/20"
                      : "bg-primary/20"
                  }`}
                />
                <motion.div
                  animate={{ rotate: [0, -12, 12, -12, 12, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                  }}
                >
                  {alert.kind === "accepted" ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  ) : alert.kind === "declined" ? (
                    <AlertTriangle className="h-10 w-10 text-rose-400" />
                  ) : (
                    <BellRing className="h-10 w-10 text-primary" />
                  )}
                </motion.div>
              </div>

              <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
                {alert.title}
              </h2>

              <div className="mb-6 rounded-2xl bg-muted/40 p-3.5 border border-border/60">
                <p className="text-sm leading-relaxed text-foreground font-medium">
                  {alert.message}
                </p>
                {alert.kind === "declined" && (
                  <p className="mt-2 text-xs font-semibold text-rose-400">
                    ⚠️ Action Required: Please assign another nurse from the office panel.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={viewDetails}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.97] ${
                    alert.kind === "declined"
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                      : alert.kind === "accepted"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                      : "bg-primary hover:bg-primary/90 shadow-primary/25"
                  }`}
                >
                  {alert.kind === "declined" ? (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      <span>Reassign Duty Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : alert.kind === "accepted" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>View Assignment</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      <span>View &amp; Assign Duty</span>
                    </>
                  )}
                </button>
                <button
                  onClick={dismiss}
                  className="w-full rounded-2xl bg-muted/60 px-5 py-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-[0.97]"
                >
                  Dismiss Ring
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
