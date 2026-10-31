import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, MapPin } from "lucide-react";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";
import { useAssignmentAlerts } from "@/hooks/useAssignmentAlerts";
import { AssignmentRingCard } from "./AssignmentRingCard";
import { AssignmentDetailSheet } from "./AssignmentDetailSheet";

const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "Ongoing";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * The nurse's live duty surface: rings on a new posting, lets them slide to
 * accept/decline, and lists accepted duties — each opening a price-free detail
 * sheet with the route map.
 */
export function StaffDuties() {
  const alerts = useAssignmentAlerts(true);
  const [sheetAssignment, setSheetAssignment] = useState<StaffAssignment | null>(null);

  const duties = useQuery({
    queryKey: ["staff-assignments"],
    queryFn: () => staffPortalService.assignments(),
    refetchInterval: 6_000,
  });

  let locallyCompleted: Set<string> = new Set();
  try {
    const raw = sessionStorage.getItem("ssn_completed_duties");
    if (raw) locallyCompleted = new Set(JSON.parse(raw));
  } catch {}

  const accepted = (duties.data?.items ?? []).filter(
    (a) => a.acceptance_status === "accepted"
  );
  const activeDuties = accepted.filter(
    (a) => a.status !== "completed" && !locallyCompleted.has(a.id)
  );

  const ringing = alerts.pending[0];

  return (
    <>
      {ringing && (
        <AssignmentRingCard
          assignment={ringing}
          needsGesture={alerts.needsGesture}
          onEnableSound={alerts.enableSound}
          onAccepted={(a) => {
            alerts.dismiss(ringing.id);
            setSheetAssignment(a);
          }}
          onDismiss={() => {
            alerts.dismiss(ringing.id);
          }}
        />
      )}

      {accepted.length === 0 ? (
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 text-center shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            বর্তমানে কোনো রানিং ডিউটি নেই
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            অফিস থেকে নতুন রোগী বা ডিউটি অ্যাসাইন করা মাত্রই আপনার ফোনে স্বয়ংক্রিয় অ্যালার্ম ও নোটিফিকেশন বেজে উঠবে।
          </p>
        </div>
      ) : (
        <section className="no-print rounded-3xl border border-border/80 bg-card shadow-soft overflow-hidden">
          <div className="border-b border-border p-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              অ্যাক্টিভ ডিউটি (Current Assignments)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeDuties.length} Active
            </span>
          </div>
          <ul className="divide-y divide-border">
            {accepted.map((a) => {
              const isCompleted = a.status === "completed" || locallyCompleted.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSheetAssignment(a)}
                    className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-muted/40 active:bg-muted/60"
                  >
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-bold text-foreground">
                          {a.customer_name}
                        </p>
                        {isCompleted ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                            ✓ সম্পন্ন (Completed)
                          </span>
                        ) : a.payment_type === "postpaid" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                            Postpaid · Cash: ₹{(a.collect_amount ?? 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-500 border border-cyan-500/20">
                            Prepaid
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {PLACE_LABEL[a.place_type] ?? a.place_type} · from {fmtDate(a.start_date)}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <AssignmentDetailSheet
        assignment={sheetAssignment}
        open={!!sheetAssignment}
        onOpenChange={(o) => !o && setSheetAssignment(null)}
      />
    </>
  );
}
