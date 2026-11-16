import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { resourceServices } from "@/services/resources";
import { normalizeError } from "@/services/api/client";
import { BranchName } from "@/components/common/BranchName";
import { ResourceForm } from "@/components/resource/ResourceForm";
import { ReplaceStaffDialog } from "@/components/assignments/ReplaceStaffDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function CustomerAssignmentDrawer({
  customer,
  onClose,
}: CustomerAssignmentDrawerProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [userWantsNew, setUserWantsNew] = useState(false);
  const [replacingAssignment, setReplacingAssignment] = useState<Assignment | null>(null);

  // Fetch all assignments for this customer to display active and past staff
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

  const assignments = assignmentsData?.items ?? [];

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
      duration_days: customer.duration_days ?? 10,
      customer_rate: customer.billing_rate ?? undefined,
      payment_type: "prepaid",
      payment_status: "pending",
      notes: customer.notes
        ? `Customer notes: ${customer.notes}`
        : customer.service_label
          ? `Requested care: ${customer.service_label}`
          : undefined,
    };
  }, [customer]);

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
          description: `Assigned for ${customer?.name ?? "Customer"}. Live push alert with sound dispatched to nurse device.`,
          action: {
            label: "View in Assignments",
            onClick: () => navigate("/assignments"),
          },
        }
      );
      setUserWantsNew(false);
      refetchAssignments();
    },
    onError: (err) => {
      toast.error(normalizeError(err).message);
    },
  });

  // Determine whether to show the form or the staff overview list:
  // If user explicitly asked for new form, or if there are no assignments registered yet.
  const showForm = userWantsNew || (!loadingAssignments && assignments.length === 0);

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
                        Assign staff member or manage multiple nurses for{" "}
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

              {/* View 1: List of Assigned Staff & Handover History */}
              {!showForm && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        Assigned Staff ({assignments.length} জন নার্স / স্টাফ)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        এই ক্লায়েন্টের জন্য ডিউটিপ্রাপ্ত নার্সদের তালিকা ও বদলির ইতিহাস
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setUserWantsNew(true)}
                      className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      + New Assignment
                    </Button>
                  </div>

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
                        onClick={() => setUserWantsNew(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Assign First Nurse
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {assignments.map((asg) => {
                        const canReplace =
                          asg.status !== "cancelled" &&
                          !asg.replaced_by_employee_id &&
                          asg.status !== "completed";

                        return (
                          <div
                            key={asg.id}
                            className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-xs"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
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
                                    title="Replace staff with a substitute nurse"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Replace Staff
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

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setUserWantsNew(true)}
                          className="w-full gap-2 text-xs border-dashed"
                        >
                          <Plus className="h-4 w-4" />
                          + Assign Another Nurse / New Period (আরেকজন নার্স বা নতুন ডিউটি)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Form to Create New Duty Assignment */}
              {showForm && (
                <div className="space-y-3 pt-1">
                  {assignments.length > 0 && (
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserWantsNew(false)}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Staff List ({assignments.length} assigned)
                      </Button>
                      <Badge variant="secondary" className="text-xs">
                        New Duty Assignment
                      </Badge>
                    </div>
                  )}

                  <div className="py-1">
                    <ResourceForm
                      fields={assignmentsConfig.fields}
                      initial={initialAssignmentData}
                      submitting={createMutation.isPending}
                      onCancel={() => {
                        if (assignments.length > 0) {
                          setUserWantsNew(false);
                        } else {
                          onClose();
                        }
                      }}
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

      {/* Replace Staff Modal Dialog */}
      <ReplaceStaffDialog
        assignment={replacingAssignment}
        onClose={() => setReplacingAssignment(null)}
        onSuccess={() => {
          refetchAssignments();
          qc.invalidateQueries({ queryKey: ["assignments"] });
          qc.invalidateQueries({ queryKey: ["monthly-bills"] });
        }}
      />
    </>
  );
}
