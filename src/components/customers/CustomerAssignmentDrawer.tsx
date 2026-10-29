import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  MapPin,
  Phone,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { resourceServices } from "@/services/resources";
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
import type { Customer } from "@/types/models";

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
    mutationFn: (values: Record<string, unknown>) =>
      resourceServices.assignments.create(values),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(
        `Duty successfully assigned to ${created.employee_name || "Nurse"}!`,
        {
          description: `Assigned for ${customer?.name ?? "Customer"}. Staff has been notified.`,
          action: {
            label: "View in Assignments",
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
    <Sheet open={Boolean(customer)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        {customer && (
          <>
            <SheetHeader className="pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-bold">
                      Assign Nurse to Duty
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      Assign staff member to care for{" "}
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
                  <Sparkles className="h-3 w-3 mr-1" /> Quick Assign
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

            <div className="py-2">
              <ResourceForm
                fields={assignmentsConfig.fields}
                initial={initialAssignmentData}
                submitting={createMutation.isPending}
                onCancel={onClose}
                onSubmit={(values) => createMutation.mutate(values)}
                submitLabel="Create & Assign Nurse"
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

