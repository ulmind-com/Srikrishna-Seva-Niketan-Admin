import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { FileDown, Loader2, Printer, ReceiptText, Search, Wallet, X } from "lucide-react";
import { downloadPayslipPdf } from "@/lib/payslip-export";
import {
  currentMonthRangeIST,
  formatAttendanceWindowIST,
  formatShiftWindowsIST,
  formatSlashDateIST,
  nowIST,
} from "@/lib/ist-datetime";
import { useAuth } from "@/contexts/AuthContext";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import { payrollService } from "@/services/payroll.service";
import type { Location } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half day",
  leave: "Off",
  off: "Off",
  absent: "Absent",
  unmarked: "—",
};
const STATUS_CLS: Record<string, string> = {
  present: "text-emerald-600",
  half_day: "text-amber-600",
  leave: "text-slate-500",
  off: "text-slate-500",
  absent: "text-rose-700 font-semibold",
  unmarked: "text-muted-foreground/50",
};
const SHIFT_LABEL: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24h",
  custom: "Custom",
};

/** Shift cell for a payslip day — shows exact IST dates & times (including next-day checkout). */
function dayShiftText(d: {
  date?: string;
  status?: string;
  shift: string | null;
  start_time?: string | null;
  end_time?: string | null;
  shift_windows?: { start?: string | null; end?: string | null }[] | null;
}): string {
  if (!d.shift) return "—";
  if (d.status === "off" || d.status === "leave" || d.status === "absent" || d.status === "unmarked") {
    return STATUS_LABEL[d.status] ?? "—";
  }
  const shiftTitle =
    d.shift === "morning"
      ? "Morning"
      : d.shift === "day"
      ? "Day Shift"
      : d.shift === "night"
      ? "Night Shift"
      : d.shift === "full_24h"
      ? "24 Hours"
      : "Custom";

  if (d.shift_windows && d.shift_windows.length && d.date) {
    return `${shiftTitle} (${formatShiftWindowsIST(d.date, d.shift_windows)})`;
  }

  if ((d.start_time || d.end_time) && d.date) {
    return `${shiftTitle} (${formatAttendanceWindowIST(d.date, d.shift, d.start_time, d.end_time, d.status)})`;
  }

  const detailedMap: Record<string, string> = {
    morning: "Morning (07:00 AM – 03:00 PM)",
    day: "Day Shift (08:00 AM – 08:00 PM)",
    night: "Night Shift (08:00 PM – 08:00 AM)",
    full_24h: "24 Hours (Round-the-clock)",
    custom: "Custom",
  };
  return detailedMap[d.shift] ?? SHIFT_LABEL[d.shift] ?? d.shift;
}

const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

/**
 * Bank-statement style payroll run & printable payslips for any custom From Date → To Date
 * (or month preset). Picking any staff row generates their day-by-day payslip & PDF for
 * that exact date range.
 */
export function PayslipPage() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => currentMonthRangeIST(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [monthPick, setMonthPick] = useState(defaultRange.start.slice(0, 7));
  const [staffSearch, setStaffSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const applyMonthPreset = (ym: string) => {
    if (!ym) return;
    setMonthPick(ym);
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setStartDate(`${ym}-01`);
    setEndDate(`${ym}-${String(lastDay).padStart(2, "0")}`);
  };

  const applyRangePreset = (preset: "this_month" | "last_month" | "last_15" | "last_7") => {
    const today = nowIST();
    if (preset === "this_month") {
      const r = currentMonthRangeIST();
      setStartDate(r.start);
      setEndDate(r.end);
      setMonthPick(r.start.slice(0, 7));
    } else if (preset === "last_month") {
      const prev = today.minus({ months: 1 });
      setStartDate(prev.startOf("month").toISODate() || "");
      setEndDate(prev.endOf("month").toISODate() || "");
      setMonthPick(prev.toFormat("yyyy-MM"));
    } else if (preset === "last_15") {
      setStartDate(today.minus({ days: 14 }).toISODate() || "");
      setEndDate(today.toISODate() || "");
      setMonthPick("");
    } else if (preset === "last_7") {
      setStartDate(today.minus({ days: 6 }).toISODate() || "");
      setEndDate(today.toISODate() || "");
      setMonthPick("");
    }
  };

  const validRange = !!startDate && !!endDate && endDate >= startDate;

  const { data: locData } = useQuery({
    queryKey: ["payroll-locations"],
    queryFn: () => http.list<Location>(endpoints.locations.root, { page_size: 100 }),
    staleTime: 300_000,
    enabled: !!user?.is_superuser,
  });
  const locations = locData?.items ?? [];

  const { data: run, isLoading } = useQuery({
    queryKey: ["payroll-run", startDate, endDate, branch],
    queryFn: () =>
      payrollService.payrollRun(
        undefined,
        branch === "all" ? undefined : branch,
        startDate,
        endDate
      ),
    enabled: validRange,
    staleTime: 5_000,
  });

  const { data: slip, isFetching: slipFetching } = useQuery({
    queryKey: ["payslip", selected, startDate, endDate],
    queryFn: () =>
      payrollService.payslip(selected as string, undefined, startDate, endDate),
    enabled: !!selected && validRange,
  });

  const rows = useMemo(() => {
    const all = run?.rows ?? [];
    const q = staffSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) =>
      [r.name, r.code, r.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [run?.rows, staffSearch]);

  const periodRangeText = validRange
    ? `${formatSlashDateIST(startDate)} – ${formatSlashDateIST(endDate)}`
    : "Select valid range";

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Payslips</title>
      </Helmet>

      {/* Print styles: show only the slip when printing. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #payslip-print, #payslip-print * { visibility: visible !important; }
        #payslip-print { position: absolute; inset: 0; margin: 0; padding: 24px; box-shadow: none !important; border: none !important; }
        .no-print { display: none !important; }
      }`}</style>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payslips &amp; Salary Statements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate bank-statement style payslips for any custom date range (From Date → To Date) or month.
            Payable days (present + half) × daily rate.
          </p>
        </div>
      </div>

      {/* Bank-Statement Style Date Range & Filter Bar */}
      <div className="no-print rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setMonthPick("");
              }}
              className="mt-1 h-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To Date
            </label>
            <Input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setMonthPick("");
              }}
              className="mt-1 h-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Month
            </label>
            <Input
              type="month"
              value={monthPick}
              onChange={(e) => applyMonthPreset(e.target.value)}
              className="mt-1 h-10"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Staff
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Name, code, role…"
                className="h-10 pl-9"
              />
            </div>
          </div>
          {user?.is_superuser && locations.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branch Office
              </label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-muted-foreground">Statement Presets:</span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyRangePreset("this_month")}>
            This Month
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyRangePreset("last_month")}>
            Previous Month
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyRangePreset("last_15")}>
            Last 15 Days
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyRangePreset("last_7")}>
            Last 7 Days
          </Button>
          {!validRange && (
            <span className="text-xs font-medium text-rose-500 ml-2">
              To Date must be on or after From Date.
            </span>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Statement Period</p>
          <p className="mt-1 text-lg font-bold leading-snug">{periodRangeText}</p>
          {run?.period?.days_in_month ? (
            <p className="text-xs text-muted-foreground mt-0.5">{run.period.days_in_month} days</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Salary Earned</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{inr(run?.totals.total_gross_pay ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-500">{inr(run?.totals.total_paid ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Remaining Balance</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-rose-500">{inr(run?.totals.total_remaining ?? 0)}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Payroll run table */}
      <div className="no-print overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-3 py-3 text-center font-medium">Present</th>
                <th className="px-3 py-3 text-center font-medium">Half</th>
                <th className="px-3 py-3 text-center font-medium">Absent</th>
                <th className="px-3 py-3 text-center font-medium">Off</th>
                <th className="px-3 py-3 text-center font-medium">Payable</th>
                <th className="px-3 py-3 text-right font-medium">Rate</th>
                <th className="px-3 py-3 text-right font-medium">Earned</th>
                <th className="px-3 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Remaining</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={11} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">No staff for this period.</td></tr>
              ) : (
                rows.map((r) => {
                  const effectiveRate = r.daily_rate || (r.payable_days > 0 && r.gross_pay > 0 ? Math.round(r.gross_pay / r.payable_days) : null);
                  return (
                    <tr key={r.employee_id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.code} · {r.category}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-medium">{r.present_days}</span>
                        {r.total_shifts && r.total_shifts > r.present_days ? (
                          <span className="block text-[11px] text-muted-foreground">({r.total_shifts} shifts)</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-center">{r.half_days}</td>
                      <td className="px-3 py-3 text-center text-rose-600">{r.absent_days}</td>
                      <td className="px-3 py-3 text-center text-slate-500">{(r.off_days ?? 0) + (r.leave_days ?? 0)}</td>
                      <td className="px-3 py-3 text-center font-bold text-foreground">{r.payable_days}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{effectiveRate ? inr(effectiveRate) : "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold">{inr(r.gross_pay)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-500">{inr(r.paid_amount ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-500">{inr(r.remaining_amount ?? Math.max(0, r.gross_pay - (r.paid_amount ?? 0)))}</td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(r.employee_id)}>
                          <ReceiptText className="mr-1 h-3.5 w-3.5" /> Slip
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip detail */}
      {selected && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="no-print flex items-center justify-between border-b border-border p-3">
            <p className="text-sm font-medium">Payslip</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => slip && downloadPayslipPdf(slip)}
                disabled={!slip}
              >
                <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!slip}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Print
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {slipFetching || !slip ? (
            <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div id="payslip-print" className="p-6">
              {(() => {
                const slipRate = slip.employee.daily_rate || (slip.summary.payable_days > 0 && slip.summary.gross_pay > 0 ? Math.round(slip.summary.gross_pay / slip.summary.payable_days) : null);
                return (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <h2 className="text-lg font-bold">Shri Krishna Nursing</h2>
                        <p className="text-sm text-muted-foreground">
                          Salary slip · {formatSlashDateIST(slip.period.start)} – {formatSlashDateIST(slip.period.end)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{slip.employee.name}</p>
                        <p className="text-sm text-muted-foreground">{slip.employee.code} · {slip.employee.category}</p>
                        <p className="text-sm text-muted-foreground">Rate: {slipRate ? inr(slipRate) : "—"}/day</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Days worked", value: slip.summary.worked_days },
                        { label: "Present days", value: slip.summary.present_days },
                        { label: "Shifts worked", value: slip.summary.total_shifts ?? slip.summary.present_days },
                        { label: "Half days", value: slip.summary.half_days },
                        { label: "Absent", value: slip.summary.absent_days },
                        { label: "Off days", value: (slip.summary.off_days ?? 0) + (slip.summary.leave_days ?? 0) },
                        { label: "Payable days", value: slip.summary.payable_days },
                        { label: "Per Day Salary", value: inr(slipRate ?? 0) },
                        { label: "Deduction", value: inr(slip.summary.leave_deduction) },
                        { label: "Period days", value: slip.period.days_in_month },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-border p-3">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="text-xl font-bold">{s.value}</p>
                        </div>
                      ))}
                      <div className="col-span-2 rounded-xl border border-primary bg-primary/5 p-3 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Net Payable Salary · Paid {inr(slip.summary.paid_amount ?? 0)}</p>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-2xl font-bold text-primary">{inr(slip.summary.net_payable)}</p>
                          <span className="text-xs font-semibold text-rose-500">
                            Balance: {inr(slip.summary.remaining_amount ?? Math.max(0, slip.summary.net_payable - (slip.summary.paid_amount ?? 0)))}
                          </span>
                        </div>
                        {slip.summary.leave_deduction > 0 && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            after {inr(slip.summary.leave_deduction)} deduction
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {Object.keys(slip.summary.by_shift).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(slip.summary.by_shift).map(([k, v]) => (
                    <Badge key={k} variant="outline">{SHIFT_LABEL[k] ?? k}: {v}</Badge>
                  ))}
                </div>
              )}

              {slip.off_dates.length > 0 && (
                <div className="mb-4 rounded-xl border border-dashed border-border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Unpaid off dates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {slip.off_dates.map((d) => (
                      <span key={d} className="rounded-md bg-muted px-2 py-0.5 text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Day-by-day */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Duty & Shift Timing</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 text-right font-medium">Daily Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Payable Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {slip.days.map((d, i) => (
                      <tr key={`${d.date}-${d.shift ?? "none"}-${i}`}>
                        <td className="px-3 py-1.5 tabular-nums">{d.date}</td>
                        <td className={`px-3 py-1.5 font-medium ${STATUS_CLS[d.status]}`}>{STATUS_LABEL[d.status]}</td>
                        <td className="px-3 py-1.5 text-muted-foreground font-medium">{dayShiftText(d)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{d.customer_name ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{d.pay_rate ? inr(d.pay_rate) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{d.amount ? inr(d.amount) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="px-3 py-2" colSpan={5}>Total gross pay</td>
                      <td className="px-3 py-2 text-right text-base text-primary font-bold">{inr(slip.summary.gross_pay)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
