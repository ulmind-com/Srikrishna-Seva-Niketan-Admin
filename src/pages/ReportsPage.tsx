import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Receipt, CalendarDays, Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { downloadReportPdf } from "@/lib/report-pdf";
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

  const anyFetching =
    pnl.isFetching || dist.isFetching || pay.isFetching || daily.isFetching;

  const branchName =
    branch === "all"
      ? "All branches"
      : locations?.items.find((b) => b.id === branch)?.name ?? "Branch";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Profit & loss, staff distribution, customer payments and the daily summary."
        icon={<BarChart3 />}
        actions={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={pnl.isLoading}>
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <div className="w-56">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger>
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
          </div>
        }
      />

      {/* Period presets — drive the Profit & Loss date range. */}
      <div className="flex flex-wrap items-center gap-2">
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
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              period === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          {start} → {end}
        </span>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily"><CalendarDays className="mr-1.5 h-4 w-4" /> Daily</TabsTrigger>
          <TabsTrigger value="pnl"><TrendingUp className="mr-1.5 h-4 w-4" /> Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="dist"><Users className="mr-1.5 h-4 w-4" /> Distribution</TabsTrigger>
          <TabsTrigger value="pay"><Receipt className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

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
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Income" value={rupee(pnl.data?.income)} tone="text-success" />
            <Stat label="Expense" value={rupee(pnl.data?.expense)} tone="text-destructive" />
            <Stat
              label="Profit / Loss"
              value={rupee(pnl.data?.profit)}
              tone={(pnl.data?.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
            />
            <Stat
              label="Margin"
              value={`${
                (pnl.data?.income ?? 0) > 0
                  ? Math.round(((pnl.data?.profit ?? 0) / (pnl.data!.income)) * 100)
                  : 0
              }%`}
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
