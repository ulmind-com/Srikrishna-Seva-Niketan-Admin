import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Loader2, Printer, ReceiptText, Wallet, X } from "lucide-react";
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
  leave: "Leave",
  off: "Off",
  absent: "Absent",
  unmarked: "—",
};
const STATUS_CLS: Record<string, string> = {
  present: "text-emerald-600",
  half_day: "text-amber-600",
  leave: "text-rose-600",
  off: "text-slate-500",
  absent: "text-rose-700 font-semibold",
  unmarked: "text-muted-foreground/50",
};
const SHIFT_LABEL: Record<string, string> = {
  day: "Day",
  night: "Night",
  full_24h: "24h",
  custom: "Custom",
};

/** "18:00" -> "6:00 PM". */
function fmtTime(t?: string | null): string {
  if (!t) return "?";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  const suffix = hi < 12 ? "AM" : "PM";
  const h12 = hi % 12 || 12;
  return `${h12}:${String(mi).padStart(2, "0")} ${suffix}`;
}

/** Shift cell for a payslip day — time window(s) for custom shifts. */
function dayShiftText(d: {
  shift: string | null;
  start_time?: string | null;
  end_time?: string | null;
  shift_windows?: { start?: string | null; end?: string | null }[] | null;
}): string {
  if (!d.shift) return "—";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length) {
      return d.shift_windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(", ");
    }
    if (d.start_time || d.end_time) return `${fmtTime(d.start_time)} – ${fmtTime(d.end_time)}`;
  }
  return SHIFT_LABEL[d.shift] ?? d.shift;
}

function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}
const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
function prettyMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * Monthly payroll run and printable payslips. The table is the whole month's
 * run for every staff member (payable days × daily rate, leave/off excluded);
 * picking a row opens that staff member's day-by-day slip, which prints on its
 * own via the print styles below.
 */
export function PayslipPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [branch, setBranch] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: locData } = useQuery({
    queryKey: ["payroll-locations"],
    queryFn: () => http.list<Location>(endpoints.locations.root, { page_size: 100 }),
    staleTime: 300_000,
    enabled: !!user?.is_superuser,
  });
  const locations = locData?.items ?? [];

  const { data: run, isLoading } = useQuery({
    queryKey: ["payroll-run", month, branch],
    queryFn: () => payrollService.payrollRun(month, branch === "all" ? undefined : branch),
    staleTime: 5_000,
  });

  const { data: slip, isFetching: slipFetching } = useQuery({
    queryKey: ["payslip", selected, month],
    queryFn: () => payrollService.payslip(selected as string, month),
    enabled: !!selected,
  });

  const rows = run?.rows ?? [];

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
          <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly payroll run — pay is payable days (present + half) × daily rate.
            Leave and off days are unpaid.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-auto" />
          {user?.is_superuser && locations.length > 0 && (
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Month</p>
          <p className="mt-1 text-xl font-bold">{prettyMonth(month)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Staff</p>
          <p className="mt-1 text-3xl font-bold">{run?.totals.employees ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total payout</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{inr(run?.totals.total_gross_pay ?? 0)}</p>
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
                <th className="px-3 py-3 text-center font-medium">Leave</th>
                <th className="px-3 py-3 text-center font-medium">Off</th>
                <th className="px-3 py-3 text-center font-medium">Payable</th>
                <th className="px-3 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No staff for this period.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employee_id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.code} · {r.category}</p>
                    </td>
                    <td className="px-3 py-3 text-center">{r.present_days}</td>
                    <td className="px-3 py-3 text-center">{r.half_days}</td>
                    <td className="px-3 py-3 text-center text-rose-600">{r.leave_days}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{r.off_days}</td>
                    <td className="px-3 py-3 text-center font-medium">{r.payable_days}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{r.daily_rate ? inr(r.daily_rate) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{inr(r.gross_pay)}</td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(r.employee_id)}>
                        <ReceiptText className="mr-1 h-3.5 w-3.5" /> Slip
                      </Button>
                    </td>
                  </tr>
                ))
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
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-bold">Shri Krishna Nursing</h2>
                  <p className="text-sm text-muted-foreground">Salary slip · {prettyMonth(slip.period.month)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{slip.employee.name}</p>
                  <p className="text-sm text-muted-foreground">{slip.employee.code} · {slip.employee.category}</p>
                  <p className="text-sm text-muted-foreground">Rate: {slip.employee.daily_rate ? inr(slip.employee.daily_rate) : "—"}/day</p>
                </div>
              </div>

              {/* Summary */}
              <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Days worked", value: slip.summary.worked_days },
                  { label: "Present (shifts)", value: slip.summary.present_days },
                  { label: "Half days", value: slip.summary.half_days },
                  { label: "Absent", value: slip.summary.absent_days },
                  { label: "Leave", value: slip.summary.leave_days },
                  { label: "Off", value: slip.summary.off_days },
                  { label: "Payable days", value: slip.summary.payable_days },
                  { label: "Days in month", value: slip.period.days_in_month },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                ))}
                <div className="col-span-2 rounded-xl border border-primary bg-primary/5 p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Gross pay</p>
                  <p className="text-2xl font-bold text-primary">{inr(slip.summary.gross_pay)}</p>
                </div>
              </div>

              {Object.keys(slip.summary.by_shift).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(slip.summary.by_shift).map(([k, v]) => (
                    <Badge key={k} variant="outline">{SHIFT_LABEL[k] ?? k}: {v}</Badge>
                  ))}
                </div>
              )}

              {slip.off_dates.length > 0 && (
                <div className="mb-4 rounded-xl border border-dashed border-border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Unpaid off / leave dates</p>
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
                      <th className="px-3 py-2 font-medium">Shift</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {slip.days.map((d, i) => (
                      <tr key={`${d.date}-${d.shift ?? "none"}-${i}`}>
                        <td className="px-3 py-1.5 tabular-nums">{d.date}</td>
                        <td className={`px-3 py-1.5 font-medium ${STATUS_CLS[d.status]}`}>{STATUS_LABEL[d.status]}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{dayShiftText(d)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{d.customer_name ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{d.amount ? inr(d.amount) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="px-3 py-2" colSpan={4}>Total gross pay</td>
                      <td className="px-3 py-2 text-right">{inr(slip.summary.gross_pay)}</td>
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
