import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  MapPin,
  Phone,
  UserCheck,
  Sparkles,
  Stethoscope,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { resourceServices } from "@/services/resources";
import { bookingService } from "@/services/booking.service";
import { normalizeError } from "@/services/api/client";
import { BranchName } from "@/components/common/BranchName";
import { ResourceForm } from "@/components/resource/ResourceForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Booking } from "@/types/models";

interface BookingAssignmentDrawerProps {
  booking: Booking | null;
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

export function BookingAssignmentDrawer({
  booking,
  onClose,
}: BookingAssignmentDrawerProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Filter out customer_id since this duty is directly bound to this booking's patient
  const assignmentFields = useMemo(() => {
    return assignmentsConfig.fields.filter((f) => f.name !== "customer_id");
  }, []);

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
      payment_status: "pending",
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
      };

      // Strip empty strings and NaNs that fail backend validation
      if (!assignmentPayload.end_date) delete assignmentPayload.end_date;
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
        assignmentPayload.customer_rate === "" ||
        assignmentPayload.customer_rate == null ||
        Number.isNaN(assignmentPayload.customer_rate)
      ) {
        delete assignmentPayload.customer_rate;
      }
      if (
        assignmentPayload.employee_payout === "" ||
        assignmentPayload.employee_payout == null ||
        Number.isNaN(assignmentPayload.employee_payout)
      ) {
        delete assignmentPayload.employee_payout;
      }
      if (
        assignmentPayload.other_expense === "" ||
        assignmentPayload.other_expense == null ||
        Number.isNaN(assignmentPayload.other_expense)
      ) {
        delete assignmentPayload.other_expense;
      }

      const created = await resourceServices.assignments.create(assignmentPayload);
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
      onClose();
    },
    onError: (err) => {
      toast.error(normalizeError(err).message);
    },
  });

  return (
    <Sheet open={Boolean(booking)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        {booking && (
          <>
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
                  <Sparkles className="h-3 w-3 mr-1" /> 1-Click Assign
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

            <div className="py-2">
              <ResourceForm
                fields={assignmentFields}
                initial={initialAssignmentData}
                submitting={assignMutation.isPending}
                onCancel={onClose}
                onSubmit={(values) => assignMutation.mutate(values)}
                submitLabel="Create Duty & Assign Nurse"
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

