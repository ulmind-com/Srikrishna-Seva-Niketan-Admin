import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Stethoscope,
  Printer,
  IndianRupee,
} from "lucide-react";
import { billingService, type MonthlyBillGroup } from "@/services/billing.service";
import { financeService, type PaymentMode } from "@/services/finance.service";
import { downloadClientReceiptPdf } from "@/lib/receipt-export";
import { todayIST } from "@/lib/ist-datetime";
import { resourceServices } from "@/services/resources";
import { settingsService } from "@/services/settings.service";
import { formatBillNo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { downloadMonthlyBillsXlsx } from "@/lib/monthly-bill-export";
import { GeneralBillViewDialog } from "@/components/documents/GeneralBillViewDialog";
import { formatDateWithTime } from "@/components/documents/document-utils";
import type { Customer } from "@/types/models";

const rupee = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

function toISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(first), end: toISODate(last) };
}

/**
 * General Bill (সাধারণ বিল ও ডিউটি স্টেটমেন্ট) — consolidated customer bills & duty
 * statements for any selected date range, branch, or customer.
 * Itemizes all assigned care attendants, shift timings, replacement handovers,
 * and accurate duty days.
 */
export function MonthlyBillsPage() {
  const qc = useQueryClient();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [startDate, setStartDate] = useState<string>(defaultRange.start);
  const [endDate, setEndDate] = useState<string>(defaultRange.end);
  const [branch, setBranch] = useState<string>("all");
  const [customerId, setCustomerId] = useState<string>("all");
  const [customerSearch] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<MonthlyBillGroup | null>(null);
  const [collectBill, setCollectBill] = useState<MonthlyBillGroup | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState<PaymentMode>("upi");
  const [collectDate, setCollectDate] = useState(todayIST());
  const [collectTxnId, setCollectTxnId] = useState("");
  const [collectNote, setCollectNote] = useState("");

  const collectMut = useMutation({
    mutationFn: financeService.recordClientPayment,
    onSuccess: (created) => {
      toast.success(`Collected ${rupee(created.amount)} (${created.receipt_no || "Receipt"})`);
      if (collectBill) {
        downloadClientReceiptPdf({
          receipt_no: created.receipt_no,
          customer_name: collectBill.customer_name,
          phone: collectBill.customer_phone,
          location_name: collectBill.location_name,
          bill_no: created.bill_no ?? collectBill.bill_no,
          bill_no_formatted: created.bill_no_formatted,
          amount: created.amount,
          date: created.date,
          mode: created.mode,
          transaction_id: created.transaction_id,
          received_by: created.received_by,
          note: created.note,
          invoiced_amount: collectBill.total_amount,
          total_received: (collectBill.paid_amount ?? 0) + created.amount,
          outstanding_amount: Math.max(
            0,
            collectBill.total_amount - ((collectBill.paid_amount ?? 0) + created.amount)
          ),
        });
      }
      setCollectBill(null);
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["client-ledger"] });
      qc.invalidateQueries({ queryKey: ["payment-history"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => toast.error(err.message || "Payment collection failed"),
  });

  // Locations / Branches
  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  // Customers list for customer dropdown / search
  const { data: customersData } = useQuery({
    queryKey: ["customers", "all-list"],
    queryFn: () => resourceServices.customers.list({ page_size: 150 }),
    staleTime: 60_000,
  });

  // Website settings (authorized signature for bill)
  const { data: settings } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
    staleTime: 300_000,
  });
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;

  // Filter customers based on branch and search
  const allCustomers = customersData?.items ?? [];
  const filteredCustomerOptions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return allCustomers
      .filter((c) => (branch === "all" ? true : c.location_id === branch))
      .filter((c) =>
        q
          ? [c.name, c.code, c.phone, c.address]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allCustomers, branch, customerSearch]);

  // Derived month string for legacy compatibility
  const derivedMonth = startDate.slice(0, 7);

  // Fetch statement bills for selected range, branch, and customer
  const { data, isLoading } = useQuery({
    queryKey: ["general-bills", startDate, endDate, branch, customerId],
    queryFn: () =>
      billingService.monthly(
        derivedMonth,
        branch === "all" ? undefined : branch,
        startDate,
        endDate,
        customerId === "all" ? undefined : customerId
      ),
    enabled: Boolean(startDate && endDate),
  });

  const bills = data?.bills ?? [];
  const totals = data?.totals;

  // Quick Presets
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

  /** Ensure a bill has a number allocated (idempotent), returning the numbered copy. */
  async function ensureIssued(b: MonthlyBillGroup): Promise<MonthlyBillGroup> {
    if (b.bill_no != null) return b;
    const res = await billingService.issueMonthly(
      derivedMonth,
      b.customer_id,
      b.employee_id,
      startDate,
      endDate
    );
    return { ...b, bill_no: res.bill_no };
  }

  /** View & Print single customer bill in the official printed bill pad format. */
  async function handleViewBill(b: MonthlyBillGroup) {
    setBusy(true);
    try {
      const numbered = await ensureIssued(b);
      setSelectedBill(numbered);
      qc.invalidateQueries({ queryKey: ["general-bills"] });
    } catch {
      toast.error("Could not allocate bill number. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadExcel() {
    if (!bills.length) {
      toast.error("No bill records to export for this period");
      return;
    }
    try {
      downloadMonthlyBillsXlsx(derivedMonth, bills);
      toast.success("General bills exported to Excel (.xlsx)");
    } catch {
      toast.error("Failed to export Excel file");
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>General Bill — Srikrishna Seva Niketan</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Bill (সাধারণ বিল)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer billing &amp; duty statement for any custom date range — includes all attendants, replacements, and shift timings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={busy || !bills.length}
            className="border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-9 text-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter Controls (Bank Statement style) */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Branch filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Branch Office
            </label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {locations?.items.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Client / Customer
            </label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {filteredCustomerOptions.map((c: Customer) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <div className="relative">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To Date
            </label>
            <div className="relative">
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Quick Range Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
          <span className="text-muted-foreground text-[11px] font-medium mr-1">Quick Range:</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => applyPreset("this_month")}
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => applyPreset("last_15")}
          >
            Last 15 Days
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => applyPreset("last_30")}
          >
            Last 30 Days
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => applyPreset("last_month")}
          >
            Previous Month
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients / Invoices" value={String(totals?.bills ?? 0)} />
        <Stat label="Total Billed Amount" value={rupee(totals?.total_amount)} tone="text-sky-500" />
        <Stat label="Actual Cash Received" value={rupee(totals?.total_paid ?? 0)} tone="text-emerald-500" />
        <Stat label="Outstanding Balance" value={rupee(totals?.total_outstanding ?? 0)} tone="text-rose-500" />
      </div>

      {/* Bills Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <div className="grid h-40 place-items-center text-sm text-muted-foreground">
            No billable duty found for the selected period.
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
                  <React.Fragment key={b.key}>
                    <TableRow
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
                        <div>{rupee(b.total_amount)}</div>
                        {(b.paid_amount ?? 0) > 0 && (
                          <div className="text-[11px] font-medium text-emerald-500">
                            Paid: {rupee(b.paid_amount)}
                          </div>
                        )}
                        {(b.outstanding_amount ?? b.total_amount) > 0 && (
                          <div className="text-[11px] font-medium text-rose-500">
                            Due: {rupee(b.outstanding_amount ?? b.total_amount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {b.bill_no != null ? (
                            <Badge variant="outline" className="font-mono">
                              #{formatBillNo(b.bill_no)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {b.payment_status === "paid" ? (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                              Paid
                            </Badge>
                          ) : b.payment_status === "partial" ? (
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-500 border-amber-500/30">
                              Partial
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-rose-500/15 text-rose-500 border-rose-500/30">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {(b.outstanding_amount ?? b.total_amount) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCollectBill(b);
                                setCollectAmount(String(b.outstanding_amount ?? b.total_amount));
                                setCollectDate(todayIST());
                                setCollectMode("upi");
                                setCollectTxnId("");
                                setCollectNote("");
                              }}
                              className="h-8 gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                            >
                              <IndianRupee className="h-3.5 w-3.5" />
                              <span>Collect</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleViewBill(b)}
                            className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Bill PDF</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Staff Breakdown Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={9} className="p-4 pt-1 pb-4">
                          <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                              <div className="flex items-center gap-1.5 uppercase tracking-wide">
                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                Itemized Duty &amp; Staff Breakdown ({b.customer_name})
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] gap-1 text-primary hover:underline p-0"
                                onClick={() => handleViewBill(b)}
                              >
                                <Printer className="h-3 w-3" /> Print Pad Format
                              </Button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/70 text-muted-foreground">
                                    <th className="text-left py-1.5 font-semibold">Staff / Attendant</th>
                                    <th className="text-left py-1.5 font-semibold">Shift</th>
                                    <th className="text-left py-1.5 font-semibold">Duty Span</th>
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
                                        {formatDateWithTime(li.from, li.from_time ?? li.start_time)}{" "}
                                        →{" "}
                                        {formatDateWithTime(
                                          li.to,
                                          li.to_time ?? (li.is_ongoing ? null : li.end_time)
                                        )}
                                        {li.is_ongoing ? " (Till Date)" : ""}
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
                                      Total for selected period:
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
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dedicated Bill Modal in the Official Printed Pad Format */}
      <GeneralBillViewDialog
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        authorizedSignatureUrl={authorizedSignatureUrl}
      />

      {/* Quick Receive Payment Modal */}
      <Dialog open={!!collectBill} onOpenChange={(o) => !o && setCollectBill(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Client Payment</DialogTitle>
            <DialogDescription>
              {collectBill?.customer_name} · Total Billed {rupee(collectBill?.total_amount)} · Due{" "}
              <span className="font-semibold text-rose-500">
                {rupee(collectBill?.outstanding_amount ?? collectBill?.total_amount)}
              </span>
            </DialogDescription>
          </DialogHeader>
          {collectBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={collectMode} onValueChange={(v) => setCollectMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI / QR</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Txn / UPI Ref</Label>
                  <Input
                    value={collectTxnId}
                    onChange={(e) => setCollectTxnId(e.target.value)}
                    placeholder="Optional ref"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  placeholder="Optional payment note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectBill(null)}>
              Cancel
            </Button>
            <Button
              disabled={collectMut.isPending || !collectAmount || Number(collectAmount) <= 0}
              onClick={() => {
                if (!collectBill) return;
                const amt = Number(collectAmount);
                const due = collectBill.outstanding_amount ?? collectBill.total_amount;
                collectMut.mutate({
                  customer_id: collectBill.customer_id,
                  assignment_id: collectBill.line_items?.[0]?.assignment_id,
                  bill_no: collectBill.bill_no ?? undefined,
                  amount: amt,
                  date: collectDate || undefined,
                  mode: collectMode,
                  status: amt < due ? "partial" : "paid",
                  transaction_id: collectTxnId || undefined,
                  note: collectNote || undefined,
                });
              }}
            >
              {collectMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record &amp; Download Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
