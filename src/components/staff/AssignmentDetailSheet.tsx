import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  MapPin,
  Phone,
  Clock,
  CalendarDays,
  CheckCircle2,
  Banknote,
  CreditCard,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staffPortalService, type StaffAssignment } from "@/services/staff-portal.service";
import { stopDutyAlert } from "@/hooks/useAssignmentAlerts";
import { AssignmentRouteMap } from "./AssignmentRouteMap";

const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};
const SHIFT_LABEL: Record<string, string> = {
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "Ongoing";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

interface Props {
  assignment: StaffAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full duty details for the nurse — no price of any kind — with a live
 * route map from their location to the customer.
 */
export function AssignmentDetailSheet({ assignment, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCollectOpen, setConfirmCollectOpen] = useState(false);

  const isPostpaid = assignment?.payment_type === "postpaid";
  const isCompleted = assignment?.status === "completed";
  const isPaymentCollected =
    assignment?.payment_status === "paid" || assignment?.payment_status === "received";
  const collectAmount = assignment?.collect_amount ?? 0;

  const collectPaymentMutation = useMutation({
    mutationFn: () => {
      if (!assignment) throw new Error("No duty selected");
      return staffPortalService.collectPayment(assignment.id);
    },
    onMutate: () => {
      setConfirmCollectOpen(false);
      if (assignment) {
        assignment.payment_status = "paid";
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(
        `✓ কাস্টমারের থেকে ₹${collectAmount.toLocaleString()} ক্যাশ সফলভাবে গ্রহণ হয়েছে!`,
        {
          description: "অটোমেটিক রিপোর্টে ক্যাশ রেকর্ড হিসেবে যুক্ত হয়েছে।",
        }
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not record payment. Please try again.");
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!assignment) throw new Error("No duty selected");
      return staffPortalService.completeAssignment(assignment.id, {
        cash_collected: isPostpaid && !isPaymentCollected,
      });
    },
    onMutate: () => {
      // 1. Instantly silence any ringing alarm
      stopDutyAlert();
      // 2. Close confirmation modal right away
      setConfirmOpen(false);
      // 3. Optimistic local update
      if (assignment) {
        assignment.status = "completed";
        if (isPostpaid) assignment.payment_status = "paid";
      }
    },
    onSuccess: () => {
      stopDutyAlert();
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
      qc.invalidateQueries({ queryKey: ["staff-pending-assignments"] });
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("✓ কাজ সম্পন্ন সফল হয়েছে! অফিসে রিপোর্ট সাবমিট হয়েছে।", {
        description: `Customer: ${assignment?.customer_name}. ধন্যবাদ!`,
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not complete assignment. Please try again.");
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl">
          {assignment && (
            <>
              <SheetHeader className="text-left border-b border-border pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <SheetTitle className="text-xl font-bold">{assignment.customer_name}</SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isPostpaid ? "secondary" : "default"}
                      className={
                        isPostpaid
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30 font-medium"
                          : "bg-cyan-500/15 text-cyan-500 border-cyan-500/30 font-medium"
                      }
                    >
                      {isPostpaid ? "Postpaid (ক্যাশ অন সার্ভিস)" : "Prepaid (অগ্রিম পরিশোধিত)"}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-semibold">
                        ✓ Done
                      </Badge>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Completion & Payment Status Banner */}
              <div className="mt-5">
                {isCompleted ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4.5 text-foreground flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-500 grid place-items-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-emerald-500">
                        কাজ সম্পন্ন হয়েছে (Duty Completed)
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isPostpaid
                          ? `কাস্টমারের থেকে ₹${collectAmount.toLocaleString()} ক্যাশ গ্রহণ করা হয়েছে এবং রিপোর্ট জেনারেট হয়েছে।`
                          : "অফিসের রেকর্ডে সফলভাবে রিপোর্ট সেভ করা হয়েছে।"}
                      </p>
                    </div>
                  </div>
                ) : isPostpaid ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4.5 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-500 grid place-items-center shrink-0">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                          Postpaid Duty — Cash Collection
                        </p>
                        <p className="text-xl font-bold text-foreground mt-0.5">
                          কাস্টমার থেকে ক্যাশ নেবেন:{" "}
                          <span className="text-amber-400">₹{collectAmount.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          সার্ভিসের পর কাস্টমারের থেকে ক্যাশ সংগ্রহ করে নিচের "টাকা গ্রহণ করেছি" বাটনে ক্লিক করুন। এরপর শিফট শেষ হলে "কাজ সম্পন্ন" বাটনে ক্লিক করবেন।
                        </p>
                      </div>
                    </div>

                    {isPaymentCollected ? (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-emerald-400 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span className="text-xs font-bold">
                            ✓ টাকা বুঝে পেয়েছি (₹{collectAmount.toLocaleString()} ক্যাশ রিসিভড)
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded">
                          রিপোর্টে সেভড
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Button
                          size="lg"
                          onClick={() => setConfirmCollectOpen(true)}
                          disabled={collectPaymentMutation.isPending}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/20 transition-all hover:scale-[1.01]"
                        >
                          {collectPaymentMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Banknote className="mr-2 h-4 w-4" />
                          )}
                          টাকা গ্রহণ করেছি (₹{collectAmount.toLocaleString()})
                        </Button>

                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setConfirmOpen(true)}
                          disabled={completeMutation.isPending}
                          className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold shadow-sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                          কাজ সম্পন্ন (Job Done)
                        </Button>
                      </div>
                    )}

                    {isPaymentCollected && (
                      <Button
                        size="lg"
                        onClick={() => setConfirmOpen(true)}
                        disabled={completeMutation.isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        কাজ সম্পন্ন (Mark Job Done)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4.5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-400 grid place-items-center shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                          Prepaid Duty — Payment Settled
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          কাস্টমার ইতিমধ্যে অফিসে পেমেন্ট পরিশোধ করেছেন।
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          আপনার কোনো টাকা নেওয়ার প্রয়োজন নেই। সার্ভিস শেষ হলে কাজ সম্পন্ন করুন।
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setConfirmOpen(true)}
                      className="w-full bg-gradient-to-r from-cyan-600 to-primary hover:from-cyan-700 hover:to-primary/90 text-white font-semibold shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.01]"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      কাজ সম্পন্ন (Mark Job Done)
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-5 divide-y divide-border">
                {assignment.customer_phone && (
                  <Row icon={Phone} label="Contact">
                    <a href={`tel:${assignment.customer_phone}`} className="text-primary hover:underline font-semibold">
                      {assignment.customer_phone}
                    </a>
                  </Row>
                )}
                <Row icon={MapPin} label="Posted at">
                  {PLACE_LABEL[assignment.place_type] ?? assignment.place_type}
                  {assignment.place_name ? ` — ${assignment.place_name}` : ""}
                </Row>
                {assignment.address && (
                  <Row icon={MapPin} label="Address">
                    {assignment.address}
                  </Row>
                )}
                <Row icon={CalendarClock} label="Period">
                  {fmtDate(assignment.start_date)} → {fmtDate(assignment.end_date)}
                </Row>
                {assignment.total_days != null && (
                  <Row icon={CalendarDays} label="Duration">
                    {assignment.total_days} day{assignment.total_days === 1 ? "" : "s"}
                    {assignment.days_remaining != null ? ` · ${assignment.days_remaining} left` : ""}
                  </Row>
                )}
                <Row icon={Clock} label="Shift">
                  {SHIFT_LABEL[assignment.shift] ?? assignment.shift}
                </Row>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold">Route to duty location</p>
                <AssignmentRouteMap assignment={assignment} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Collect Payment Dialog */}
      <Dialog open={confirmCollectOpen} onOpenChange={setConfirmCollectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-500" />
              টাকা গ্রহণ কনফার্মেশন (Receive Cash)
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/90 space-y-2">
              <div>
                আপনি কি নিশ্চিত যে কাস্টমার{" "}
                <span className="font-semibold text-primary">{assignment?.customer_name}</span>-এর কাছ থেকে{" "}
                <span className="font-bold text-amber-500">₹{collectAmount.toLocaleString()}</span> ক্যাশ হাতে বুঝে পেয়েছেন?
                <p className="text-xs text-muted-foreground mt-2">
                  কনফার্ম করলে এটি অফিসের ইনকাম রিপোর্ট এবং পেমেন্ট লিস্টে স্বয়ংক্রিয়ভাবে "Cash Collected" হিসেবে রেকর্ড হয়ে যাবে।
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmCollectOpen(false)}
              disabled={collectPaymentMutation.isPending}
            >
              বাতিল (Cancel)
            </Button>
            <Button
              onClick={() => collectPaymentMutation.mutate()}
              disabled={collectPaymentMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {collectPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {collectPaymentMutation.isPending ? "রেকর্ড হচ্ছে…" : "হ্যাঁ, ক্যাশ বুঝে পেয়েছি"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isPostpaid ? "টাকা রিসিভ ও কাজ সম্পন্ন কনফার্মেশন" : "কাজ সম্পন্ন কনফার্মেশন"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/90 space-y-2">
              {isPostpaid ? (
                <div>
                  আপনি কি নিশ্চিত যে কাস্টমার{" "}
                  <span className="font-semibold text-primary">{assignment?.customer_name}</span>-এর কাছ থেকে{" "}
                  <span className="font-bold text-amber-500">₹{collectAmount.toLocaleString()}</span> ক্যাশ বুঝে পেয়েছেন এবং ডিউটি সফলভাবে শেষ করেছেন?
                  <p className="text-xs text-muted-foreground mt-2">
                    কনফার্ম করলে এটি কোম্পানির রিপোর্টে পরিশোধিত ক্যাশ হিসেবে স্বয়ংক্রিয়ভাবে রেকর্ড হয়ে যাবে।
                  </p>
                </div>
              ) : (
                <div>
                  আপনি কি নিশ্চিত যে কাস্টমার{" "}
                  <span className="font-semibold text-primary">{assignment?.customer_name}</span>-এর ডিউটি কাজ সফলভাবে সম্পন্ন হয়েছে?
                  <p className="text-xs text-muted-foreground mt-2">
                    কনফার্ম করলে এটি প্রিপেইড সার্ভিস হিসেবে চূড়ান্ত রিপোর্টে রেকর্ড হয়ে যাবে।
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={completeMutation.isPending}>
              বাতিল (Cancel)
            </Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className={
                isPostpaid
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  : "bg-primary hover:bg-primary/90 text-white font-medium"
              }
            >
              {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {completeMutation.isPending ? "সেভ হচ্ছে…" : isPostpaid ? "হ্যাঁ, ক্যাশ পেয়েছি ও কাজ শেষ" : "হ্যাঁ, কাজ সম্পন্ন হয়েছে"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
