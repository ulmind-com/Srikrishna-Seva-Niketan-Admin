import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, CalendarClock, Loader2, MapPin, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface SlideProps {
  label: string;
  tone: "accept" | "decline";
  disabled?: boolean;
  onConfirm: () => void;
}

/** Slide-to-confirm: drag the thumb past ~80% of the track to fire. */
function SlideToConfirm({ label, tone, disabled, onConfirm }: SlideProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [maxX, setMaxX] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const compute = () => setMaxX(Math.max(0, el.offsetWidth - 56));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toneCls = tone === "accept" ? "bg-success" : "bg-destructive";
  const textCls = tone === "accept" ? "text-success" : "text-destructive";

  return (
    <div
      ref={trackRef}
      className={`relative h-14 w-full select-none overflow-hidden rounded-full border bg-muted/50 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <span className={`absolute inset-0 grid place-items-center text-sm font-semibold ${textCls}`}>
        {label}
      </span>
      <motion.button
        type="button"
        aria-label={label}
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.03}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() >= maxX * 0.8) {
            animate(x, maxX, { duration: 0.12 });
            onConfirm();
          } else {
            animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
          }
        }}
        className={`absolute left-1 top-1 grid h-12 w-12 cursor-grab place-items-center rounded-full ${toneCls} text-white shadow-lg active:cursor-grabbing`}
      >
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

interface RingCardProps {
  assignment: StaffAssignment;
  needsGesture: boolean;
  onEnableSound: () => void;
  onAccepted: (a: StaffAssignment) => void;
  onDismiss: () => void;
}

/**
 * Full-screen ringing card for a brand-new duty. Shows only what the nurse
 * needs to decide — name, place, start date — and never any price.
 */
export function AssignmentRingCard({
  assignment,
  needsGesture,
  onEnableSound,
  onAccepted,
  onDismiss,
}: RingCardProps) {
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff-pending-assignments"] });
    qc.invalidateQueries({ queryKey: ["staff-notifications"] });
    qc.invalidateQueries({ queryKey: ["staff-assignments"] });
  };

  const acceptMut = useMutation({
    mutationFn: () => staffPortalService.acceptAssignment(assignment.id),
    onSuccess: (a) => {
      toast.success("Duty accepted");
      invalidate();
      onAccepted(a);
    },
    onError: () => toast.error("Could not accept — please try again"),
  });

  const declineMut = useMutation({
    mutationFn: () => staffPortalService.declineAssignment(assignment.id, reason.trim() || undefined),
    onSuccess: () => {
      toast.success("Duty declined — the office has been notified");
      invalidate();
      onDismiss();
    },
    onError: () => toast.error("Could not decline — please try again"),
  });

  const busy = acceptMut.isPending || declineMut.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 bg-primary/10 px-5 py-3 text-primary">
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <Bell className="h-5 w-5" />
          </motion.span>
          <span className="text-sm font-bold uppercase tracking-wide">New duty assignment</span>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <p className="text-xs text-muted-foreground">You have been assigned to</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{assignment.customer_name}</h2>
          </div>
          <div className="space-y-2 rounded-2xl bg-muted/40 p-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{PLACE_LABEL[assignment.place_type] ?? assignment.place_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span>From {fmtDate(assignment.start_date)}</span>
            </div>
          </div>

          {needsGesture && (
            <button
              type="button"
              onClick={onEnableSound}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary/10 py-2 text-xs font-medium text-primary"
            >
              <Volume2 className="h-4 w-4" /> Tap to enable the alert sound
            </button>
          )}

          {!declining ? (
            <div className="space-y-3 pt-1">
              <SlideToConfirm
                label={busy ? "Accepting…" : "Slide to accept"}
                tone="accept"
                disabled={busy}
                onConfirm={() => acceptMut.mutate()}
              />
              <SlideToConfirm
                label="Slide to decline"
                tone="decline"
                disabled={busy}
                onConfirm={() => setDeclining(true)}
              />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (required) — e.g. unwell, distance"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setDeclining(false)}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={busy || !reason.trim()}
                  onClick={() => declineMut.mutate()}
                >
                  {declineMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm decline"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
