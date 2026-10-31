import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  UserCheck,
  CheckCircle2,
  MessageSquare,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import type { Booking, BookingStatus } from "@/types/models";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onAssignDuty?: (booking: Booking) => void;
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

export function BookingDrawer({ booking, onClose, onAssignDuty }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("bookings:update");
  const [notes, setNotes] = useState("");
  const [staffName, setStaffName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
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

  const changeStatus = useMutation({
    mutationFn: (newStatus: BookingStatus) =>
      bookingService.changeStatus(booking!.id, newStatus),
    onSuccess: (_, newStatus) => {
      invalidate();
      toast.success(`Booking status changed to ${humanize(newStatus)}`);
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
              {booking.assigned_staff_name && (
                <div
                  className={`rounded-xl border p-3.5 flex flex-col gap-2 ${
                    booking.staff_acceptance_status === "accepted"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : booking.staff_acceptance_status === "declined"
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-lg ${
                          booking.staff_acceptance_status === "accepted"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : booking.staff_acceptance_status === "declined"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p
                          className={`text-[11px] font-semibold uppercase tracking-wider ${
                            booking.staff_acceptance_status === "accepted"
                              ? "text-emerald-400"
                              : booking.staff_acceptance_status === "declined"
                              ? "text-rose-400"
                              : "text-amber-400"
                          }`}
                        >
                          Assigned Nurse / Staff
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {booking.assigned_staff_name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        booking.staff_acceptance_status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : booking.staff_acceptance_status === "declined"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {booking.staff_acceptance_status === "accepted"
                        ? "✓ Nurse Accepted"
                        : booking.staff_acceptance_status === "declined"
                        ? "🚨 Nurse Declined"
                        : "⏳ Awaiting Nurse"}
                    </span>
                  </div>
                  {booking.staff_decline_reason && (
                    <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-2 text-xs text-rose-300">
                      <span className="font-bold uppercase tracking-wider text-[10px] block text-rose-400">
                        Decline Reason:
                      </span>
                      “{booking.staff_decline_reason}”
                    </div>
                  )}
                </div>
              )}

              {canUpdate && (
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Booking Status
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Syncs live with Super Admin &amp; Branch
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={booking.status}
                      onValueChange={(val) => changeStatus.mutate(val as BookingStatus)}
                      disabled={changeStatus.isPending}
                    >
                      <SelectTrigger className="h-9 flex-1 text-xs font-medium">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending (অপেক্ষারত)</SelectItem>
                        <SelectItem value="approved">Approved (অনুমোদিত)</SelectItem>
                        <SelectItem value="assigned">Assigned (নার্স নিযুক্ত)</SelectItem>
                        <SelectItem value="in_progress">In Progress (চলমান)</SelectItem>
                        <SelectItem value="completed">Completed (সম্পন্ন)</SelectItem>
                        <SelectItem value="cancelled">Cancelled (বাতিল)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Stethoscope} label="Service" value={booking.service_name} />
                <InfoRow icon={Calendar} label="Preferred date" value={formatDate(booking.preferred_date)} />
                <InfoRow icon={Clock} label="Preferred time" value={booking.preferred_time} />
                <InfoRow icon={User} label="Patient" value={`${booking.patient_name}${booking.patient_age ? `, ${booking.patient_age}` : ""}`} />
                <InfoRow icon={Phone} label="Phone" value={booking.contact_phone} />
                <InfoRow icon={CreditCard} label="Payment Method" value={booking.payment_type === "postpaid" ? "Postpaid (In-hand Cash)" : "Prepaid (Advance / Online)"} />
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

              {/* Customer Conversion & Duty Assignment Quick Action */}
              {canUpdate && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">
                          {booking.customer_id
                            ? "Customer Linked · Assign Duty"
                            : "1-Click Direct Duty Assignment"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {booking.customer_id
                            ? "Assign nurse and schedule shift for this customer."
                            : "Auto-registers patient with geocoded GPS pin and assigns nurse immediately."}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shrink-0"
                      onClick={() => {
                        if (onAssignDuty) {
                          onAssignDuty(booking);
                        } else {
                          onClose();
                          navigate(
                            booking.customer_id
                              ? `/assignments?action=new&customer_id=${booking.customer_id}`
                              : `/assignments?action=new`
                          );
                        }
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Assign Duty
                    </Button>
                  </div>
                </div>
              )}

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
              <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-4">
                {(booking.status === "assigned" || booking.status === "in_progress") && (
                  <Button
                    variant="outline"
                    className="w-full border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold shadow-xs"
                    onClick={() => changeStatus.mutate("completed")}
                    loading={changeStatus.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> কাজ সম্পন্ন (Mark Job Done)
                  </Button>
                )}
                <div className="flex flex-wrap gap-2">
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
