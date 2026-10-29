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
  const accepted = (duties.data?.items ?? []).filter((a) => a.acceptance_status === "accepted");

  const ringing = alerts.pending[0];

  return (
    <>
      {ringing && (
        <AssignmentRingCard
          assignment={ringing}
          needsGesture={alerts.needsGesture}
          onEnableSound={alerts.enableSound}
          onAccepted={(a) => {
            alerts.stop();
            setSheetAssignment(a);
          }}
          onDismiss={() => alerts.stop()}
        />
      )}

      {accepted.length > 0 && (
        <section className="no-print rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">My duties</h2>
          </div>
          <ul className="divide-y divide-border">
            {accepted.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSheetAssignment(a)}
                  className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-semibold">{a.customer_name}</p>
                      {a.status === "completed" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                          ✓ Completed
                        </span>
                      ) : a.payment_type === "postpaid" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/20">
                          Postpaid · Cash: ₹{(a.collect_amount ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-500 border border-cyan-500/20">
                          Prepaid
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {PLACE_LABEL[a.place_type] ?? a.place_type} · from {fmtDate(a.start_date)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
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
