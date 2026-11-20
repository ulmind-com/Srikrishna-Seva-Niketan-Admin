import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Banknote,
  UserCheck,
  Loader2,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { resourceServices } from "@/services/resources";
import type { Assignment } from "@/types/models";
import { formatDate } from "@/lib/utils";

interface AdminCompleteDutyDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminCompleteDutyDialog({
  assignment,
  onClose,
  onSuccess,
}: AdminCompleteDutyDialogProps) {
  const qc = useQueryClient();

  const isPostpaid = assignment?.payment_type === "postpaid";
  const defaultAmount = assignment?.customer_rate ?? (assignment?.customer_daily_rate ? assignment.customer_daily_rate * (assignment.days_worked || 1) : 0);

  const [dutyCompleted, setDutyCompleted] = useState(true);
  const [cashCollected, setCashCollected] = useState(isPostpaid);
  const [cashAmount, setCashAmount] = useState<number>(defaultAmount);
  const [receivedBy, setReceivedBy] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (assignment) {
      setDutyCompleted(true);
      const isPost = assignment.payment_type === "postpaid";
      setCashCollected(isPost);
      const amt = assignment.customer_rate ?? (assignment.customer_daily_rate ? assignment.customer_daily_rate * (assignment.days_worked || 1) : 0);
      setCashAmount(amt);
      setReceivedBy(
        isPost
          ? `Staff: ${assignment.employee_name} (Confirmed via phone call)`
          : `Office Desk / Super Admin`
      );
      setNote(
        "Staff confirmed duty completion and cash settlement over phone (Keypad / Feature phone)."
      );
    }
  }, [assignment]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("No assignment selected");
      return resourceServices.assignments.completeDuty(assignment.id, {
        cash_collected: cashCollected,
        cash_amount: cashCollected ? Number(cashAmount) : 0,
        received_by: receivedBy.trim() || undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payroll"] });

      toast.success(
        `✓ ${assignment?.customer_name}-এর কাজ সম্পন্ন ও ক্যাশ আদায় সফলভাবে আপডেট হয়েছে!`,
        {
          description: cashCollected
            ? `₹${Number(cashAmount).toLocaleString()} ক্যাশ আদায় কোম্পানির রিপোর্ট ও পেমেন্ট লেজারে যুক্ত হয়েছে।`
            : "ডিউটি স্ট্যাটাস Completed হিসেবে সেট হয়েছে এবং স্টাফ মুক্ত হয়েছে।",
        }
      );
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "ডিউটি আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    },
  });

  if (!assignment) return null;

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border/80 text-foreground">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span>কাজ সম্পন্ন ও ক্যাশ আদায় (Super Admin)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            যে সকল স্টাফ কিপ্যাড ফোন ব্যবহার করেন বা অ্যাপ নেই, তাদের কাজের সমাপ্তি ও ক্যাশ রিসিভ এখান থেকে সরাসরি আপডেট করুন।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Duty Overview Card */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  {assignment.customer_name}
                </span>
              </div>
              <Badge
                variant={isPostpaid ? "secondary" : "default"}
                className={
                  isPostpaid
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]"
                }
              >
                {isPostpaid ? "Postpaid (In-hand Cash)" : "Prepaid (Office Advance)"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <div>
                <span className="text-muted-foreground/70">কর্মী / স্টাফ: </span>
                <strong className="text-foreground">{assignment.employee_name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground/70">শিফট: </span>
                <strong className="text-foreground capitalize">
                  {assignment.shift_label || assignment.shift}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground/70">শুরু: </span>
                <span className="font-mono text-foreground">{formatDate(assignment.start_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground/70">বিল মূল্য: </span>
                <strong className="text-emerald-500 font-bold">
                  ₹{(assignment.customer_rate || defaultAmount).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Checkboxes */}
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="duty-completed"
                checked={dutyCompleted}
                onCheckedChange={(c) => setDutyCompleted(Boolean(c))}
                className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <div className="space-y-0.5">
                <Label htmlFor="duty-completed" className="font-semibold text-foreground cursor-pointer">
                  কাজ সফলভাবে সম্পন্ন হয়েছে (Mark Duty as Completed)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  স্ট্যাটাস 'Completed' হয়ে যাবে এবং নার্স পরবর্তী ডিউটির জন্য 'Available' হিসেবে ফ্রি হয়ে যাবে।
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="cash-collected"
                  checked={cashCollected}
                  onCheckedChange={(c) => setCashCollected(Boolean(c))}
                  className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="cash-collected" className="font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-amber-500" />
                    <span>ক্যাশ টাকা বুঝে পেয়েছি (Cash Payment Received)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    পোস্টপেইড ক্যাশ পেমেন্ট সংগৃহীত হয়েছে এবং এটি কোম্পানির ফাইন্যান্সিয়াল লেজারে রেকর্ড হবে।
                  </p>
                </div>
              </div>

              {cashCollected && (
                <div className="mt-3 pl-6 space-y-2.5">
                  <div>
                    <Label className="text-[11px] font-medium text-foreground">
                      সংগৃহীত টাকার পরিমাণ (Cash Amount in INR) *
                    </Label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      min={0}
                      className="h-8 mt-1 font-semibold text-emerald-500"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-foreground">
                      কে টাকা রিসিভ করেছে (Received by)
                    </Label>
                    <Input
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="e.g. Staff Manoj Barman (Confirmed by Admin)"
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Note */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <PhoneCall className="h-3 w-3 text-primary" />
              <span>নোট / ফোন কল কনফার্মেশন বিবরণ:</span>
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Staff called from feature phone, confirmed patient handed over cash"
              className="h-8 text-xs"
            />
          </div>

          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              কনফার্ম করার সাথে সাথে ডিউটি রিপোর্ট, কাস্টমার মান্থলি বিল এবং ফাইন্যান্স লেজারে সব স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={completeMutation.isPending} className="h-9">
            বাতিল (Cancel)
          </Button>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || (!dutyCompleted && !cashCollected)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {completeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>কনফার্ম করুন (Confirm &amp; Update)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
