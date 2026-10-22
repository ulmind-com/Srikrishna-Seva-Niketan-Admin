import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Stethoscope,
  ShieldAlert,
  Check,
  X,
  Ban,
  UserPlus,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/types/models";
import { bookingService } from "@/services/booking.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, humanize } from "@/lib/utils";

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export function BookingDrawer({ booking, onClose }: Props) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("bookings:update");
  const [notes, setNotes] = useState("");
  const [staffName, setStaffName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const action = useMutation({
    mutationFn: async (kind: "approve" | "reject" | "cancel") => {
      if (!booking) return;
      if (kind === "approve") return bookingService.approve(booking.id);
      if (kind === "reject") return bookingService.reject(booking.id, notes);
      return bookingService.cancel(booking.id, notes);
    },
    onSuccess: (_, kind) => {
      invalidate();
      toast.success(`Booking ${kind}d`);
      onClose();
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const assign = useMutation({
    mutationFn: () =>
      bookingService.assign(booking!.id, staffName || "staff", staffName),
    onSuccess: () => {
      invalidate();
      toast.success("Staff assigned");
      setStaffName("");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const isTerminal =
    booking && ["completed", "cancelled", "rejected"].includes(booking.status);

  return (
    <Sheet open={Boolean(booking)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {booking && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <SheetTitle>{booking.patient_name}</SheetTitle>
                  <SheetDescription className="font-mono text-xs">
                    {booking.reference}
                  </SheetDescription>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Stethoscope} label="Service" value={booking.service_name} />
                <InfoRow icon={Calendar} label="Preferred date" value={formatDate(booking.preferred_date)} />
                <InfoRow icon={Clock} label="Preferred time" value={booking.preferred_time} />
                <InfoRow icon={User} label="Patient" value={`${booking.patient_name}${booking.patient_age ? `, ${booking.patient_age}` : ""}`} />
                <InfoRow icon={Phone} label="Phone" value={booking.contact_phone} />
                <InfoRow icon={MessageSquare} label="WhatsApp" value={booking.whatsapp_number} />
                <InfoRow icon={Mail} label="Email" value={booking.contact_email} />
              </section>

              {booking.care_required && (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" /> Care / Service Required
                  </p>
                  <p className="text-sm">{booking.care_required}</p>
                </div>
              )}

              <Separator />

              <section className="space-y-4">
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={[booking.address, booking.city, booking.pincode].filter(Boolean).join(", ")}
                />
                {(booking.emergency_contact_name || booking.emergency_contact_phone) && (
                  <InfoRow
                    icon={ShieldAlert}
                    label="Emergency contact"
                    value={`${booking.emergency_contact_name ?? ""} ${booking.emergency_contact_phone ?? ""}`.trim()}
                  />
                )}
                {booking.message && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Message</p>
                    <p className="text-sm">{booking.message}</p>
                  </div>
                )}
                {booking.admin_notes && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Admin notes</p>
                    <p className="whitespace-pre-wrap text-sm">{booking.admin_notes}</p>
                  </div>
                )}
              </section>

              {canUpdate && (
                <>
                  <Separator />
                  <section className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Assign staff</Label>
                      <div className="flex gap-2">
                        <Input
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          placeholder="Staff member name"
                        />
                        <Button
                          variant="outline"
                          onClick={() => assign.mutate()}
                          loading={assign.isPending}
                          disabled={!staffName}
                        >
                          <UserPlus /> Assign
                        </Button>
                      </div>
                      {booking.assigned_staff_name && (
                        <p className="text-xs text-muted-foreground">
                          Currently assigned to{" "}
                          <span className="font-medium text-foreground">
                            {booking.assigned_staff_name}
                          </span>
                        </p>
                      )}
                    </div>

                    {!isTerminal && (
                      <div className="space-y-1.5">
                        <Label>Note / reason (for reject or cancel)</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional reason…"
                          rows={2}
                        />
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {canUpdate && !isTerminal && (
              <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 p-4">
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => action.mutate("approve")}
                  loading={action.isPending}
                  disabled={booking.status === "approved"}
                >
                  <Check /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => action.mutate("reject")}
                  loading={action.isPending}
                >
                  <X /> Reject
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => action.mutate("cancel")}
                  loading={action.isPending}
                >
                  <Ban /> Cancel
                </Button>
              </div>
            )}
            {isTerminal && (
              <div className="border-t border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                This booking is {humanize(booking.status).toLowerCase()} and can no longer be modified.
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
