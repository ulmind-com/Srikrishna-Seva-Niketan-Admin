import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { staffPortalService } from "@/services/staff-portal.service";
import type { PayslipDay } from "@/services/payroll.service";
import { Input } from "@/components/ui/input";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

const SHIFT_NAME: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};
const STATUS_LABEL: Record<string, string> = {
  present: "On Duty",
  half_day: "Half day",
  absent: "Absent",
  leave: "On Leave",
  off: "Off",
  unmarked: "—",
};
const STATUS_CLS: Record<string, string> = {
  present: "text-emerald-600",
  half_day: "text-amber-600",
  absent: "text-rose-600",
  leave: "text-rose-500",
  off: "text-slate-500",
  unmarked: "text-muted-foreground/60",
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtTime(t?: string | null): string {
  if (!t) return "?";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  return `${hi % 12 || 12}:${String(mi).padStart(2, "0")} ${hi < 12 ? "AM" : "PM"}`;
}

function shiftText(d: PayslipDay): string {
  if (!d.shift) return "—";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length) {
      return d.shift_windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(", ");
    }
    if (d.start_time || d.end_time) return `${fmtTime(d.start_time)} – ${fmtTime(d.end_time)}`;
  }
  return SHIFT_NAME[d.shift] ?? d.shift;
}

/** The nurse's own monthly attendance + pay — days worked, leave, shifts, salary. */
export function StaffPayslip() {
  const [month, setMonth] = useState(currentMonth());

  const { data: slip, isLoading } = useQuery({
    queryKey: ["my-payslip", month],
    queryFn: () => staffPortalService.myPayslip(month),
    enabled: Boolean(month),
    staleTime: 30_000,
  });

  const s = slip?.summary;
  const marked = (slip?.days ?? []).filter((d) => d.status !== "unmarked");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">My Attendance &amp; Pay</h3>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 w-40"
        />
      </div>

      {isLoading ? (
        <div className="grid h-32 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !slip ? (
        <p className="text-sm text-muted-foreground">No data for this month.</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Tile label="Days Worked" value={String(s?.worked_days ?? 0)} tone="text-emerald-600" />
            <Tile label="On Leave" value={String(s?.leave_days ?? 0)} tone="text-rose-500" />
            <Tile label="Off Days" value={String(s?.off_days ?? 0)} />
            <Tile label="Per Day" value={inr(slip.employee.daily_rate ?? 0)} />
            <Tile label="Leave Deduction" value={inr(s?.leave_deduction)} tone="text-rose-500" />
            <Tile label="Net Payable" value={inr(s?.net_payable)} tone="text-primary" big />
          </div>

          {/* Shift breakdown */}
          {s && Object.keys(s.by_shift).length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Shifts:</span>
              {Object.entries(s.by_shift).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {SHIFT_NAME[k] ?? k} <span className="font-bold">{v}</span>
                </span>
              ))}
            </div>
          )}

          {/* Date-wise history */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Date</span>
              <span>Status · Shift · Client</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-border">
              {marked.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No attendance recorded yet this month.
                </div>
              ) : (
                marked.map((d, i) => (
                  <div key={`${d.date}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2 text-sm">
                    <span className="tabular-nums text-muted-foreground">{d.date.slice(8)}</span>
                    <span>
                      <span className={`font-medium ${STATUS_CLS[d.status] ?? ""}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      {(d.status === "present" || d.status === "half_day") && (
                        <span className="text-xs text-muted-foreground">
                          {" · "}
                          {shiftText(d)}
                          {d.customer_name ? ` · ${d.customer_name}` : ""}
                        </span>
                      )}
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {d.amount ? inr(d.amount) : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: string;
  big?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border p-3 ${big ? "border-primary bg-primary/5" : ""}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-bold ${big ? "text-xl" : "text-lg"} ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
