import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  MapPin,
  Phone,
  UserCheck,
  Sparkles,
  Stethoscope,
  Calendar,
  Plus,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { resourceServices } from "@/services/resources";
import { bookingService } from "@/services/booking.service";
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
import type { Booking, Assignment } from "@/types/models";

interface BookingAssignmentDrawerProps {
  booking: Booking | null;
  onClose: () => void;
}

function toISODate(d: unknown): string | undefined {
  if (!d) return undefined;
  const s = String(d).trim();
  if (!s) return undefined;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [day, mon, yr] = s.split("/");
    return `${yr}-${mon}-${day}`;
  }
  return s.slice(0, 10);
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function BookingAssignmentDrawer({
  booking,
  onClose,
}: BookingAssignmentDrawerProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [userWantsNew, setUserWantsNew] = useState(false);
  const [replacingAssignment, setReplacingAssignment] = useState<Assignment | null>(null);

  // Filter out customer_id since this duty is directly bound to this booking's patient
  const assignmentFields = useMemo(() => {
    return assignmentsConfig.fields.filter((f) => f.name !== "customer_id");
  }, []);

  // Fetch assignments if this booking already has an associated customer_id
  const {
    data: assignmentsData,
    isLoading: loadingAssignments,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["assignments", "by-customer", booking?.customer_id],
    queryFn: () =>
      resourceServices.assignments.list({
        customer_id: booking?.customer_id ?? undefined,
        page_size: 50,
        sort_by: "start_date",
        sort_order: "desc",
      }),
    enabled: Boolean(booking?.customer_id),
    staleTime: 10_000,
  });

  const assignments = assignmentsData?.items ?? [];

  const initialAssignmentData = useMemo(() => {
    if (!booking) return null;

    const fullAddress = [booking.address, booking.city, booking.pincode]
      .filter(Boolean)
      .join(", ");

    let formattedStartDate = getTodayIST();
    if (booking.preferred_date) {
      try {
        formattedStartDate = String(booking.preferred_date).slice(0, 10);
      } catch {
        // fallback to today
      }
    }

    return {
      location_id: booking.location_id,
      shift: "full_24h",
      status: "scheduled",
      place_type: "home",
      place_name: "",
      address: fullAddress,
      start_date: formattedStartDate,
      duration_days: 10,
      payment_type: booking.payment_type || "prepaid",
      payment_status: booking.payment_type === "postpaid" ? "pending" : "paid",
      notes: `Booking #${booking.reference}. Patient: ${booking.patient_name} (${booking.contact_phone}). Requested: ${booking.service_name}${
        booking.care_required ? ` - ${booking.care_required}` : ""
      }${booking.message ? ` [Message: ${booking.message}]` : ""}`,
    };
  }, [booking]);

  const assignMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!booking) throw new Error("No booking selected");

      let customerId = booking.customer_id;
      let customerLocationId = booking.location_id;

      // 1. If not yet converted to customer in MongoDB, convert & link now!
      if (!customerId) {
        const convRes = await bookingService.convertToCustomer(
          booking.id,
          (values.location_id as string) || booking.location_id || undefined
        );
        customerId = convRes.customer.id;
        customerLocationId = convRes.customer.location_id || booking.location_id;

        // If customer geocoding returned coordinates and form didn't supply pin, use them
        if ((!values.dest_lat || values.dest_lat === "") && convRes.customer.lat != null) {
          values.dest_lat = convRes.customer.lat;
          values.dest_lng = convRes.customer.lng;
        }
      }

      // 2. Create the assignment for this customer and staff member
      const assignmentPayload: Record<string, unknown> = {
        ...values,
        customer_id: customerId,
        location_id: values.location_id || customerLocationId,
        start_date: toISODate(values.start_date) || getTodayIST(),
      };

      if (values.end_date) {
        assignmentPayload.end_date = toISODate(values.end_date);
      } else {
        delete assignmentPayload.end_date;
      }
      if (
        assignmentPayload.dest_lat === "" ||
        assignmentPayload.dest_lat == null ||
        Number.isNaN(assignmentPayload.dest_lat)
      ) {
        delete assignmentPayload.dest_lat;
      }
      if (
        assignmentPayload.dest_lng === "" ||
        assignmentPayload.dest_lng == null ||
        Number.isNaN(assignmentPayload.dest_lng)
      ) {
        delete assignmentPayload.dest_lng;
      }
      if (
        assignmentPayload.duration_days === "" ||
        assignmentPayload.duration_days == null ||
        Number.isNaN(assignmentPayload.duration_days)
      ) {
        delete assignmentPayload.duration_days;
      }
      if (
        assignmentPayload.customer_rate !== undefined &&
        assignmentPayload.customer_rate !== ""
      ) {
        const n = Number(assignmentPayload.customer_rate);
        if (!Number.isNaN(n)) assignmentPayload.customer_rate = Math.round(n);
        else delete assignmentPayload.customer_rate;
      } else {
        delete assignmentPayload.customer_rate;
      }
      if (
        assignmentPayload.employee_payout !== undefined &&
        assignmentPayload.employee_payout !== ""
      ) {
        const n = Number(assignmentPayload.employee_payout);
        if (!Number.isNaN(n)) assignmentPayload.employee_payout = Math.round(n);
        else delete assignmentPayload.employee_payout;
      } else {
        delete assignmentPayload.employee_payout;
      }
      if (
        assignmentPayload.other_expense !== undefined &&
        assignmentPayload.other_expense !== ""
      ) {
        const n = Number(assignmentPayload.other_expense);
        if (!Number.isNaN(n)) assignmentPayload.other_expense = Math.round(n);
        else delete assignmentPayload.other_expense;
      } else {
        delete assignmentPayload.other_expense;
      }

      const created = await resourceServices.assignments.create(assignmentPayload);

      // Automatically update the booking: link assigned staff and update status to "assigned"
      if (booking?.id) {
        try {
          const empId = created.employee_id || (values.employee_id as string) || "staff";
          const empName = created.employee_name || (values.employee_name as string) || "Staff";
          await bookingService.assign(booking.id, empId, empName);
        } catch (e) {
          console.warn("Could not sync booking status with assigned staff:", e);
        }
      }

      return { created, customerId };
    },
    onSuccess: ({ created }) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(
        `Duty assigned to ${created.employee_name || "Nurse"}!`,
        {
          description: `Assigned for ${booking?.patient_name ?? "Patient"}. Live push and portal notifications dispatched.`,
          action: {
            label: "View Assignments",
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

  const showForm =
    userWantsNew || (!loadingAssignments && assignments.length === 0);

  return (
    <>
      <Sheet open={Boolean(booking)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {booking && (
            <div className="space-y-4 pb-8">
              <SheetHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg font-bold">
                        Assign Duty to Nurse
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        Booking{" "}
                        <span className="font-mono font-semibold text-foreground">
                          {booking.reference}
                        </span>{" "}
                        · Patient:{" "}
                        <span className="font-semibold text-foreground">
                          {booking.patient_name}
                        </span>
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

                {/* Patient and booking snapshot info box */}
                <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">
                        {booking.patient_name}
                      </span>
                      {booking.patient_age && (
                        <span className="text-muted-foreground">
                          ({booking.patient_age} yrs
                          {booking.patient_gender ? `, ${booking.patient_gender}` : ""})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{booking.contact_phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">
                        {booking.service_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Preferred: {formatDate(booking.preferred_date)}</span>
                    </div>
                    {booking.location_id && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium">Branch:</span>
                        <BranchName id={booking.location_id} className="text-xs" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-1 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {[booking.address, booking.city, booking.pincode]
                          .filter(Boolean)
                          .join(", ")}
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
                        এই বুকিং/রোগীর জন্য নিযুক্ত নার্সদের তালিকা ও রিপ্লেসমেন্ট হিস্ট্রি
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
                      fields={assignmentFields}
                      initial={initialAssignmentData}
                      submitting={assignMutation.isPending}
                      onCancel={() => {
                        if (assignments.length > 0) {
                          setUserWantsNew(false);
                        } else {
                          onClose();
                        }
                      }}
                      onSubmit={(values) => assignMutation.mutate(values)}
                      submitLabel="Create Duty & Assign Nurse"
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
          qc.invalidateQueries({ queryKey: ["bookings"] });
        }}
      />
    </>
  );
}
