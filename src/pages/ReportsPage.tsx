import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  Users,
  Receipt,
  CalendarDays,
  Download,
  Mail,
  ClipboardList,
  Search,
  FileSpreadsheet,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/lib/report-pdf";
import { downloadDutyReportPdf, downloadDutyReportXlsx } from "@/lib/duty-report-export";
import { ReportDatePicker } from "@/components/reports/ReportDatePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resourceServices } from "@/services/resources";
import { reportsService } from "@/services/reports.service";

const rupee = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/** `YYYY-MM-DD` for a Date in local time (not UTC, which can slip a day). */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

type Period = "today" | "week" | "month" | "year" | "custom";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom",
};

/** Start/end dates for a named period, anchored on today (local). */
function periodRange(p: Period): { start: string; end: string } {
  const now = new Date();
  const end = toISO(now);
  if (p === "today") return { start: end, end };
  if (p === "week") {
    // Calendar week starting Monday.
    const d = new Date(now);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
    return { start: toISO(d), end };
  }
  if (p === "year") {
    return { start: toISO(new Date(now.getFullYear(), 0, 1)), end };
  }
  // Month-to-date.
  return { start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end };
}

// Refresh cadence for the "live" feel.
const LIVE_MS = 30_000;

export function ReportsPage() {
  const today = toISO(new Date());
  const [period, setPeriodState] = useState<Period>("month");
  const monthRange = periodRange("month");
  const [start, setStart] = useState(monthRange.start);
  const [end, setEnd] = useState(today);
  const [branch, setBranch] = useState<string>("all");

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    if (p !== "custom") {
      const r = periodRange(p);
      setStart(r.start);
      setEnd(r.end);
    }
  };

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });
  const loc = branch === "all" ? undefined : branch;

  const pnl = useQuery({
    queryKey: ["report", "pnl", start, end, loc],
    queryFn: () => reportsService.profitLoss({ start, end, location_id: loc }),
    refetchInterval: LIVE_MS,
  });
  const [dutyPaymentType, setDutyPaymentType] = useState<string>("all");
  const [dutyStatus, setDutyStatus] = useState<string>("all");
  const [dutySearch, setDutySearch] = useState<string>("");

  const dist = useQuery({
    queryKey: ["report", "dist", loc],
    queryFn: () => reportsService.distribution({ location_id: loc }),
    refetchInterval: LIVE_MS,
  });
  const pay = useQuery({
    queryKey: ["report", "pay", loc],
    queryFn: () => reportsService.customerPayments({ location_id: loc }),
    refetchInterval: LIVE_MS,
  });
  const daily = useQuery({
    queryKey: ["report", "daily", loc],
    queryFn: () => reportsService.dailySummary({ location_id: loc }),
    refetchInterval: LIVE_MS,
  });
  const duties = useQuery({
    queryKey: ["report", "duties", start, end, loc, dutyPaymentType, dutyStatus],
    queryFn: () =>
      reportsService.duties({
        start,
        end,
        location_id: loc,
        payment_type: dutyPaymentType,
        status: dutyStatus,
      }),
    refetchInterval: LIVE_MS,
  });

  const anyFetching =
    pnl.isFetching || dist.isFetching || pay.isFetching || daily.isFetching || duties.isFetching;

  const exportDutiesCsv = () => {
    const items = duties.data?.items ?? [];
    if (!items.length) {
      toast.error("No duties to export for this period");
      return;
    }
    const headers = [
      "Date Range",
      "Shift",
      "Duration (Days)",
      "Customer Name",
      "Customer Phone",
      "Staff Member",
      "Staff Code",
      "Posted Location",
      "Payment Model",
      "Payment Status",
      "Customer Fee (INR)",
      "Staff Payout (INR)",
      "Expenses (INR)",
      "Company Profit (INR)",
      "Margin %",
      "Status",
      "Completed At",
      "Payment Received At",
      "Payment Received By",
      "Branch",
    ];

    const rows = items.map((r) => [
      `"${r.start_date} ${r.end_date ? '→ ' + r.end_date : '(ongoing)'}"`,
      `"${r.shift}"`,
      r.duration_days ?? 1,
      `"${r.customer_name}"`,
      `"${r.customer_phone || ''}"`,
      `"${r.employee_name}"`,
      `"${r.employee_code || ''}"`,
      `"${r.place_name || r.place_type}"`,
      `"${r.payment_type}"`,
      `"${r.payment_status}"`,
      r.customer_rate,
      r.employee_payout,
      r.other_expense,
      r.profit,
      `${r.margin_pct}%`,
      `"${r.status}"`,
      `"${r.work_completed_at || ''}"`,
      `"${r.payment_received_at || ''}"`,
      `"${r.payment_received_by || ''}"`,
      `"${r.location_name}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `duty_report_${start}_to_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Duty report exported to CSV");
  };

  const branchName =
    branch === "all"
      ? "All branches"
      : locations?.items.find((b) => b.id === branch)?.name ?? "Branch";

  const emailReport = useMutation({
    mutationFn: () => reportsService.sendDailyEmail(),
    onSuccess: () => toast.success("Daily report emailed to the super admins"),
    onError: () => toast.error("Could not send the report email"),
  });

  const exportPdf = () =>
    downloadReportPdf({
      periodLabel: PERIOD_LABEL[period],
      start,
      end,
      branchName,
      pnl: pnl.data,
      payments: pay.data,
      distribution: dist.data,
    });

  const dutyExportInput = () => ({
    items: duties.data?.items ?? [],
    summary: duties.data?.summary,
    start,
    end,
    branchName,
  });
  const exportDutyPdf = () => {
    if (!(duties.data?.items ?? []).length) {
      toast.error("No duties to export for this period");
      return;
    }
    downloadDutyReportPdf(dutyExportInput());
    toast.success("Duty report PDF downloaded");
  };
  const exportDutyExcel = () => {
    if (!(duties.data?.items ?? []).length) {
      toast.error("No duties to export for this period");
      return;
    }
    downloadDutyReportXlsx(dutyExportInput());
    toast.success("Duty report Excel downloaded");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Profit & loss, staff distribution, customer payments and the daily summary."
        icon={<BarChart3 />}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-success opacity-75 ${
                    anyFetching ? "animate-ping" : ""
                  }`}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live
            </span>
            <ReportDatePicker
              start={start}
              end={end}
              activePreset={period}
              onChange={(s, e, p) => {
                setStart(s);
                setEnd(e);
                setPeriodState((p || "custom") as Period);
              }}
            />
            <Button
              variant="default"
              size="sm"
              onClick={exportDutyPdf}
              disabled={duties.isLoading}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
              title="Download Detailed PDF Report"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportDutyExcel}
              disabled={duties.isLoading}
              className="h-9 gap-1.5 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-xs"
              title="Download Detailed Excel (.xlsx) Report"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download Excel</span>
            </Button>
            <div className="w-44">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {(locations?.items ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => emailReport.mutate()}
              disabled={emailReport.isPending}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              {emailReport.isPending ? "Sending…" : "Email"}
            </Button>
          </div>
        }
      />

      {/* Period presets bar with calendar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> Period:
          </span>
          {([
            ["today", "Today"],
            ["week", "This Week"],
            ["month", "This Month"],
            ["year", "This Year"],
            ["custom", "Custom"],
          ] as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                period === key
                  ? "border-primary bg-primary/15 text-primary font-semibold shadow-xs"
                  : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <ReportDatePicker
            start={start}
            end={end}
            activePreset={period}
            onChange={(s, e, p) => {
              setStart(s);
              setEnd(e);
              setPeriodState((p || "custom") as Period);
            }}
            className="h-7 text-xs ml-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportDutyExcel}
            className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
          >
            <FileSpreadsheet className="h-3 w-3" /> Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportDutyPdf}
            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
          >
            <Download className="h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="duties">
        <TabsList>
          <TabsTrigger value="duties"><ClipboardList className="mr-1.5 h-4 w-4" /> Duty &amp; Payment Details</TabsTrigger>
          <TabsTrigger value="daily"><CalendarDays className="mr-1.5 h-4 w-4" /> Daily</TabsTrigger>
          <TabsTrigger value="pnl"><TrendingUp className="mr-1.5 h-4 w-4" /> Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="dist"><Users className="mr-1.5 h-4 w-4" /> Distribution</TabsTrigger>
          <TabsTrigger value="pay"><Receipt className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

        {/* Duties & Payment detailed ledger */}
        <TabsContent value="duties" className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Total Duties" value={duties.data?.summary.total_duties ?? "—"} />
            <Stat label="Client Billed" value={rupee(duties.data?.summary.total_billed)} tone="text-success" />
            <Stat label="Staff Payout" value={rupee(duties.data?.summary.total_staff_payout)} tone="text-destructive" />
            <Stat label="Expenses" value={rupee(duties.data?.summary.total_expenses)} tone="text-destructive" />
            <Stat
              label="Net Profit"
              value={rupee(duties.data?.summary.total_profit)}
              tone={(duties.data?.summary.total_profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
            />
            <Stat
              label="Company Margin"
              value={`${duties.data?.summary.overall_margin_pct ?? 0}%`}
              tone={(duties.data?.summary.total_profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
            />
          </div>

          {/* Prepaid vs Postpaid sub-breakdown with crystal-clear settlement explanations */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-cyan-400 font-semibold">
                    Prepaid (অফিস অগ্রিম পরিশোধিত)
                  </p>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">
                    ✓ Settled
                  </Badge>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-foreground">
                  {rupee(duties.data?.summary.prepaid_total)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({duties.data?.summary.prepaid_count ?? 0} duties)
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Office collected money upfront online or at desk. Fully paid.
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold">
                    Postpaid · Cash Collected (আদায়কৃত ক্যাশ)
                  </p>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                    ✓ Collected
                  </Badge>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-foreground">
                  {rupee(duties.data?.summary.postpaid_collected)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({(duties.data?.summary.postpaid_count ?? 0) - (duties.data?.summary.postpaid_pending ? 1 : 0)} settled)
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Staff member collected physical cash in-hand from patient.
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold">
                    Postpaid · Pending Cash (বকেয়া ক্যাশ)
                  </p>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                    ⏳ Awaiting Cash
                  </Badge>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-amber-400">
                  {rupee(duties.data?.summary.postpaid_pending)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pending cash collection from patient upon completion.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Export Bar */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search patient, phone, nurse..."
                      value={dutySearch}
                      onChange={(e) => setDutySearch(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>
                  <Select value={dutyPaymentType} onValueChange={setDutyPaymentType}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="All Models" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                      <SelectItem value="postpaid">Postpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dutyStatus} onValueChange={setDutyStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  <ReportDatePicker
                    start={start}
                    end={end}
                    activePreset={period}
                    onChange={(s, e, p) => {
                      setStart(s);
                      setEnd(e);
                      setPeriodState((p || "custom") as Period);
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportDutyExcel}
                    className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15"
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Excel (.xlsx)
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={exportDutyPdf}
                    className="h-8 text-xs shadow-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={exportDutiesCsv}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; Shift</TableHead>
                    <TableHead>Client (Patient)</TableHead>
                    <TableHead>Service Staff</TableHead>
                    <TableHead>Payment Model</TableHead>
                    <TableHead className="text-right">Client Bill</TableHead>
                    <TableHead className="text-right">Staff Pay</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead>Duty Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rawItems = duties.data?.items ?? [];
                    const q = dutySearch.toLowerCase().trim();
                    const filtered = q
                      ? rawItems.filter(
                          (r) =>
                            r.customer_name?.toLowerCase().includes(q) ||
                            r.customer_phone?.toLowerCase().includes(q) ||
                            r.employee_name?.toLowerCase().includes(q) ||
                            r.employee_code?.toLowerCase().includes(q) ||
                            r.address?.toLowerCase().includes(q)
                        )
                      : rawItems;

                    if (!filtered.length) {
                      return (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No duty engagements found for the selected period.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filtered.map((r) => {
                      const isPostpaid = r.payment_type === "postpaid";
                      const collected =
                        r.payment_status === "paid" || r.payment_status === "received";
                      // Prepaid is collected by the office in advance, so it is
                      // always settled — only postpaid can be pending collection.
                      const settled = !isPostpaid || collected;
                      const payLabel = !isPostpaid
                        ? "✓ Advance Paid"
                        : collected
                        ? "✓ Cash Collected"
                        : "⏳ Pending Collection";
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-foreground">
                                {r.start_date}
                                {r.end_date ? ` → ${r.end_date}` : " (ongoing)"}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {r.shift === "full_24h" ? "24 Hours" : r.shift === "day" ? "Day" : r.shift === "night" ? "Night" : r.shift}
                                {r.duration_days ? ` · ${r.duration_days} day(s)` : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{r.customer_name}</span>
                              {r.customer_phone && (
                                <a href={`tel:${r.customer_phone}`} className="text-xs text-primary hover:underline">
                                  {r.customer_phone}
                                </a>
                              )}
                              <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {r.place_name || r.address || r.place_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{r.employee_name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {r.employee_code || "Staff"} · {r.location_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant={isPostpaid ? "secondary" : "default"}
                                className={
                                  isPostpaid
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]"
                                }
                              >
                                {isPostpaid ? "Postpaid (Cash)" : "Prepaid"}
                              </Badge>
                              <span
                                className={`text-[10.5px] font-medium ${
                                  settled ? "text-emerald-500" : "text-amber-400"
                                }`}
                              >
                                {payLabel}
                              </span>
                              {r.payment_received_by && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  by {r.payment_received_by}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {rupee(r.customer_rate)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {rupee(r.employee_payout)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {rupee(r.other_expense)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-bold ${
                                r.profit >= 0 ? "text-emerald-500" : "text-destructive"
                              }`}
                            >
                              {rupee(r.profit)}
                            </span>
                            <div className="text-[10px] text-muted-foreground">({r.margin_pct}%)</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                variant="outline"
                                className={
                                  r.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : r.status === "active"
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {r.status === "completed" ? "✓ Completed" : r.status}
                              </Badge>
                              {r.work_completed_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  Done: {new Date(r.work_completed_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily summary */}
        <TabsContent value="daily" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Total Staff" value={daily.data?.total_staff ?? "—"} />
            <Stat label="Available (vacancy)" value={daily.data?.available_staff ?? "—"} tone="text-success" />
            <Stat label="Assigned" value={daily.data?.assigned_staff ?? "—"} />
            <Stat label="On Leave" value={daily.data?.on_leave_staff ?? "—"} />
            <Stat label="Active Customers" value={daily.data?.active_customers ?? "—"} />
            <Stat label="Today's Shifts" value={daily.data?.todays_shifts ?? "—"} tone="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">As of {daily.data?.date ?? today}</p>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pnl" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setPeriodState("custom");
                }}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setPeriodState("custom");
                }}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPdf}
              disabled={pnl.isLoading}
              className="h-9 text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-rose-500" /> Export P&amp;L PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Revenue" value={rupee(pnl.data?.revenue)} tone="text-success" />
            <Stat label="Staff Payout" value={rupee(pnl.data?.staff_payout)} tone="text-destructive" />
            <Stat label="Other Expense" value={rupee((pnl.data?.assignment_expense ?? 0) + (pnl.data?.general_expense ?? 0))} tone="text-destructive" />
            <Stat label="Total Expense" value={rupee(pnl.data?.expense)} tone="text-destructive" />
            <Stat
              label="Profit / Loss"
              value={rupee(pnl.data?.profit)}
              tone={(pnl.data?.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
            />
            <Stat
              label="Margin"
              value={`${pnl.data?.margin_pct ?? 0}%`}
              tone={(pnl.data?.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Expenses by category</CardTitle></CardHeader>
              <CardContent>
                <BreakdownTable data={pnl.data?.expense_by_category} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Staff payslips</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Engagements</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pnl.data?.payslips ?? []).map((s) => (
                      <TableRow key={s.employee_id}>
                        <TableCell>{s.employee_name}</TableCell>
                        <TableCell>{s.engagements}</TableCell>
                        <TableCell className="text-right font-medium">{rupee(s.total_payout)}</TableCell>
                      </TableRow>
                    ))}
                    {!pnl.data?.payslips?.length && (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">No payouts.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution */}
        <TabsContent value="dist" className="space-y-4">
          {(() => {
            const total = dist.data?.total_staff ?? 0;
            const assigned = dist.data?.assigned_staff ?? 0;
            const free = dist.data?.free_staff_count ?? Math.max(0, total - assigned);
            const pct = total ? Math.round((assigned / total) * 100) : 0;
            return (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">Staff deployment</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{assigned}</span>{" "}
                      of <span className="font-semibold text-foreground">{total}</span>{" "}
                      distributed ·{" "}
                      <span className="font-semibold text-success">{free}</span> remaining
                    </p>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {pct}% deployed · {dist.data?.customers?.length ?? 0} ongoing
                    engagement{(dist.data?.customers?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total Staff" value={dist.data?.total_staff ?? "—"} />
            <Stat label="Assigned Staff" value={dist.data?.assigned_staff ?? "—"} />
            <Stat label="Free Staff" value={dist.data?.free_staff_count ?? "—"} tone="text-success" />
            <Stat label="Customers" value={dist.data?.total_customers ?? "—"} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Staff per customer</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Staff assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dist.data?.customers ?? []).map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{c.address || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.staff.map((s) => (
                            <Badge key={s.employee_id} variant="secondary">
                              {s.employee_name} · {s.shift}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!dist.data?.customers?.length && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">No active assignments.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer payments */}
        <TabsContent value="pay" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat label="Total Collected" value={rupee(pay.data?.total_paid)} tone="text-success" />
            <Stat label="Total Pending" value={rupee(pay.data?.total_pending)} tone="text-destructive" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payments by customer</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Last payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pay.data?.customers ?? []).map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="text-right">{rupee(c.total_paid)}</TableCell>
                      <TableCell className={`text-right ${c.pending > 0 ? "text-destructive font-medium" : ""}`}>
                        {rupee(c.pending)}
                      </TableCell>
                      <TableCell>{c.last_payment || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!pay.data?.customers?.length && (
                    <TableRow><TableCell colSpan={5} className="text-muted-foreground">No customers.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BreakdownTable({ data }: { data?: Record<string, number> }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return <p className="text-sm text-muted-foreground">No expenses.</p>;
  return (
    <Table>
      <TableBody>
        {entries.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell className="capitalize">{k}</TableCell>
            <TableCell className="text-right font-medium">{rupee(v)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
