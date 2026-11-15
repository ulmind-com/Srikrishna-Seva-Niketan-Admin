import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  CalendarDays,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Stethoscope,
} from "lucide-react";
import { billingService, type MonthlyBillGroup } from "@/services/billing.service";
import { resourceServices } from "@/services/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadMonthlyBillsPdf,
  downloadMonthlyBillsXlsx,
} from "@/lib/monthly-bill-export";

const rupee = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monthly billing — one consolidated bill per customer for a calendar month.
 * If multiple attendants served the client (e.g. staff replacement or shifts),
 * both attendants are itemized under the single client invoice.
 */
export function MonthlyBillsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [branch, setBranch] = useState("all");
  const [busy, setBusy] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-bills", month, branch],
    queryFn: () => billingService.monthly(month, branch === "all" ? undefined : branch),
    enabled: Boolean(month),
  });

  const bills = data?.bills ?? [];
  const totals = data?.totals;

  /** Make sure a bill has a number (idempotent), returning the numbered copy. */
  async function ensureIssued(b: MonthlyBillGroup): Promise<MonthlyBillGroup> {
    if (b.bill_no != null) return b;
    const res = await billingService.issueMonthly(month, b.customer_id, b.employee_id);
    return { ...b, bill_no: res.bill_no };
  }

  async function handleOne(b: MonthlyBillGroup) {
    setBusy(true);
    try {
      const numbered = await ensureIssued(b);
      downloadMonthlyBillsPdf(month, [numbered]);
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
    } catch {
      toast.error("Could not generate the bill. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAll() {
    if (!bills.length) return;
    setBusy(true);
    try {
      const numbered = await Promise.all(bills.map(ensureIssued));
      downloadMonthlyBillsPdf(month, numbered);
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
    } catch {
      toast.error("Could not generate the bills. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadExcel() {
    if (!bills.length) {
      toast.error("No bill records to export for this month");
      return;
    }
    try {
      downloadMonthlyBillsXlsx(month, bills);
      toast.success("Monthly bills exported to Excel (.xlsx)");
    } catch (err) {
      toast.error("Failed to export Excel file");
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Monthly Bills</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Bills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One consolidated bill per customer for a calendar month — includes all assigned attendants &amp; replacements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={busy || !bills.length}
            className="border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel (.xlsx)
          </Button>
          <Button onClick={handleAll} disabled={busy || !bills.length}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Download All (PDF)
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {locations?.items.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Customers Billed" value={String(totals?.bills ?? 0)} />
        <Stat label="Total Duty Days" value={String(totals?.total_days ?? 0)} />
        <Stat label="Total Revenue Amount" value={rupee(totals?.total_amount)} tone="text-emerald-500" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <div className="grid h-40 place-items-center text-sm text-muted-foreground">
            No billable duty for this month.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Customer (Patient)</TableHead>
                <TableHead>Assigned Attendant(s)</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Bill No</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => {
                const isExpanded = expandedKey === b.key;
                const hasMultipleStaff = (b.line_items?.length ?? 0) > 1;

                return (
                  <>
                    <TableRow
                      key={b.key}
                      className="cursor-pointer hover:bg-muted/40 transition"
                      onClick={() => setExpandedKey(isExpanded ? null : b.key)}
                    >
                      <TableCell className="w-10 pr-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {b.customer_name}
                        </div>
                        {b.customer_address && (
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {b.customer_address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium text-xs">
                              {b.employee_name}
                            </span>
                            {hasMultipleStaff && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              >
                                Multiple Staff
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.location_name || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[b.customer_phone, b.customer_alt_phone].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {b.total_days}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {rupee(b.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {b.bill_no != null ? (
                          <Badge variant="outline" className="font-mono">
                            #{b.bill_no}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleOne(b)}
                          className="h-8 gap-1.5"
                        >
                          <Receipt className="h-3.5 w-3.5 text-primary" />
                          <span>Bill PDF</span>
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Staff Breakdown Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={9} className="p-4 pt-1 pb-4">
                          <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                              <UserCheck className="h-3.5 w-3.5 text-primary" />
                              Itemized Duty &amp; Staff Breakdown ({b.customer_name})
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/70 text-muted-foreground">
                                    <th className="text-left py-1.5 font-semibold">Staff / Attendant</th>
                                    <th className="text-left py-1.5 font-semibold">Shift</th>
                                    <th className="text-left py-1.5 font-semibold">Duty Span (From → To)</th>
                                    <th className="text-center py-1.5 font-semibold">Days</th>
                                    <th className="text-right py-1.5 font-semibold">Daily Rate</th>
                                    <th className="text-right py-1.5 font-semibold">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.line_items.map((li, idx) => (
                                    <tr
                                      key={li.assignment_id || idx}
                                      className="border-b border-border/40 last:border-none"
                                    >
                                      <td className="py-2 font-medium">
                                        <div className="flex items-center gap-1.5">
                                          <span>{li.employee_name || b.employee_name}</span>
                                          {li.employee_code && (
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                              ({li.employee_code})
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2 text-muted-foreground">
                                        {li.shift_label}
                                      </td>
                                      <td className="py-2 font-mono text-[11px]">
                                        {li.from} → {li.to}
                                      </td>
                                      <td className="py-2 text-center font-semibold">
                                        {li.days}
                                      </td>
                                      <td className="py-2 text-right text-muted-foreground">
                                        {rupee(li.daily_rate)}
                                      </td>
                                      <td className="py-2 text-right font-bold text-foreground">
                                        {rupee(li.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-muted/40 font-bold border-t border-border">
                                    <td colSpan={3} className="py-2 text-right">
                                      Total for this month:
                                    </td>
                                    <td className="py-2 text-center">
                                      {b.total_days} days
                                    </td>
                                    <td></td>
                                    <td className="py-2 text-right text-emerald-500">
                                      {rupee(b.total_amount)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
