import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Loader2, Moon, Sun, Clock, Sparkles } from "lucide-react";
import { staffPortalService } from "@/services/staff-portal.service";
import type { PayslipDay } from "@/services/payroll.service";
import { Input } from "@/components/ui/input";

const SHIFT_NAME: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};
const SHIFT_ICON: Record<string, typeof Sun> = {
  morning: Sun,
  day: Sun,
  night: Moon,
  full_24h: Clock,
  custom: Sparkles,
};
const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  present: { label: "On Duty", dot: "bg-emerald-500", text: "text-emerald-600" },
  half_day: { label: "Half day", dot: "bg-amber-500", text: "text-amber-600" },
  absent: { label: "Absent", dot: "bg-rose-500", text: "text-rose-600" },
  leave: { label: "On Leave", dot: "bg-rose-400", text: "text-rose-500" },
  off: { label: "Off", dot: "bg-slate-400", text: "text-slate-500" },
  unmarked: { label: "—", dot: "bg-muted", text: "text-muted-foreground" },
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
  if (!d.shift) return "";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length) {
      return d.shift_windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(", ");
    }
    if (d.start_time || d.end_time) return `${fmtTime(d.start_time)} – ${fmtTime(d.end_time)}`;
  }
  return SHIFT_NAME[d.shift] ?? d.shift;
}
function weekday(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}

/** The nurse's own monthly ATTENDANCE — days worked, leave, off, shifts. No pay. */
export function StaffPayslip() {
  const [month, setMonth] = useState(currentMonth());

  const { data: slip, isLoading } = useQuery({
    queryKey: ["my-attendance", month],
    queryFn: () => staffPortalService.myAttendance(month),
    enabled: Boolean(month),
    staleTime: 30_000,
  });

  const s = slip?.summary;
  const marked = (slip?.days ?? []).filter((d) => d.status !== "unmarked");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">My Attendance</h3>
          <p className="text-xs text-muted-foreground">Your duty record for the month</p>
        </div>
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
          {/* Hero — days worked */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-500">
                <CalendarCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600/80">
                  Days Worked
                </p>
                <p className="text-4xl font-black tabular-nums text-emerald-600">
                  {s?.worked_days ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="On Leave" value={s?.leave_days ?? 0} tone="text-rose-500" />
            <MiniStat label="Off Days" value={s?.off_days ?? 0} tone="text-slate-500" />
            <MiniStat label="Present Shifts" value={s?.present_days ?? 0} tone="text-emerald-600" />
          </div>

          {/* Shift breakdown */}
          {s && Object.keys(s.by_shift).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Shifts worked
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.by_shift).map(([k, v]) => {
                  const Icon = SHIFT_ICON[k] ?? Clock;
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {SHIFT_NAME[k] ?? k}
                      <span className="rounded-md bg-primary/20 px-1.5 font-bold">{v}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date-wise timeline */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Day-by-day
            </p>
            {marked.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No attendance recorded yet this month.
              </div>
            ) : (
              <div className="space-y-2">
                {marked.map((d, i) => {
                  const st = STATUS[d.status] ?? STATUS.unmarked;
                  const worked = d.status === "present" || d.status === "half_day";
                  return (
                    <div
                      key={`${d.date}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex w-11 shrink-0 flex-col items-center">
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {d.date.slice(8)}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {weekday(d.date)}
                        </span>
                      </div>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-semibold ${st.text}`}>{st.label}</span>
                        {worked && (
                          <div className="truncate text-xs text-muted-foreground">
                            {shiftText(d)}
                            {d.customer_name ? ` · ${d.customer_name}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className={`text-2xl font-black tabular-nums ${tone ?? ""}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
