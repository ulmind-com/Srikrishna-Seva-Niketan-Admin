import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
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

  const [dutyCompleted, setDutyCompleted] = useState(true);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (assignment) {
      setDutyCompleted(true);
      setNote("Duty completed and confirmed by branch admin.");
    }
  }, [assignment]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("No assignment selected");
      return resourceServices.assignments.completeDuty(assignment.id, {
        cash_collected: false,
        cash_amount: 0,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["client-ledger"] });

      toast.success(
        `✓ ${assignment?.customer_name}-এর কাজ সম্পন্ন হয়েছে!`,
        {
          description:
            "ডিউটি স্ট্যাটাস Completed হয়েছে এবং স্টাফ পরবর্তী ডিউটির জন্য মুক্ত হয়েছে। পেমেন্ট সংগ্রহের জন্য Payments & Receipts ব্যবহার করুন।",
        }
      );
      onSuccess?.();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "ডিউটি আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
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
            <span>কাজ সম্পন্ন করুন (Mark Duty Completed)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ডিউটি শেষ হলে এখান থেকে কাজটি Completed হিসেবে চিহ্নিত করুন। ক্লায়েন্ট পেমেন্ট রিসিভ করতে Payments &amp; Receipts ব্যবহার করুন।
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
                {isPostpaid ? "Postpaid" : "Prepaid"}
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
                  ₹{(assignment.customer_rate || 0).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Completion confirmation */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5">
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
                  ডিউটি 'Completed' হয়ে যাবে এবং নার্স পরবর্তী ডিউটির জন্য 'Available' হিসেবে ফ্রি হয়ে যাবে।
                </p>
              </div>
            </div>
          </div>

          {/* Admin Note */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <PhoneCall className="h-3 w-3 text-primary" />
              <span>নোট / বিবরণ:</span>
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional completion note"
              className="h-8 text-xs"
            />
          </div>

          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              কনফার্ম করার সাথে সাথে ডিউটি রিপোর্ট ও কাস্টমার জেনারেটেড বিল আপডেট হয়ে যাবে।
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={completeMutation.isPending} className="h-9">
            বাতিল (Cancel)
          </Button>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || !dutyCompleted}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {completeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>কাজ সম্পন্ন করুন (Complete)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
