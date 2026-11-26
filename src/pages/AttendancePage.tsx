import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  CalendarDays,
  Clock,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import {
  payrollService,
  type PayslipDay,
} from "@/services/payroll.service";
import type { Employee, Location } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadAttendanceReportPdf } from "@/lib/attendance-report-export";
import { formatAttendanceWindow } from "@/components/documents/document-utils";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  present: {
    label: "Present",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  },
  half_day: {
    label: "Half Day",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  },
  absent: {
    label: "Absent",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800",
  },
  leave: {
    label: "Off",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
  off: {
    label: "Off",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
  unmarked: {
    label: "—",
    cls: "bg-muted text-muted-foreground border-transparent",
  },
};

const SHIFT_LABEL: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

function toISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDateWithDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
  });
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(first), end: toISODate(last) };
}

export function AttendancePage() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(defaultRange.start);
  const [endDate, setEndDate] = useState<string>(defaultRange.end);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [staffSearch, setStaffSearch] = useState<string>("");

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["statement-employees"],
    queryFn: () =>
      http.list<Employee>(endpoints.employees.root, {
        page_size: 150,
      }),
    staleTime: 60_000,
  });

  const { data: locData } = useQuery({
    queryKey: ["statement-locations"],
    queryFn: () => http.list<Location>(endpoints.locations.root, { page_size: 100 }),
    staleTime: 300_000,
    enabled: !!user?.is_superuser,
  });

  const employees = empData?.items ?? [];
  const locations = locData?.items ?? [];

  // Filter staff by branch, verified status, and search
  const filteredEmployees = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return employees
      .filter((e) => (branchFilter === "all" ? true : e.location_id === branchFilter))
      .filter((e) => (e.verification_status ?? "verified") === "verified")
      .filter((e) =>
        q
          ? [e.name, e.code, e.category, e.phone]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, branchFilter, staffSearch]);

  // If no employee selected and we have staff, default to the first one
  const selectedEmp = useMemo(() => {
    if (!employeeId && filteredEmployees.length > 0) {
      return filteredEmployees[0];
    }
    return employees.find((e) => e.id === employeeId);
  }, [employeeId, filteredEmployees, employees]);

  const activeEmployeeId = selectedEmp?.id || employeeId;

  // Fetch statement data for selected staff member and date range
  const {
    data: slip,
    isLoading: statementLoading,
    isFetching: statementFetching,
    refetch,
  } = useQuery({
    queryKey: ["attendance-statement", activeEmployeeId, startDate, endDate],
    queryFn: () => payrollService.payslip(activeEmployeeId, undefined, startDate, endDate),
    enabled: Boolean(activeEmployeeId && startDate && endDate),
    staleTime: 5_000,
  });

  // Presets
  const applyPreset = (preset: "this_month" | "last_15" | "last_30" | "last_month") => {
    const now = new Date();
    if (preset === "this_month") {
      const r = getCurrentMonthRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "last_15") {
      const past = new Date();
      past.setDate(past.getDate() - 14);
      setStartDate(toISODate(past));
      setEndDate(toISODate(now));
    } else if (preset === "last_30") {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setStartDate(toISODate(past));
      setEndDate(toISODate(now));
    } else if (preset === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toISODate(first));
      setEndDate(toISODate(last));
    }
  };

  const s = slip?.summary;
  const daysList = slip?.days ?? [];

  // Printable action
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Staff Duty & Attendance Statement</title>
      </Helmet>

      {/* Print-only CSS styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-duty-statement, #printable-duty-statement * {
            visibility: visible;
          }
          #printable-duty-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Duty & Attendance Statement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-synced from client assignments. View and print the bank-statement register of duties, timings, and daily payouts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={statementFetching}
            className="h-9"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${statementFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => slip && downloadAttendanceReportPdf(slip)}
            disabled={!slip || statementLoading}
            className="h-9"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            disabled={!slip || statementLoading}
            className="h-9 bg-primary text-primary-foreground shadow"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Statement
          </Button>
        </div>
      </div>

      {/* Filter and Date Range Control Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm no-print space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Branch filter for Super Admin */}
          {user?.is_superuser && locations.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branch Office
              </label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quick Staff Search */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Staff
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type name, ID…"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Staff Member Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Staff Member
            </label>
            <Select
              value={activeEmployeeId}
              onValueChange={(val) => setEmployeeId(val)}
              disabled={empLoading}
            >
              <SelectTrigger className="mt-1.5 h-10">
                <SelectValue placeholder="Choose a staff member…" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code || emp.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <div className="relative mt-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To Date
            </label>
            <div className="relative mt-1.5">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">Quick Range:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("this_month")}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              This Month
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last_15")}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              Last 15 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last_30")}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              Last 30 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("last_month")}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              Previous Month
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {selectedEmp && (
              <span>
                Viewing statement for <strong className="text-foreground">{selectedEmp.name}</strong> ({selectedEmp.code})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!activeEmployeeId ? (
        <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-border bg-card/50 text-center">
          <div className="max-w-sm space-y-2 p-6">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="font-semibold text-foreground">Select a Staff Member</h3>
            <p className="text-xs text-muted-foreground">
              Choose a staff member and date range above to generate their bank-statement duty and payment record.
            </p>
          </div>
        </div>
      ) : statementLoading ? (
        <div className="grid h-64 place-items-center rounded-2xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Generating Statement Report…</p>
          </div>
        </div>
      ) : slip ? (
        <div id="printable-duty-statement" className="space-y-6">
          {/* Statement Printable Letterhead Header */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    SRIKRISHNA SEVA NIKETAN
                  </h2>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    DUTY STATEMENT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nursing, Ayah & Attendant Care Services  ·  Helpline: <strong className="text-foreground">9239701265</strong>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Statement Period</p>
                <p className="text-sm font-bold text-foreground">
                  {slip.period.start} to {slip.period.end}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Span: {slip.period.days_in_month} Days
                </p>
              </div>
            </div>

            {/* Staff Info Banner */}
            <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Staff Name</p>
                <p className="text-sm font-bold text-foreground">{slip.employee.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Staff ID / Code</p>
                <p className="text-sm font-semibold text-foreground">{slip.employee.code || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Designation / Role</p>
                <p className="text-sm font-semibold capitalize text-foreground">
                  {slip.employee.category || "Care Staff"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Pay Rate</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {inr(slip.employee.daily_rate)} / day
                </p>
              </div>
            </div>
          </div>

          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Payable Days</p>
                <CalendarDays className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {s?.payable_days ?? s?.worked_days ?? 0}
                <span className="ml-1 text-xs font-normal text-muted-foreground">days</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {s?.present_days ?? 0} full + {s?.half_days ?? 0} half days
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Total Shifts Worked</p>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {s?.total_shifts ?? s?.present_days ?? 0}
                <span className="ml-1 text-xs font-normal text-muted-foreground">shifts</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Across {s?.worked_days ?? 0} worked dates
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Off / Leave Days</p>
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-300">
                {(s?.off_days ?? 0) + (s?.leave_days ?? 0)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">days</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Unpaid days</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Gross Payout</p>
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
                {inr(s?.gross_pay)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Total payable amount</p>
            </div>
          </div>

          {/* Bank-Statement Style Duty Register Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border/80 bg-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold tracking-wide text-foreground">
                Daily Duty & Payout Ledger
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-4 pr-2 w-12 text-center">#</th>
                    <th className="py-3 px-3">Date & Day</th>
                    <th className="py-3 px-3">Duty Hours / Window</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Shift Type</th>
                    <th className="py-3 px-3">Customer / Patient</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 pl-3 pr-4 text-right">Pay Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {daysList.map((d: PayslipDay, index: number) => {
                    const statusInfo = STATUS_BADGE[d.status] || STATUS_BADGE.unmarked;
                    const shiftName = d.shift ? (SHIFT_LABEL[d.shift] || d.shift) : "—";
                    const dutyTiming = formatAttendanceWindow(
                      d.date,
                      d.shift,
                      d.start_time,
                      d.end_time,
                      d.status
                    );

                    const dur =
                      d.duration ||
                      (d.status === "half_day"
                        ? "12 hrs"
                        : d.shift === "full_24h"
                          ? "24 hrs"
                          : d.shift
                            ? "12 hrs"
                            : "—");

                    const isPayable = d.status === "present" || d.status === "half_day";

                    return (
                      <tr
                        key={`${d.date}-${index}`}
                        className={`transition hover:bg-muted/30 ${
                          d.status === "half_day" ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <td className="py-3 pl-4 pr-2 text-center text-xs text-muted-foreground font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                          {formatDateWithDay(d.date)}
                        </td>
                        <td className="py-3 px-3 text-xs text-foreground whitespace-nowrap font-mono">
                          {dutyTiming}
                        </td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                            {dur}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-foreground whitespace-nowrap">
                          {shiftName}
                        </td>
                        <td className="py-3 px-3 text-sm text-foreground">
                          {d.customer_name ? (
                            <span className="font-semibold text-primary">{d.customer_name}</span>
                          ) : (
                            <span className="text-muted-foreground italic">No duty assigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.cls}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap font-semibold">
                          {isPayable && d.amount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                              {inr(d.amount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Statement Summary Table Footer */}
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold text-foreground">
                    <td colSpan={3} className="py-3.5 pl-4 pr-2 text-sm">
                      Total Payable Duties: {s?.payable_days ?? s?.worked_days ?? 0} Days ({s?.total_shifts ?? s?.present_days ?? 0} Shifts)
                    </td>
                    <td colSpan={4} className="py-3.5 px-3 text-right text-xs uppercase tracking-wider text-muted-foreground">
                      Net Total Gross Pay:
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-right text-base text-primary font-mono font-bold">
                      {inr(s?.gross_pay)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Statement footer note */}
            <div className="border-t border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
              <p>
                Certified official duty statement issued by Shri Krishna Nursing Care Services. For discrepancies, contact branch operations at 9239701265.
              </p>
              <p className="font-mono text-[11px]">
                Authorized Signatory: _________________________
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
