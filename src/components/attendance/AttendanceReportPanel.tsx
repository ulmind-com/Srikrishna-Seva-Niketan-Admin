import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileDown, Loader2 } from "lucide-react";
import { payrollService, type PayslipDay } from "@/services/payroll.service";
import { resourceServices } from "@/services/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadAttendanceReportPdf } from "@/lib/attendance-report-export";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHIFT_LABEL: Record<string, string> = { day: "Day", night: "Night", full_24h: "24 Hours", custom: "Custom" };
const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half day",
  absent: "Absent",
  leave: "Leave",
  off: "Off",
  unmarked: "Not marked",
};

/** "18:00" -> "6:00 PM". */
function fmtTime(t?: string | null): string {
  if (!t) return "?";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  return `${hi % 12 || 12}:${String(mi).padStart(2, "0")} ${hi < 12 ? "AM" : "PM"}`;
}

/** Shift time window(s) for a day entry. */
function dayShiftText(d: PayslipDay): string {
  if (!d.shift) return "—";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length) {
      return d.shift_windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(", ");
    }
    if (d.start_time || d.end_time) return `${fmtTime(d.start_time)} – ${fmtTime(d.end_time)}`;
  }
  return SHIFT_LABEL[d.shift] ?? d.shift;
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type DayKind = "worked" | "absent" | "leave" | "off" | "unmarked";

/** Reduce the (possibly multiple) shift rows of a date to one cell colour. */
function dayKind(entries: PayslipDay[]): DayKind {
  if (!entries.length || entries.every((e) => e.status === "unmarked")) return "unmarked";
  if (entries.some((e) => e.status === "present" || e.status === "half_day")) return "worked";
  if (entries.some((e) => e.status === "absent")) return "absent";
  if (entries.some((e) => e.status === "leave")) return "leave";
  if (entries.some((e) => e.status === "off")) return "off";
  return "unmarked";
}

const KIND_CLS: Record<DayKind, string> = {
  worked: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  absent: "bg-rose-500/15 text-rose-600 border-rose-500/40 font-semibold",
  leave: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  off: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  unmarked: "bg-muted/30 text-muted-foreground/50 border-transparent",
};
const KIND_LABEL: Record<DayKind, string> = {
  worked: "Worked",
  absent: "Absent",
  leave: "Leave",
  off: "Off",
  unmarked: "Unmarked",
};

/**
 * Per-staff monthly attendance — a colour-coded calendar of worked / absent /
 * leave / off days for a chosen staff member and month, with a premium PDF.
 * Embedded as a tab inside the Attendance page.
 */
export function AttendanceReportPanel() {
  const [month, setMonth] = useState(currentMonth());
  const [employeeId, setEmployeeId] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["employees", "for-attendance-report"],
    queryFn: () => resourceServices.employees.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const { data: slip, isLoading } = useQuery({
    queryKey: ["attendance-report", employeeId, month],
    queryFn: () => payrollService.payslip(employeeId, month),
    enabled: Boolean(employeeId && month),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, PayslipDay[]>();
    for (const d of slip?.days ?? []) {
      const arr = map.get(d.date) ?? [];
      arr.push(d);
      map.set(d.date, arr);
    }
    return map;
  }, [slip]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return [];
    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const out: ({ day: number; iso: string } | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, iso: `${month}-${String(d).padStart(2, "0")}` });
    }
    return out;
  }, [month]);

  const s = slip?.summary;

  const selectedEntries = selected ? byDate.get(selected) ?? [] : [];

  /** Distinct days this staff worked at a given client across the month. */
  function clientMonthDays(customer?: string | null): number {
    if (!customer) return 0;
    const dates = new Set<string>();
    for (const [iso, entries] of byDate) {
      if (
        entries.some(
          (e) =>
            e.customer_name === customer &&
            (e.status === "present" || e.status === "half_day")
        )
      ) {
        dates.add(iso);
      }
    }
    return dates.size;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder="Select staff member…" />
          </SelectTrigger>
          <SelectContent>
            {employees?.items.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} ({e.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <Button
          className="ml-auto"
          onClick={() => slip && downloadAttendanceReportPdf(slip)}
          disabled={!slip}
        >
          <FileDown className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>

      {!employeeId ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
          Pick a staff member to see their attendance.
        </div>
      ) : isLoading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : slip ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Days Worked" value={String(s?.worked_days ?? 0)} tone="text-emerald-500" />
            <Stat label="Absent" value={String(s?.absent_days ?? 0)} tone="text-rose-500" />
            <Stat label="Present (shifts)" value={String(s?.present_days ?? 0)} />
            <Stat label="Leave" value={String(s?.leave_days ?? 0)} />
            <Stat label="Off" value={String(s?.off_days ?? 0)} />
            <Stat label="Gross Pay" value={inr(s?.gross_pay)} tone="text-primary" />
          </div>

          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {(Object.keys(KIND_LABEL) as DayKind[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-3 w-3 rounded border ${KIND_CLS[k]}`} />
                  {KIND_LABEL[k]}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-xs font-semibold text-muted-foreground">
                  {w}
                </div>
              ))}
              {cells.map((cell, i) => {
                if (!cell) return <div key={`b-${i}`} />;
                const entries = byDate.get(cell.iso) ?? [];
                const kind = dayKind(entries);
                const shiftCount = entries.filter(
                  (e) => e.status === "present" || e.status === "half_day"
                ).length;
                const clickable = entries.length > 0;
                return (
                  <div
                    key={cell.iso}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={() => clickable && setSelected(cell.iso)}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === "Enter" || e.key === " ")) setSelected(cell.iso);
                    }}
                    className={`min-h-[56px] rounded-lg border p-1.5 text-xs transition ${KIND_CLS[kind]} ${
                      clickable ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""
                    }`}
                    title={clickable ? "Click for details" : undefined}
                  >
                    <div className="font-medium">{cell.day}</div>
                    {kind !== "unmarked" && (
                      <div className="mt-0.5 text-[10px] leading-tight">
                        {KIND_LABEL[kind]}
                        {shiftCount > 1 ? ` ×${shiftCount}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {/* Day detail — client, shift time(s), status for the clicked date. */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? prettyDate(selected) : ""}</DialogTitle>
          </DialogHeader>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded for this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedEntries.map((e, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        e.status === "present" || e.status === "half_day"
                          ? "text-emerald-600"
                          : e.status === "absent"
                          ? "text-rose-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                    {e.amount ? <span className="text-sm font-semibold">{inr(e.amount)}</span> : null}
                  </div>
                  {(e.status === "present" || e.status === "half_day") && (
                    <div className="mt-1.5 space-y-0.5 text-sm">
                      <div>
                        <span className="text-muted-foreground">Client: </span>
                        <span className="font-medium">{e.customer_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Shift: </span>
                        <span className="font-medium">{dayShiftText(e)}</span>
                      </div>
                      {e.customer_name && (
                        <div className="text-xs text-muted-foreground">
                          This month at {e.customer_name}: {clientMonthDays(e.customer_name)} day(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {selectedEntries.filter((e) => e.status === "present" || e.status === "half_day").length}{" "}
                shift(s) worked this day.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-1 text-xl font-bold ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
