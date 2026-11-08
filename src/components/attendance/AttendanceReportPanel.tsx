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
import { downloadAttendanceReportPdf } from "@/lib/attendance-report-export";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
                return (
                  <div
                    key={cell.iso}
                    className={`min-h-[56px] rounded-lg border p-1.5 text-xs ${KIND_CLS[kind]}`}
                    title={entries.map((e) => e.status).join(", ")}
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
