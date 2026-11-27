import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  MapPin,
  Phone,
  UserCheck,
  Sparkles,
  Plus,
  ArrowLeft,
  Loader2,
  Stethoscope,
  Users,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { resourceServices } from "@/services/resources";
import { normalizeError, describeError } from "@/services/api/client";
import { BranchName } from "@/components/common/BranchName";
import { SearchableStaffSelect } from "@/components/common/SearchableStaffSelect";
import { ResourceForm } from "@/components/resource/ResourceForm";
import { ReplaceStaffDialog } from "@/components/assignments/ReplaceStaffDialog";
import { BatchReplaceStaffDialog } from "@/components/assignments/BatchReplaceStaffDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import type { Customer, Assignment } from "@/types/models";

interface CustomerAssignmentDrawerProps {
  customer: Customer | null;
  onClose: () => void;
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface MultiNurseRow {
  id: string;
  employee_id: string;
  shift: string;
}

export function CustomerAssignmentDrawer({
  customer,
  onClose,
}: CustomerAssignmentDrawerProps) {
  const qc = useQueryClient();

  // Mode: "list" | "single_new" | "multi_new"
  const [viewMode, setViewMode] = useState<"list" | "single_new" | "multi_new">("list");
  const [replacingAssignment, setReplacingAssignment] = useState<Assignment | null>(null);
  const [batchReplacingAssignments, setBatchReplacingAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set());

  // Multi-nurse builder state
  const [multiStartDate, setMultiStartDate] = useState(() => getTodayIST());
  const [multiDurationDays, setMultiDurationDays] = useState(10);
  const [multiNurseRows, setMultiNurseRows] = useState<MultiNurseRow[]>([
    { id: "row-1", employee_id: "", shift: "day" },
    { id: "row-2", employee_id: "", shift: "night" },
  ]);

  // 1. Fetch all assignments for this customer
  const {
    data: assignmentsData,
    isLoading: loadingAssignments,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["assignments", "by-customer", customer?.id],
    queryFn: () =>
      resourceServices.assignments.list({
        customer_id: customer?.id,
        page_size: 50,
        sort_by: "start_date",
        sort_order: "desc",
      }),
    enabled: Boolean(customer?.id),
    staleTime: 10_000,
  });

  // 2. Fetch all employees across the agency
  const { data: staffData } = useQuery({
    queryKey: ["employees", "all-for-replace"],
    queryFn: () => resourceServices.employees.list({ page_size: 200 }),
    staleTime: 30_000,
  });

  // 3. Fetch branches
  const { data: locationsData } = useQuery({
    queryKey: ["locations", "lookup"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const branchMap = useMemo(() => {
    const map: Record<string, string> = {};
    (locationsData?.items ?? []).forEach((loc) => {
      map[loc.id] = loc.name;
    });
    return map;
  }, [locationsData]);

  const allStaff = useMemo(() => {
    const list = staffData?.items ?? [];
    return list.filter((e) => (e.is_active ?? true));
  }, [staffData]);

  const assignments = assignmentsData?.items ?? [];

  // Active / scheduled assignments eligible for replacement
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.status !== "cancelled" &&
          !a.replaced_by_employee_id &&
          a.status !== "completed"
      ),
    [assignments]
  );

  const toggleSelectAssignment = (id: string) => {
    setSelectedAssignmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllActive = () => {
    if (selectedAssignmentIds.size === activeAssignments.length) {
      setSelectedAssignmentIds(new Set());
    } else {
      setSelectedAssignmentIds(new Set(activeAssignments.map((a) => a.id)));
    }
  };

  // Single assignment form initial data
  const initialAssignmentData = useMemo(() => {
    if (!customer) return null;
    return {
      customer_id: customer.id,
      location_id: customer.location_id,
      shift: "full_24h",
      status: "scheduled",
      place_type:
        customer.care_type === "hospital"
          ? "hospital"
          : customer.care_type === "nursing_home"
            ? "nursing_home"
            : "home",
      place_name: "",
      address: customer.address || "",
      dest_lat: customer.lat != null ? customer.lat : undefined,
      dest_lng: customer.lng != null ? customer.lng : undefined,
      start_date: getTodayIST(),
      contract_amount: customer.billing_rate ?? undefined,
      payment_type: "prepaid",
      payment_status: "pending",
      notes: customer.notes
        ? `Customer notes: ${customer.notes}`
        : customer.service_label
          ? `Requested care: ${customer.service_label}`
          : undefined,
    };
  }, [customer]);

  // Single creation mutation
  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const cleanPayload = { ...values };
      if (!cleanPayload.end_date) delete cleanPayload.end_date;
      if (
        cleanPayload.dest_lat === "" ||
        cleanPayload.dest_lat == null ||
        Number.isNaN(cleanPayload.dest_lat)
      ) {
        delete cleanPayload.dest_lat;
      }
      if (
        cleanPayload.dest_lng === "" ||
        cleanPayload.dest_lng == null ||
        Number.isNaN(cleanPayload.dest_lng)
      ) {
        delete cleanPayload.dest_lng;
      }
      if (
        cleanPayload.duration_days === "" ||
        cleanPayload.duration_days == null ||
        Number.isNaN(cleanPayload.duration_days)
      ) {
        delete cleanPayload.duration_days;
      }
      if (
        cleanPayload.contract_amount === "" ||
        cleanPayload.contract_amount == null ||
        Number.isNaN(cleanPayload.contract_amount)
      ) {
        delete cleanPayload.contract_amount;
      }
      if (
        cleanPayload.customer_rate === "" ||
        cleanPayload.customer_rate == null ||
        Number.isNaN(cleanPayload.customer_rate)
      ) {
        delete cleanPayload.customer_rate;
      }
      if (
        cleanPayload.employee_payout === "" ||
        cleanPayload.employee_payout == null ||
        Number.isNaN(cleanPayload.employee_payout)
      ) {
        delete cleanPayload.employee_payout;
      }
      if (
        cleanPayload.daily_other_expense === "" ||
        cleanPayload.daily_other_expense == null ||
        Number.isNaN(cleanPayload.daily_other_expense)
      ) {
        delete cleanPayload.daily_other_expense;
      }
      if (
        cleanPayload.other_expense === "" ||
        cleanPayload.other_expense == null ||
        Number.isNaN(cleanPayload.other_expense)
      ) {
        delete cleanPayload.other_expense;
      }
      return resourceServices.assignments.create(cleanPayload);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(
        `Duty successfully assigned to ${created.employee_name || "Nurse"}!`,
        {
          description: `Assigned for ${customer?.name ?? "Customer"}. Live push alert dispatched.`,
        }
      );
      setViewMode("list");
      refetchAssignments();
    },
    onError: (err) => {
      toast.error(normalizeError(err).message);
    },
  });

  // Multi-nurse creation mutation
  const multiAssignMutation = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error("No customer selected");
      const validRows = multiNurseRows.filter((r) => Boolean(r.employee_id));
      if (validRows.length === 0) {
        throw new Error("Please select at least one nurse to assign");
      }

      return resourceServices.assignments.multiAssign({
        customer_id: customer.id,
        location_id: customer.location_id,
        start_date: multiStartDate,
        duration_days: multiDurationDays,
        address: customer.address || "",
        dest_lat: customer.lat != null ? customer.lat : undefined,
        dest_lng: customer.lng != null ? customer.lng : undefined,
        staff_list: validRows.map((r) => ({
          employee_id: r.employee_id,
          shift: r.shift,
        })),
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(`Successfully assigned ${res.count || multiNurseRows.length} nurses!`, {
        description: `All nurses assigned to ${customer?.name}. Alerts dispatched to devices.`,
      });
      setViewMode("list");
      refetchAssignments();
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  // Effective mode to show
  const currentView =
    !loadingAssignments && assignments.length === 0 && viewMode === "list"
      ? "multi_new"
      : viewMode;

  return (
    <>
      <Sheet open={Boolean(customer)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {customer && (
            <div className="space-y-4 pb-8">
              <SheetHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg font-bold">
                        Client Duty &amp; Staff Assignments
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        Manage multi-nurse care team for{" "}
                        <span className="font-semibold text-foreground">
                          {customer.name}
                        </span>{" "}
                        ({customer.code})
                      </SheetDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 text-xs px-2.5 py-0.5"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Multi-Staff
                  </Badge>
                </div>

                {/* Customer summary snapshot card */}
                <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">
                        {customer.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ({customer.code})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{customer.phone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="font-medium">Branch:</span>
                      <BranchName id={customer.location_id} className="text-xs" />
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {customer.lat != null && customer.lng != null ? (
                          <span className="text-emerald-400 font-medium">
                            📍 GPS Pin Saved ({customer.lat.toFixed(4)},{" "}
                            {customer.lng.toFixed(4)})
                          </span>
                        ) : customer.address ? (
                          <span className="text-amber-400">
                            Address will auto-geocode
                          </span>
                        ) : (
                          "No address set"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* View 1: List of Active & Past Staff with Multi-Replace */}
              {currentView === "list" && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Assigned Staff ({assignments.length} জন নার্স / স্টাফ)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        বর্তমানে কর্মরত নার্সগণ ও বদলির সম্পূর্ণ ইতিহাস
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setViewMode("multi_new")}
                        className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                      >
                        <Users className="h-3.5 w-3.5" />
                        + Add Multiple Nurses
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewMode("single_new")}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Single
                      </Button>
                    </div>
                  </div>

                  {/* Batch Replace Action Bar (When 1 or more active nurses are checked) */}
                  {activeAssignments.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-2.5 px-3 text-xs">
                      <button
                        type="button"
                        onClick={toggleSelectAllActive}
                        className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition"
                      >
                        {selectedAssignmentIds.size === activeAssignments.length ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>
                          {selectedAssignmentIds.size > 0
                            ? `${selectedAssignmentIds.size} of ${activeAssignments.length} Selected`
                            : "Select Active Nurses for Batch Replacement"}
                        </span>
                      </button>

                      {selectedAssignmentIds.size > 0 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const selected = activeAssignments.filter((a) =>
                              selectedAssignmentIds.has(a.id)
                            );
                            setBatchReplacingAssignments(selected);
                          }}
                          className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-xs h-7 px-3"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Replace Selected ({selectedAssignmentIds.size})
                        </Button>
                      )}
                    </div>
                  )}

                  {loadingAssignments ? (
                    <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading assigned staff...
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-2">
                      <p>কোনো নার্স এখনও অ্যাসাইন করা হয়নি।</p>
                      <Button
                        size="sm"
                        onClick={() => setViewMode("multi_new")}
                        className="gap-1.5 text-xs"
                      >
                        <Users className="h-3.5 w-3.5" /> + Assign Multiple Nurses
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {assignments.map((asg) => {
                        const canReplace =
                          asg.status !== "cancelled" &&
                          !asg.replaced_by_employee_id &&
                          asg.status !== "completed";

                        const isSelected = selectedAssignmentIds.has(asg.id);

                        return (
                          <div
                            key={asg.id}
                            className={`rounded-xl border p-3.5 space-y-2.5 shadow-xs transition ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border/80 bg-card"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                {canReplace && (
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectAssignment(asg.id)}
                                    className="mt-0.5 text-primary hover:opacity-80 transition"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Square className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                )}

                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-foreground text-sm">
                                      {asg.employee_name}
                                    </span>

                                    {asg.is_replacement && (
                                      <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] py-0 px-1.5">
                                        🔄 Replacement for {asg.replacement_for_employee_name || "staff"}
                                      </Badge>
                                    )}

                                    {asg.replaced_by_employee_name && (
                                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] py-0 px-1.5">
                                        🛑 Replaced by {asg.replaced_by_employee_name}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                                    <span>
                                      Shift:{" "}
                                      <span className="text-foreground font-medium capitalize">
                                        {asg.shift === "full_24h" ? "24 Hours" : asg.shift}
                                      </span>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Period:{" "}
                                      <span className="text-foreground font-medium">
                                        {formatDate(asg.start_date)} →{" "}
                                        {asg.end_date ? formatDate(asg.end_date) : "Ongoing"}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    asg.status === "active"
                                      ? "default"
                                      : asg.status === "completed"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="capitalize text-[11px]"
                                >
                                  {asg.status}
                                </Badge>

                                {canReplace && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                    onClick={() => setReplacingAssignment(asg)}
                                    title="Replace this staff member"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Replace
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Summary strip: Days worked & Rates */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                              <div>
                                <span className="font-medium text-foreground">Duration: </span>
                                {asg.days_worked != null
                                  ? `${asg.days_worked} days worked`
                                  : asg.total_days
                                    ? `${asg.total_days} days scheduled`
                                    : "Ongoing"}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Customer Rate: </span>
                                {asg.customer_daily_rate
                                  ? `₹${asg.customer_daily_rate}/day`
                                  : asg.customer_rate
                                    ? `₹${asg.customer_rate} total`
                                    : "—"}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Staff Payout: </span>
                                {asg.employee_daily_rate
                                  ? `₹${asg.employee_daily_rate}/day`
                                  : asg.employee_payout
                                    ? `₹${asg.employee_payout} total`
                                    : "—"}
                              </div>
                            </div>

                            {asg.replacement_reason && (
                              <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1">
                                <span className="font-semibold">Handover / Leave Reason: </span>
                                {asg.replacement_reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Multi-Nurse Duty Assignment Builder */}
              {currentView === "multi_new" && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Staff List
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      Multi-Staff Duty Builder
                    </Badge>
                  </div>

                  {/* Shared Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/70">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Start Date (শুরুর তারিখ) *</Label>
                      <Input
                        type="date"
                        value={multiStartDate}
                        onChange={(e) => setMultiStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Duration Days (কাজের সময়কাল) *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={multiDurationDays}
                        onChange={(e) => setMultiDurationDays(Number(e.target.value) || 1)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Multiple Nurse Rows */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        Select Nurses &amp; Assign Shifts (২, ৩ বা ৪ জন নার্স একসাথে):
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMultiNurseRows((prev) => [
                            ...prev,
                            { id: `row-${Date.now()}`, employee_id: "", shift: "full_24h" },
                          ]);
                        }}
                        className="gap-1.5 text-xs h-7"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Add Another Nurse
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {multiNurseRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl border border-border bg-card shadow-xs"
                        >
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                            {idx + 1}
                          </span>

                          <div className="flex-1 min-w-[200px]">
                            <SearchableStaffSelect
                              staffList={allStaff}
                              value={row.employee_id}
                              onChange={(empId) => {
                                setMultiNurseRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, employee_id: empId } : r
                                  )
                                );
                              }}
                              branchMap={branchMap}
                              targetLocationId={customer.location_id}
                              placeholder={`Select Nurse #${idx + 1}...`}
                            />
                          </div>

                          <div className="w-full sm:w-44">
                            <select
                              value={row.shift}
                              onChange={(e) => {
                                const shiftVal = e.target.value;
                                setMultiNurseRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, shift: shiftVal } : r
                                  )
                                );
                              }}
                              className="h-10 w-full rounded-xl border border-border bg-card px-2.5 text-xs focus:ring-1 focus:ring-primary"
                            >
                              <option value="full_24h">24 Hours Shift</option>
                              <option value="day">Day Shift (8 AM - 8 PM)</option>
                              <option value="night">Night Shift (8 PM - 8 AM)</option>
                              <option value="custom">Custom Shift</option>
                            </select>
                          </div>

                          {multiNurseRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMultiNurseRows((prev) =>
                                  prev.filter((r) => r.id !== row.id)
                                );
                              }}
                              className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                              title="Remove this nurse"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => multiAssignMutation.mutate()}
                      disabled={
                        multiAssignMutation.isPending ||
                        multiNurseRows.filter((r) => Boolean(r.employee_id)).length === 0
                      }
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 shadow-sm"
                    >
                      {multiAssignMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      Assign All {multiNurseRows.filter((r) => Boolean(r.employee_id)).length} Nurses to Patient
                    </Button>
                  </div>
                </div>
              )}

              {/* View 3: Single Nurse Form (Classic) */}
              {currentView === "single_new" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Staff List
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      Single Duty Assignment
                    </Badge>
                  </div>

                  <div className="py-1">
                    <ResourceForm
                      fields={assignmentsConfig.fields}
                      initial={initialAssignmentData}
                      submitting={createMutation.isPending}
                      onCancel={() => setViewMode("list")}
                      onSubmit={(values) => createMutation.mutate(values)}
                      submitLabel="Create & Assign Nurse"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Single Replace Staff Modal Dialog */}
      <ReplaceStaffDialog
        assignment={replacingAssignment}
        onClose={() => setReplacingAssignment(null)}
        onSuccess={() => {
          refetchAssignments();
          qc.invalidateQueries({ queryKey: ["assignments"] });
          qc.invalidateQueries({ queryKey: ["monthly-bills"] });
        }}
      />

      {/* Batch Replace Multiple Staff Modal Dialog */}
      <BatchReplaceStaffDialog
        assignments={batchReplacingAssignments}
        onClose={() => {
          setBatchReplacingAssignments([]);
          setSelectedAssignmentIds(new Set());
        }}
        onSuccess={() => {
          refetchAssignments();
          setSelectedAssignmentIds(new Set());
          qc.invalidateQueries({ queryKey: ["assignments"] });
          qc.invalidateQueries({ queryKey: ["monthly-bills"] });
        }}
      />
    </>
  );
}
