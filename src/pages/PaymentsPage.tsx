import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { resourceServices } from "@/services/resources";
import { paymentsConfig } from "@/config/resources/payments.config";
import type { Payment } from "@/types/models";
import { describeError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { ResourceForm } from "@/components/resource/ResourceForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

type PeriodKey = "today" | "week" | "month" | "all";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "all", label: "All" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "outline"> = {
  paid: "success",
  partial: "warning",
  pending: "danger",
};

/** First day (inclusive) of the selected period, as "YYYY-MM-DD". Null = all. */
function periodStart(key: PeriodKey): string | null {
  const d = new Date();
  if (key === "all") return null;
  if (key === "today") return d.toISOString().slice(0, 10);
  if (key === "week") {
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Customer payments shown date-wise: a period filter, each date grouped with its
 * daily collection total, and every payment's full details (customer, amount,
 * mode, status, branch, note). Record a new payment inline.
 */
export function PaymentsPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payments", "all"],
    queryFn: () => resourceServices.payments.list({ page_size: 100, sort_by: "date", sort_order: "desc" }),
    staleTime: 15_000,
  });

  const createMut = useMutation({
    mutationFn: (values: Record<string, unknown>) => resourceServices.payments.create(values),
    onSuccess: () => {
      toast.success("Payment recorded");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  // Filter by period, then group by date (descending).
  const { groups, totals } = useMemo(() => {
    const start = periodStart(period);
    const items = (data?.items ?? []).filter((p) => {
      const d = String(p.date).slice(0, 10);
      return !start || d >= start;
    });
    const map = new Map<string, Payment[]>();
    for (const p of items) {
      const d = String(p.date).slice(0, 10);
      const arr = map.get(d) ?? [];
      arr.push(p);
      map.set(d, arr);
    }
    const groups = [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const collected = items
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((n, p) => n + (p.amount ?? 0), 0);
    const pending = items
      .filter((p) => p.status === "pending")
      .reduce((n, p) => n + (p.amount ?? 0), 0);
    return { groups, totals: { count: items.length, collected, pending } };
  }, [data, period]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Payments</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer payments, date-wise — with the day's total and full details.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Payment
        </Button>
      </div>

      {/* Period filter + summary */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                period === p.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Collected: </span>
            <span className="font-semibold text-emerald-500">{inr(totals.collected)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Pending: </span>
            <span className="font-semibold text-amber-500">{inr(totals.pending)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Payments: </span>
            <span className="font-semibold">{totals.count}</span>
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
          No payments in this period.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, rows]) => {
            const dayTotal = rows
              .filter((p) => p.status === "paid" || p.status === "partial")
              .reduce((n, p) => n + (p.amount ?? 0), 0);
            return (
              <div key={date} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {prettyDate(date)}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{rows.length} payment(s) · </span>
                    <span className="font-semibold text-emerald-500">{inr(dayTotal)}</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {rows.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                      <div className="min-w-[160px] flex-1">
                        <div className="font-medium">{p.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          <BranchName id={p.location_id} className="text-xs" />
                        </div>
                      </div>
                      <div className="text-lg font-bold tabular-nums">{inr(p.amount)}</div>
                      <Badge variant="outline" className="uppercase">
                        {p.mode.replace("_", " ")}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                        {p.status}
                      </Badge>
                      {p.note && (
                        <div className="w-full text-xs text-muted-foreground">Note: {p.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New payment */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle>New Payment</DialogTitle>
          </DialogHeader>
          <ResourceForm
            fields={paymentsConfig.fields}
            submitting={createMut.isPending}
            onSubmit={(values) => createMut.mutate(values)}
            onCancel={() => setCreating(false)}
            submitLabel="Record Payment"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
