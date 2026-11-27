import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  History,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import type { Customer, Employee, Location } from "@/types/models";
import {
  financeService,
  type ClientLedgerRow,
  type ClientInvoiceEntry,
  type PaymentMode,
  type StaffLedgerRow,
} from "@/services/finance.service";
import {
  downloadClientReceiptPdf,
  downloadStaffVoucherPdf,
} from "@/lib/receipt-export";
import {
  currentMonthIST,
  currentMonthRangeIST,
  formatSlashDateIST,
  monthLabelIST,
  nowIST,
  todayIST,
} from "@/lib/ist-datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

const MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / QR" },
  { value: "bank_transfer", label: "Bank Transfer / NEFT" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/20">
        <Clock className="mr-1 h-3 w-3" /> Partial
      </Badge>
    );
  }
  if (status === "advance") {
    return (
      <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30">
        Advance
      </Badge>
    );
  }
  if (status === "no_due" || status === "no_bill") {
    return <Badge variant="secondary">—</Badge>;
  }
  return (
    <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/20">
      Pending
    </Badge>
  );
}

export function PaymentsReceiptsPage() {
  const { user, hasPermission } = useAuth();
  const can = hasPermission;
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthRange = useMemo(() => currentMonthRangeIST(), []);

  const urlTab = searchParams.get("tab");
  const initialTab: "client" | "staff" | "history" =
    urlTab === "staff" || urlTab === "history" ? urlTab : "client";

  const [activeTab, setActiveTabState] = useState<"client" | "staff" | "history">(initialTab);
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "client" || t === "staff" || t === "history") {
      setActiveTabState(t);
    }
  }, [searchParams]);

  const setActiveTab = (t: "client" | "staff" | "history") => {
    setActiveTabState(t);
    setSearchParams({ tab: t }, { replace: true });
  };
  const [branch, setBranch] = useState("all");
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [quickMonth, setQuickMonth] = useState(currentMonthIST());
  const [staffFilterId, setStaffFilterId] = useState("all");
  const [search, setSearch] = useState("");
  const [historyDirection, setHistoryDirection] = useState("all");
  const [historyMode, setHistoryMode] = useState("all");

  const validRange = !!startDate && !!endDate && endDate >= startDate;
  const derivedMonth = startDate ? startDate.slice(0, 7) : currentMonthIST();

  const applyMonthPreset = (ym: string) => {
    if (!ym) return;
    setQuickMonth(ym);
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setStartDate(`${ym}-01`);
    setEndDate(`${ym}-${String(lastDay).padStart(2, "0")}`);
  };

  const applyRangePreset = (preset: "this_month" | "last_month" | "last_15" | "last_30") => {
    const today = nowIST();
    if (preset === "this_month") {
      const r = currentMonthRangeIST();
      setStartDate(r.start);
      setEndDate(r.end);
      setQuickMonth(r.start.slice(0, 7));
    } else if (preset === "last_month") {
      const prev = today.minus({ months: 1 });
      setStartDate(prev.startOf("month").toISODate() || "");
      setEndDate(prev.endOf("month").toISODate() || "");
      setQuickMonth(prev.toFormat("yyyy-MM"));
    } else if (preset === "last_15") {
      setStartDate(today.minus({ days: 14 }).toISODate() || "");
      setEndDate(today.toISODate() || "");
      setQuickMonth("");
    } else if (preset === "last_30") {
      setStartDate(today.minus({ days: 29 }).toISODate() || "");
      setEndDate(today.toISODate() || "");
      setQuickMonth("");
    }
  };

  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  // Receive Payment Dialog state
  const [receiveTarget, setReceiveTarget] = useState<{
    client: ClientLedgerRow;
    invoice?: ClientInvoiceEntry | null;
  } | null>(null);
  const [rxAssignmentId, setRxAssignmentId] = useState<string>("__none__");
  const [rxAmount, setRxAmount] = useState("");
  const [rxDate, setRxDate] = useState(todayIST());
  const [rxMode, setRxMode] = useState<PaymentMode>("upi");
  const [rxTxnId, setRxTxnId] = useState("");
  const [rxNote, setRxNote] = useState("");

  // Pay Staff Dialog state
  const [payStaffTarget, setPayStaffTarget] = useState<StaffLedgerRow | null>(null);
  const [stAmount, setStAmount] = useState("");
  const [stDate, setStDate] = useState(todayIST());
  const [stMode, setStMode] = useState<PaymentMode>("upi");
  const [stTxnId, setStTxnId] = useState("");
  const [stNote, setStNote] = useState("");

  const { data: locData } = useQuery({
    queryKey: ["locations-all"],
    queryFn: () => http.list<Location>(endpoints.locations.root, { page_size: 100 }),
    enabled: !!user?.is_superuser,
    staleTime: 300_000,
  });
  const locations = locData?.items ?? [];
  const locParam = branch !== "all" ? branch : undefined;

  const { data: customersListData } = useQuery({
    queryKey: ["payments-customers-all"],
    queryFn: () => http.list<Customer>(endpoints.customers.root, { page_size: 200 }),
    staleTime: 60_000,
  });
  const allCustomers = customersListData?.items ?? [];

  const { data: employeesListData } = useQuery({
    queryKey: ["payments-employees-all"],
    queryFn: () => http.list<Employee>(endpoints.employees.root, { page_size: 200 }),
    staleTime: 60_000,
  });
  const allVerifiedStaff = useMemo(
    () =>
      (employeesListData?.items ?? []).filter(
        (e) => (e.verification_status ?? "verified") === "verified"
      ),
    [employeesListData]
  );

  // Quick Client / Staff picker modal state
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickCustId, setQuickCustId] = useState("");
  const [quickStaffOpen, setQuickStaffOpen] = useState(false);
  const [quickEmpId, setQuickEmpId] = useState("");

  const clientLedgerQ = useQuery({
    queryKey: ["client-ledger", startDate, endDate, branch],
    queryFn: () =>
      financeService.clientLedger({
        start: startDate || undefined,
        end: endDate || undefined,
        location_id: locParam,
      }),
    enabled: validRange,
    staleTime: 5_000,
  });

  const staffLedgerQ = useQuery({
    queryKey: ["staff-ledger", startDate, endDate, branch, staffFilterId],
    queryFn: () =>
      financeService.staffLedger({
        start: startDate || undefined,
        end: endDate || undefined,
        location_id: locParam,
        employee_id: staffFilterId !== "all" ? staffFilterId : undefined,
      }),
    enabled: validRange,
    staleTime: 5_000,
  });

  const historyQ = useQuery({
    queryKey: ["payment-history", startDate, endDate, branch, historyDirection, historyMode, search],
    queryFn: () =>
      financeService.history({
        start: startDate || undefined,
        end: endDate || undefined,
        location_id: locParam,
        direction: historyDirection,
        mode: historyMode !== "all" ? historyMode : undefined,
        search: search || undefined,
      }),
    enabled: validRange,
    staleTime: 5_000,
  });

  const invalidateAllFinance = () => {
    qc.invalidateQueries({ queryKey: ["client-ledger"] });
    qc.invalidateQueries({ queryKey: ["staff-ledger"] });
    qc.invalidateQueries({ queryKey: ["payment-history"] });
    qc.invalidateQueries({ queryKey: ["monthly-bills"] });
    qc.invalidateQueries({ queryKey: ["payroll-run"] });
    qc.invalidateQueries({ queryKey: ["payslip"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  const recordClientMut = useMutation({
    mutationFn: financeService.recordClientPayment,
    onSuccess: (created) => {
      toast.success(
        `Payment recorded (${created.receipt_no || "Receipt"}) · ${inr(created.amount)}`
      );
      if (receiveTarget) {
        const c = receiveTarget.client;
        downloadClientReceiptPdf({
          receipt_no: created.receipt_no,
          customer_name: c.customer_name,
          phone: c.phone,
          location_name: c.location_name,
          bill_no: created.bill_no ?? c.bill_no,
          bill_no_formatted: created.bill_no_formatted ?? c.bill_no_formatted,
          amount: created.amount,
          date: created.date,
          mode: created.mode,
          transaction_id: created.transaction_id,
          received_by: created.received_by,
          note: created.note,
          invoiced_amount: c.invoiced_amount,
          total_received: c.received_amount + created.amount,
          outstanding_amount: Math.max(0, c.invoiced_amount - (c.received_amount + created.amount)),
        });
      }
      setReceiveTarget(null);
      invalidateAllFinance();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to record payment"),
  });

  const deleteClientPayMut = useMutation({
    mutationFn: financeService.deleteClientPayment,
    onSuccess: () => {
      toast.success("Receipt entry deleted");
      invalidateAllFinance();
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const recordStaffMut = useMutation({
    mutationFn: financeService.recordStaffPayment,
    onSuccess: (created) => {
      toast.success(
        `Staff salary paid (${created.voucher_no || "Voucher"}) · ${inr(created.amount)}`
      );
      if (payStaffTarget) {
        const s = payStaffTarget;
        downloadStaffVoucherPdf({
          voucher_no: created.voucher_no,
          employee_name: s.employee_name,
          code: s.code,
          category: s.category,
          month: created.month || derivedMonth,
          amount: created.amount,
          date: created.date,
          mode: created.mode,
          transaction_id: created.transaction_id,
          paid_by: created.paid_by,
          note: created.note,
          salary_due: s.salary_due,
          total_paid: s.paid_amount + created.amount,
          remaining_amount: Math.max(0, s.salary_due - (s.paid_amount + created.amount)),
        });
      }
      setPayStaffTarget(null);
      invalidateAllFinance();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to record salary payment"),
  });

  const deleteStaffPayMut = useMutation({
    mutationFn: financeService.deleteStaffPayment,
    onSuccess: () => {
      toast.success("Staff payout entry deleted");
      invalidateAllFinance();
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const openReceiveModal = (client: ClientLedgerRow, invoice?: ClientInvoiceEntry | null) => {
    setReceiveTarget({ client, invoice });
    const defaultAsg =
      invoice?.assignment_id ||
      client.invoices.find((i) => i.outstanding_amount > 0)?.assignment_id ||
      client.invoices[0]?.assignment_id ||
      "__none__";
    setRxAssignmentId(defaultAsg);
    const bal = invoice
      ? invoice.outstanding_amount
      : defaultAsg !== "__none__"
      ? client.invoices.find((i) => i.assignment_id === defaultAsg)?.outstanding_amount ?? client.outstanding_amount
      : client.outstanding_amount;
    setRxAmount(bal > 0 ? String(bal) : "");
    setRxDate(todayIST());
    setRxMode("upi");
    setRxTxnId("");
    setRxNote("");
  };

  const openPayStaffModal = (row: StaffLedgerRow) => {
    setPayStaffTarget(row);
    setStAmount(row.remaining_amount > 0 ? String(row.remaining_amount) : "");
    setStDate(todayIST());
    setStMode("upi");
    setStTxnId("");
    setStNote("");
  };

  const filteredClients = useMemo(() => {
    const list = clientLedgerQ.data?.clients ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.bill_no_formatted || "").toLowerCase().includes(q)
    );
  }, [clientLedgerQ.data, search]);

  const filteredStaff = useMemo(() => {
    const list = staffLedgerQ.data?.staff ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.employee_name.toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)
    );
  }, [staffLedgerQ.data, search]);

  const cSum = clientLedgerQ.data?.summary;
  const sSum = staffLedgerQ.data?.summary;
  const hSum = historyQ.data?.summary;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Payments &amp; Receipts</title>
      </Helmet>

      {/* Header & Global Bank-Statement Date Range Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments &amp; Receipts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track real-time client collections, partial payments, PDF receipts, date-range staff salary payouts &amp; slips, and full cash flow.
            </p>
          </div>

          {can("payments:create") && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setQuickCustId(
                    filteredClients[0]?.customer_id || allCustomers[0]?.id || ""
                  );
                  setQuickClientOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Receive Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuickEmpId(
                    (staffFilterId !== "all" ? staffFilterId : "") ||
                      filteredStaff[0]?.employee_id ||
                      allVerifiedStaff[0]?.id ||
                      ""
                  );
                  setQuickStaffOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Pay Staff
              </Button>
            </div>
          )}
        </div>

        {/* Unified Statement Date Range & Search Bar */}
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client, staff, receipt, voucher..."
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickMonth("");
                }}
                className="w-[158px] shrink-0"
              />
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <Input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickMonth("");
                }}
                className="w-[158px] shrink-0"
              />
            </div>

            <Input
              type="month"
              title="Quick select whole month"
              value={quickMonth}
              onChange={(e) => applyMonthPreset(e.target.value)}
              className="w-[196px] shrink-0"
            />

            {user?.is_superuser && locations.length > 0 && (
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-[170px] shrink-0">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Quick Range:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => applyRangePreset("this_month")}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => applyRangePreset("last_15")}
              >
                Last 15 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => applyRangePreset("last_30")}
              >
                Last 30 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => applyRangePreset("last_month")}
              >
                Previous Month
              </Button>
            </div>
            {validRange ? (
              <span>
                Showing period:{" "}
                <strong className="text-foreground">
                  {formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)}
                </strong>
              </span>
            ) : (
              <span className="text-rose-500 font-medium">
                To Date must be on or after From Date
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unified Client Collection + Staff Payout Control Dashboard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Client Received (আদায় হয়েছে)"
          value={inr(cSum?.total_received)}
          subtitle={`Billed ${inr(cSum?.total_billed)} · ${(cSum?.collection_rate_pct ?? 0).toFixed(1)}% collected`}
          tone="text-emerald-500"
          icon={<Banknote className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          title="Client Remaining (কাস্টমার বাকি)"
          value={inr(cSum?.total_outstanding)}
          subtitle={`${cSum?.paid_clients ?? 0} paid · ${cSum?.partial_clients ?? 0} partial · ${cSum?.unpaid_clients ?? 0} unpaid`}
          tone="text-rose-500"
          icon={<Clock className="h-5 w-5 text-rose-500" />}
        />
        <KpiCard
          title={`Staff Paid (${quickMonth ? monthLabelIST(quickMonth) : `${formatSlashDateIST(startDate)} – ${formatSlashDateIST(endDate)}`})`}
          value={inr(sSum?.total_paid)}
          subtitle={`Total Salary Due: ${inr(sSum?.total_salary_due)}`}
          tone="text-indigo-400"
          icon={<CreditCard className="h-5 w-5 text-indigo-400" />}
        />
        <KpiCard
          title="Staff Remaining (স্টাফ বাকি)"
          value={inr(sSum?.total_remaining)}
          subtitle={`${sSum?.paid_staff ?? 0} paid · ${sSum?.partial_staff ?? 0} partial · ${sSum?.unpaid_staff ?? 0} unpaid`}
          tone="text-amber-500"
          icon={<Wallet className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "client" | "staff" | "history")}>
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="client" className="gap-1.5">
            <Receipt className="h-4 w-4" /> Client Receipts
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="h-4 w-4" /> Staff Payments
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> Payment History
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: CLIENT RECEIPTS ================= */}
        <TabsContent value="client" className="mt-5 space-y-5">

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="px-4 py-3 font-medium">Client / Patient</th>
                    <th className="px-3 py-3 font-medium">Bill No</th>
                    <th className="px-3 py-3 text-right font-medium">Invoiced</th>
                    <th className="px-3 py-3 text-right font-medium">Received</th>
                    <th className="px-3 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-3 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientLedgerQ.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No billed invoices or client receipts found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((row) => {
                      const isOpen = !!expandedClients[row.customer_id];
                      return (
                        <>
                          <tr
                            key={row.customer_id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() =>
                              setExpandedClients((prev) => ({
                                ...prev,
                                [row.customer_id]: !prev[row.customer_id],
                              }))
                            }
                          >
                            <td className="px-3 py-3 text-muted-foreground">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{row.customer_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.phone || "—"} · {row.location_name || "Branch"}
                              </p>
                            </td>
                            <td className="px-3 py-3 tabular-nums text-muted-foreground">
                              {row.bill_no_formatted ? `#${row.bill_no_formatted}` : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-medium">
                              {inr(row.invoiced_amount)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-500">
                              {inr(row.received_amount)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-rose-500">
                              {inr(row.outstanding_amount)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={row.status} />
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-2">
                                {can("payments:create") && (
                                  <Button
                                    size="sm"
                                    variant={row.outstanding_amount > 0 ? "default" : "outline"}
                                    onClick={() => openReceiveModal(row)}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    {row.outstanding_amount > 0 ? "Add Payment" : "Add Payment"}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant={isOpen ? "secondary" : "outline"}
                                  onClick={() =>
                                    setExpandedClients((prev) => ({
                                      ...prev,
                                      [row.customer_id]: !prev[row.customer_id],
                                    }))
                                  }
                                >
                                  <Receipt className="mr-1 h-3.5 w-3.5" />
                                  Slips ({row.receipts.length})
                                  {isOpen ? (
                                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${row.customer_id}-detail`} className="bg-muted/20">
                              <td colSpan={8} className="px-6 py-4 space-y-4">
                                {/* Invoice Breakdown */}
                                {row.invoices.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Invoices / Duty Bills
                                    </p>
                                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                          <tr>
                                            <th className="px-3 py-2 text-left">Bill No</th>
                                            <th className="px-3 py-2 text-left">Attendant</th>
                                            <th className="px-3 py-2 text-left">Period</th>
                                            <th className="px-3 py-2 text-right">Billed</th>
                                            <th className="px-3 py-2 text-right">Received</th>
                                            <th className="px-3 py-2 text-right">Due</th>
                                            <th className="px-3 py-2 text-center">Status</th>
                                            <th className="px-3 py-2 text-right" />
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {row.invoices.map((inv) => (
                                            <tr key={inv.assignment_id}>
                                              <td className="px-3 py-2 font-medium">
                                                {inv.bill_no_formatted ? `#${inv.bill_no_formatted}` : "—"}
                                              </td>
                                              <td className="px-3 py-2">{inv.employee_name}</td>
                                              <td className="px-3 py-2 text-muted-foreground">
                                                {formatSlashDateIST(inv.start_date)} →{" "}
                                                {inv.end_date ? formatSlashDateIST(inv.end_date) : "Ongoing"} ({inv.days_worked}d)
                                              </td>
                                              <td className="px-3 py-2 text-right font-medium">{inr(inv.invoiced_amount)}</td>
                                              <td className="px-3 py-2 text-right text-emerald-500">{inr(inv.received_amount)}</td>
                                              <td className="px-3 py-2 text-right text-rose-500 font-semibold">{inr(inv.outstanding_amount)}</td>
                                              <td className="px-3 py-2 text-center"><StatusBadge status={inv.status} /></td>
                                              <td className="px-3 py-2 text-right">
                                                {can("payments:create") && inv.outstanding_amount > 0 && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => openReceiveModal(row, inv)}
                                                  >
                                                    Collect {inr(inv.outstanding_amount)}
                                                  </Button>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Receipts Issued (Date-wise Slips) */}
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Date-wise Payment Slips / Receipts ({row.receipts.length})
                                  </p>
                                  {row.receipts.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                      No payments recorded from this client yet.
                                    </p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted/40 text-muted-foreground">
                                          <tr>
                                            <th className="px-3 py-2 text-left">Payment Date</th>
                                            <th className="px-3 py-2 text-left">Slip / Receipt No</th>
                                            <th className="px-3 py-2 text-left">Mode / Ref</th>
                                            <th className="px-3 py-2 text-left">Note</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-right">Slip PDF</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                          {row.receipts.map((rcp) => (
                                            <tr key={rcp.id}>
                                              <td className="px-3 py-2 tabular-nums font-medium">
                                                {formatSlashDateIST(rcp.date)}
                                              </td>
                                              <td className="px-3 py-2 font-semibold text-primary">
                                                {rcp.receipt_no || "RCP"}
                                              </td>
                                              <td className="px-3 py-2 uppercase">
                                                {rcp.mode.replace(/_/g, " ")}
                                                {rcp.transaction_id ? ` · ${rcp.transaction_id}` : ""}
                                              </td>
                                              <td className="px-3 py-2 text-muted-foreground">
                                                {rcp.note || "—"}
                                              </td>
                                              <td className="px-3 py-2 text-right font-semibold text-emerald-500">
                                                {inr(rcp.amount)}
                                              </td>
                                              <td className="px-3 py-2 text-right space-x-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 px-2 text-xs"
                                                  onClick={() =>
                                                    downloadClientReceiptPdf({
                                                      receipt_no: rcp.receipt_no,
                                                      customer_name: row.customer_name,
                                                      phone: row.phone,
                                                      location_name: row.location_name,
                                                      bill_no: rcp.bill_no,
                                                      bill_no_formatted: rcp.bill_no_formatted,
                                                      amount: rcp.amount,
                                                      date: rcp.date,
                                                      mode: rcp.mode,
                                                      transaction_id: rcp.transaction_id,
                                                      note: rcp.note,
                                                      invoiced_amount: row.invoiced_amount,
                                                      total_received: row.received_amount,
                                                      outstanding_amount: row.outstanding_amount,
                                                    })
                                                  }
                                                >
                                                  <Download className="mr-1 h-3 w-3" /> Slip PDF
                                                </Button>
                                                {can("payments:delete") && (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-rose-500 hover:text-rose-600"
                                                    onClick={() => {
                                                      if (confirm(`Delete receipt ${rcp.receipt_no || ""}?`)) {
                                                        deleteClientPayMut.mutate(rcp.id);
                                                      }
                                                    }}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB 2: STAFF PAYMENTS ================= */}
        <TabsContent value="staff" className="mt-5 space-y-4">
          {/* Staff Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={staffFilterId} onValueChange={setStaffFilterId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="All Staff Members" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All Staff Members</SelectItem>
                  {allVerifiedStaff.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {staffFilterId !== "all" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={() => setStaffFilterId("all")}
                >
                  Show All
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="px-4 py-3 font-medium">Staff Member</th>
                    <th className="px-3 py-3 text-center font-medium">Payable Days</th>
                    <th className="px-3 py-3 text-right font-medium">Salary Due</th>
                    <th className="px-3 py-3 text-right font-medium">Paid</th>
                    <th className="px-3 py-3 text-right font-medium">Remaining</th>
                    <th className="px-3 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffLedgerQ.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No staff payroll entries for {formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)}.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((row) => {
                      const isOpen = !!expandedStaff[row.employee_id];
                      return (
                        <>
                          <tr
                            key={row.employee_id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() =>
                              setExpandedStaff((prev) => ({
                                ...prev,
                                [row.employee_id]: !prev[row.employee_id],
                              }))
                            }
                          >
                            <td className="px-3 py-3 text-muted-foreground">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold">{row.employee_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.code} · {row.category} {row.daily_rate ? `· ${inr(row.daily_rate)}/day` : ""}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-center tabular-nums font-medium">
                              {row.payable_days}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-medium">
                              {inr(row.salary_due)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-500">
                              {inr(row.paid_amount)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-rose-500">
                              {inr(row.remaining_amount)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={row.status} />
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-2">
                                {can("payments:create") && (
                                  <Button
                                    size="sm"
                                    variant={row.remaining_amount > 0 ? "default" : "outline"}
                                    onClick={() => openPayStaffModal(row)}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    {row.remaining_amount > 0 ? "Add Payment" : "Pay Advance"}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant={isOpen ? "secondary" : "outline"}
                                  onClick={() =>
                                    setExpandedStaff((prev) => ({
                                      ...prev,
                                      [row.employee_id]: !prev[row.employee_id],
                                    }))
                                  }
                                >
                                  <Receipt className="mr-1 h-3.5 w-3.5" />
                                  Slips ({row.payments.length})
                                  {isOpen ? (
                                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${row.employee_id}-detail`} className="bg-muted/20">
                              <td colSpan={8} className="px-6 py-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Date-wise Payment Slips ({row.payments.length}) ·{" "}
                                  {formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)}
                                </p>
                                {row.payments.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">
                                    No salary payments recorded in {formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)}.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/40 text-muted-foreground">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Payment Date</th>
                                          <th className="px-3 py-2 text-left">Slip / Voucher No</th>
                                          <th className="px-3 py-2 text-left">Mode / Ref</th>
                                          <th className="px-3 py-2 text-left">Paid By &amp; Note</th>
                                          <th className="px-3 py-2 text-right">Amount</th>
                                          <th className="px-3 py-2 text-right">Slip PDF</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {row.payments.map((sp) => (
                                          <tr key={sp.id}>
                                            <td className="px-3 py-2 tabular-nums font-medium">
                                              {formatSlashDateIST(sp.date)}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-indigo-400">
                                              {sp.voucher_no || "PAY"}
                                            </td>
                                            <td className="px-3 py-2 uppercase">
                                              {sp.mode.replace(/_/g, " ")}
                                              {sp.transaction_id ? ` · ${sp.transaction_id}` : ""}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                              {[sp.paid_by, sp.note].filter(Boolean).join(" — ") || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-indigo-400">
                                              {inr(sp.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right space-x-1">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() =>
                                                  downloadStaffVoucherPdf({
                                                    voucher_no: sp.voucher_no,
                                                    employee_name: row.employee_name,
                                                    code: row.code,
                                                    category: row.category,
                                                    month: sp.month || derivedMonth,
                                                    amount: sp.amount,
                                                    date: sp.date,
                                                    mode: sp.mode,
                                                    transaction_id: sp.transaction_id,
                                                    paid_by: sp.paid_by,
                                                    note: sp.note,
                                                    salary_due: row.salary_due,
                                                    total_paid: row.paid_amount,
                                                    remaining_amount: row.remaining_amount,
                                                  })
                                                }
                                              >
                                                <Download className="mr-1 h-3 w-3" /> Slip PDF
                                              </Button>
                                              {can("payments:delete") && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 px-2 text-rose-500 hover:text-rose-600"
                                                  onClick={() => {
                                                    if (confirm(`Delete voucher ${sp.voucher_no || ""}?`)) {
                                                      deleteStaffPayMut.mutate(sp.id);
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB 3: UNIFIED HISTORY ================= */}
        <TabsContent value="history" className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={historyDirection} onValueChange={setHistoryDirection}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="All transactions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Incoming &amp; Outgoing</SelectItem>
                  <SelectItem value="incoming">Incoming (Client Receipts)</SelectItem>
                  <SelectItem value="outgoing">All Outgoing (Staff + Exp)</SelectItem>
                  <SelectItem value="staff">Staff Salaries Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={historyMode} onValueChange={setHistoryMode}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Modes</SelectItem>
                  {MODE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Incoming"
              value={inr(hSum?.total_incoming)}
              subtitle="Client receipts"
              tone="text-emerald-500"
              icon={<ArrowDownLeft className="h-5 w-5 text-emerald-500" />}
            />
            <KpiCard
              title="Staff Salaries Paid"
              value={inr(hSum?.total_staff_paid)}
              subtitle="Payroll payouts"
              tone="text-indigo-400"
              icon={<ArrowUpRight className="h-5 w-5 text-indigo-400" />}
            />
            <KpiCard
              title="Office / Other Expenses"
              value={inr(hSum?.total_expenses)}
              subtitle="Operating expenses"
              tone="text-amber-500"
              icon={<ArrowUpRight className="h-5 w-5 text-amber-500" />}
            />
            <KpiCard
              title="Net Cash Flow"
              value={inr(hSum?.net_cash_flow)}
              subtitle={`${hSum?.count ?? 0} transactions`}
              tone={(hSum?.net_cash_flow ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}
              icon={<Wallet className="h-5 w-5 text-primary" />}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Ref No</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Party / Category</th>
                    <th className="px-3 py-3 font-medium">Mode / Txn Ref</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 text-right font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyQ.isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : (historyQ.data?.items.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No transactions recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    historyQ.data?.items.map((t) => (
                      <tr key={`${t.kind}-${t.id}`} className="hover:bg-muted/30">
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatSlashDateIST(t.date)}
                        </td>
                        <td className="px-3 py-3 font-semibold">{t.ref_no}</td>
                        <td className="px-3 py-3">
                          {t.kind === "client_receipt" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                              Incoming Receipt
                            </Badge>
                          ) : t.kind === "staff_salary" ? (
                            <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">
                              Staff Salary
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                              Expense
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{t.party_name}</p>
                          {(t.bill_no_formatted || t.note) && (
                            <p className="text-xs text-muted-foreground">
                              {[t.bill_no_formatted ? `Bill #${t.bill_no_formatted}` : null, t.note]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs uppercase text-muted-foreground">
                          {t.mode.replace(/_/g, " ")}
                          {t.transaction_id ? ` · ${t.transaction_id}` : ""}
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums font-bold ${
                            t.direction === "incoming" ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {t.direction === "incoming" ? "+" : "-"}
                          {inr(t.amount)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {t.kind === "client_receipt" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                downloadClientReceiptPdf({
                                  receipt_no: t.ref_no,
                                  customer_name: t.party_name,
                                  bill_no: t.bill_no,
                                  bill_no_formatted: t.bill_no_formatted,
                                  amount: t.amount,
                                  date: t.date,
                                  mode: t.mode,
                                  transaction_id: t.transaction_id,
                                  note: t.note,
                                })
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {t.kind === "staff_salary" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                downloadStaffVoucherPdf({
                                  voucher_no: t.ref_no,
                                  employee_name: t.party_name,
                                  month: t.month,
                                  amount: t.amount,
                                  date: t.date,
                                  mode: t.mode,
                                  transaction_id: t.transaction_id,
                                  note: t.note,
                                })
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= RECEIVE PAYMENT MODAL ================= */}
      <Dialog open={!!receiveTarget} onOpenChange={(o) => !o && setReceiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Client Payment</DialogTitle>
            <DialogDescription>
              {receiveTarget?.client.customer_name} · Outstanding balance{" "}
              <span className="font-semibold text-rose-500">
                {inr(receiveTarget?.client.outstanding_amount)}
              </span>
            </DialogDescription>
          </DialogHeader>

          {receiveTarget && (
            <div className="space-y-4">
              {receiveTarget.client.invoices.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Invoice / Duty Assignment</Label>
                  <Select
                    value={rxAssignmentId}
                    onValueChange={(val) => {
                      setRxAssignmentId(val);
                      if (val !== "__none__") {
                        const inv = receiveTarget.client.invoices.find(
                          (i) => i.assignment_id === val
                        );
                        if (inv && inv.outstanding_amount > 0) {
                          setRxAmount(String(inv.outstanding_amount));
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">On Account (General Receipt)</SelectItem>
                      {receiveTarget.client.invoices.map((inv) => (
                        <SelectItem key={inv.assignment_id} value={inv.assignment_id}>
                          {inv.bill_no_formatted ? `#${inv.bill_no_formatted} · ` : ""}
                          {inv.employee_name} (Due: {inr(inv.outstanding_amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Amount (₹)</Label>
                    {receiveTarget.client.outstanding_amount > 0 && (
                      <button
                        type="button"
                        className="text-[11px] font-medium text-primary hover:underline"
                        onClick={() =>
                          setRxAmount(String(receiveTarget.client.outstanding_amount))
                        }
                      >
                        Full {inr(receiveTarget.client.outstanding_amount)}
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={rxAmount}
                    onChange={(e) => setRxAmount(e.target.value)}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={rxDate}
                    onChange={(e) => setRxDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={rxMode} onValueChange={(v) => setRxMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODE_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Txn / UPI Ref No</Label>
                  <Input
                    value={rxTxnId}
                    onChange={(e) => setRxTxnId(e.target.value)}
                    placeholder="Optional reference"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input
                  value={rxNote}
                  onChange={(e) => setRxNote(e.target.value)}
                  placeholder="e.g. Partial instalment 1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={recordClientMut.isPending || !rxAmount || Number(rxAmount) <= 0}
              onClick={() => {
                if (!receiveTarget) return;
                const amt = Number(rxAmount);
                const selectedInv =
                  rxAssignmentId !== "__none__"
                    ? receiveTarget.client.invoices.find((i) => i.assignment_id === rxAssignmentId)
                    : undefined;
                const isPartial =
                  selectedInv
                    ? amt < selectedInv.outstanding_amount
                    : amt < receiveTarget.client.outstanding_amount;

                recordClientMut.mutate({
                  customer_id: receiveTarget.client.customer_id,
                  assignment_id: rxAssignmentId !== "__none__" ? rxAssignmentId : undefined,
                  bill_no: selectedInv?.bill_no ?? receiveTarget.client.bill_no ?? undefined,
                  amount: amt,
                  date: rxDate || undefined,
                  mode: rxMode,
                  status: isPartial ? "partial" : "paid",
                  transaction_id: rxTxnId || undefined,
                  note: rxNote || undefined,
                });
              }}
            >
              {recordClientMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save &amp; Download Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= PAY STAFF SALARY MODAL ================= */}
      <Dialog open={!!payStaffTarget} onOpenChange={(o) => !o && setPayStaffTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Staff Salary Payment</DialogTitle>
            <DialogDescription>
              {payStaffTarget?.employee_name} · {formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)} · Remaining{" "}
              <span className="font-semibold text-rose-500">
                {inr(payStaffTarget?.remaining_amount)}
              </span>
            </DialogDescription>
          </DialogHeader>

          {payStaffTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Amount (₹)</Label>
                    {payStaffTarget.remaining_amount > 0 && (
                      <button
                        type="button"
                        className="text-[11px] font-medium text-primary hover:underline"
                        onClick={() => setStAmount(String(payStaffTarget.remaining_amount))}
                      >
                        Full {inr(payStaffTarget.remaining_amount)}
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={stAmount}
                    onChange={(e) => setStAmount(e.target.value)}
                    placeholder="e.g. 3000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payout Date</Label>
                  <Input
                    type="date"
                    value={stDate}
                    onChange={(e) => setStDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={stMode} onValueChange={(v) => setStMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODE_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Txn / UPI Ref No</Label>
                  <Input
                    value={stTxnId}
                    onChange={(e) => setStTxnId(e.target.value)}
                    placeholder="Optional reference"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input
                  value={stNote}
                  onChange={(e) => setStNote(e.target.value)}
                  placeholder="e.g. Advance / Final settlement"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayStaffTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={recordStaffMut.isPending || !stAmount || Number(stAmount) <= 0}
              onClick={() => {
                if (!payStaffTarget) return;
                recordStaffMut.mutate({
                  employee_id: payStaffTarget.employee_id,
                  month: stDate ? stDate.slice(0, 7) : derivedMonth,
                  amount: Number(stAmount),
                  date: stDate || undefined,
                  mode: stMode,
                  transaction_id: stTxnId || undefined,
                  note: stNote || undefined,
                });
              }}
            >
              {recordStaffMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay &amp; Download Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Client Selector Dialog -> launches Receive Modal */}
      <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
            <DialogDescription>
              Choose any client to record a full, partial, or advance payment receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Select value={quickCustId} onValueChange={setQuickCustId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose client..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {allCustomers.map((c) => {
                  const ledgerMatch = (clientLedgerQ.data?.clients ?? []).find(
                    (row) => row.customer_id === c.id
                  );
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {ledgerMatch && ledgerMatch.outstanding_amount > 0
                        ? ` (Due: ${inr(ledgerMatch.outstanding_amount)})`
                        : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickClientOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!quickCustId}
              onClick={() => {
                const existing = (clientLedgerQ.data?.clients ?? []).find(
                  (r) => r.customer_id === quickCustId
                );
                const c = allCustomers.find((x) => x.id === quickCustId);
                const targetRow: ClientLedgerRow = existing || {
                  customer_id: quickCustId,
                  customer_name: c?.name || "Client",
                  phone: c?.phone,
                  location_id: c?.location_id,
                  location_name: "Branch",
                  invoiced_amount: 0,
                  received_amount: 0,
                  outstanding_amount: 0,
                  payment_count: 0,
                  status: "advance",
                  invoices: [],
                  receipts: [],
                };
                setQuickClientOpen(false);
                openReceiveModal(targetRow);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Staff Selector Dialog -> launches Pay Staff Modal */}
      <Dialog open={quickStaffOpen} onOpenChange={setQuickStaffOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Staff Member</DialogTitle>
            <DialogDescription>
              Choose any verified staff member to pay salary or advance ({formatSlashDateIST(startDate)} – {formatSlashDateIST(endDate)}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Staff Name</Label>
            <Select value={quickEmpId} onValueChange={setQuickEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose staff..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {allVerifiedStaff.map((e) => {
                  const ledgerMatch = (staffLedgerQ.data?.staff ?? []).find(
                    (row) => row.employee_id === e.id
                  );
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {ledgerMatch && ledgerMatch.remaining_amount > 0
                        ? ` (Bal: ${inr(ledgerMatch.remaining_amount)})`
                        : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickStaffOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!quickEmpId}
              onClick={() => {
                const existing = (staffLedgerQ.data?.staff ?? []).find(
                  (r) => r.employee_id === quickEmpId
                );
                const e = allVerifiedStaff.find((x) => x.id === quickEmpId);
                const targetRow: StaffLedgerRow = existing || {
                  employee_id: quickEmpId,
                  employee_name: e?.name || "Staff",
                  code: e?.code || "",
                  category: e?.category || "",
                  location_id: e?.location_id || "",
                  daily_rate: e?.daily_rate,
                  worked_days: 0,
                  payable_days: 0,
                  salary_due: 0,
                  paid_amount: 0,
                  remaining_amount: 0,
                  status: "no_due",
                  payment_count: 0,
                  payments: [],
                };
                setQuickStaffOpen(false);
                openPayStaffModal(targetRow);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${tone || ""}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted/60">{icon}</div>}
      </div>
    </div>
  );
}
