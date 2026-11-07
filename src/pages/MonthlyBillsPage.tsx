import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { CalendarDays, FileDown, Loader2, Receipt } from "lucide-react";
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
import { downloadMonthlyBillsPdf } from "@/lib/monthly-bill-export";

const rupee = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monthly billing — one bill per (nurse + customer) for a calendar month.
 * The admin picks a month, sees every billable nurse→customer pairing with its
 * days and amount, and generates a premium PDF (one invoice, or all at once).
 */
export function MonthlyBillsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [branch, setBranch] = useState("all");
  const [busy, setBusy] = useState(false);

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
    const res = await billingService.issueMonthly(month, b.employee_id, b.customer_id);
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

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Monthly Bills</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Bills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One bill per nurse &amp; customer for a calendar month — pick a month and generate.
          </p>
        </div>
        <Button onClick={handleAll} disabled={busy || !bills.length}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
          Download All (PDF)
        </Button>
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
        <Stat label="Bills" value={String(totals?.bills ?? 0)} />
        <Stat label="Total Days" value={String(totals?.total_days ?? 0)} />
        <Stat label="Total Amount" value={rupee(totals?.total_amount)} tone="text-emerald-500" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
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
                <TableHead>Nurse</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Bill No</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.key}>
                  <TableCell>
                    <div className="font-medium">{b.employee_name}</div>
                    {b.employee_code && (
                      <div className="text-xs text-muted-foreground">{b.employee_code}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.customer_name}</div>
                    {b.location_name && (
                      <div className="text-xs text-muted-foreground">{b.location_name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[b.customer_phone, b.customer_alt_phone].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-center">{b.total_days}</TableCell>
                  <TableCell className="text-right font-semibold">{rupee(b.total_amount)}</TableCell>
                  <TableCell className="text-center">
                    {b.bill_no != null ? (
                      <Badge variant="outline">{b.bill_no}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleOne(b)}
                    >
                      <Receipt className="mr-1.5 h-3.5 w-3.5" /> Bill PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
