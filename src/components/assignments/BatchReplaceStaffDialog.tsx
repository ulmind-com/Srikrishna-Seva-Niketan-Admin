import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  ArrowRight,
  Loader2,
  Stethoscope,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { resourceServices } from "@/services/resources";
import { describeError } from "@/services/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/types/models";
import { formatDate } from "@/lib/utils";

interface BatchReplaceStaffDialogProps {
  assignments: Assignment[];
  onClose: () => void;
  onSuccess?: () => void;
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function BatchReplaceStaffDialog({
  assignments,
  onClose,
  onSuccess,
}: BatchReplaceStaffDialogProps) {
  const qc = useQueryClient();

  const [effectiveDate, setEffectiveDate] = useState(() => getTodayIST());
  const [reason, setReason] = useState("");
  // Mapping of assignment.id -> newEmployeeId
  const [selectedReplacements, setSelectedReplacements] = useState<Record<string, string>>({});

  // 1. Load ALL staff across all branches (no restrictive location filter)
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["employees", "all-for-replace"],
    queryFn: () => resourceServices.employees.list({ page_size: 200 }),
    staleTime: 30_000,
  });

  // 2. Load branch names to show location tag
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

  const availableStaff = useMemo(() => {
    const list = staffData?.items ?? [];
    return list.filter((e) => (e.is_active ?? true));
  }, [staffData]);

  const customerName = assignments[0]?.customer_name || "Customer";

  const allAssigned = assignments.length > 0 && assignments.every((a) => Boolean(selectedReplacements[a.id]));

  const batchMutation = useMutation({
    mutationFn: () => {
      if (assignments.length === 0) throw new Error("No assignments selected");
      if (!effectiveDate) throw new Error("Please choose the effective replacement date");

      const payload = assignments.map((asg) => {
        const newEmpId = selectedReplacements[asg.id];
        if (!newEmpId) throw new Error(`Please select replacement for ${asg.employee_name}`);
        return {
          assignment_id: asg.id,
          new_employee_id: newEmpId,
          effective_date: effectiveDate,
          reason: reason.trim() || undefined,
        };
      });

      return resourceServices.assignments.batchReplace(payload);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });

      toast.success(`Successfully replaced ${data.count || assignments.length} staff members!`, {
        description: `Duty handed over from ${effectiveDate}. Consolidated single monthly bill will reflect all nurses.`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  if (assignments.length === 0) return null;

  return (
    <Dialog open={assignments.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Multi-Staff Duty Handover
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Batch Replace Staff ({assignments.length} জন নার্স একসাথে পরিবর্তন)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ক্লায়েন্ট <span className="font-semibold text-foreground">{customerName}</span>-এর অধীনে কর্মরত একাধিক নার্সকে একসাথে নতুন নার্স দিয়ে বদলি করুন।
          </DialogDescription>
        </DialogHeader>

        {/* Global Handover Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pb-1 border-b border-border/70">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Effective Handover Date (নতুন নার্সরা কোন তারিখ থেকে শুরু করবেন) *
            </Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Reason / Note (কারণ, যেমন: ছুটি / ইমারজেন্সি)
            </Label>
            <Input
              placeholder="e.g. Family emergency, staff leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Per-Nurse Replacement Selection */}
        <div className="space-y-3 py-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-primary" />
            Select Replacement Nurse for Each Active Staff:
          </Label>

          <div className="space-y-2.5">
            {assignments.map((asg, index) => {
              const currentNewEmpId = selectedReplacements[asg.id] || "";
              const selectedEmp = availableStaff.find((e) => e.id === currentNewEmpId);

              // Candidates for this assignment: exclude this nurse themselves
              const candidates = availableStaff.filter((e) => e.id !== asg.employee_id);

              return (
                <div
                  key={asg.id}
                  className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-sm text-foreground">
                        {asg.employee_name}
                      </span>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {asg.shift === "full_24h" ? "24 Hours Shift" : asg.shift}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Started: {formatDate(asg.start_date)}
                    </span>
                  </div>

                  {/* Dropdown to pick replacement staff */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Substitute Staff (নতুন স্থলাভিষিক্ত নার্স নির্বাচন করুন) *
                    </Label>
                    <Select
                      value={currentNewEmpId}
                      onValueChange={(id) => {
                        setSelectedReplacements((prev) => ({ ...prev, [asg.id]: id }));
                      }}
                    >
                      <SelectTrigger className="h-9 w-full bg-card">
                        <SelectValue
                          placeholder={
                            loadingStaff
                              ? "Loading staff members..."
                              : "Choose replacement nurse..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-[100] max-h-80 overflow-y-auto">
                        {candidates.map((emp) => {
                          const branch = branchMap[emp.location_id] || "";
                          const isSameBranch = emp.location_id === asg.location_id;
                          return (
                            <SelectItem key={emp.id} value={emp.id}>
                              <div className="flex items-center gap-2 py-0.5">
                                <span className="font-medium text-foreground">
                                  {emp.name}
                                </span>
                                {emp.code && (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    ({emp.code})
                                  </span>
                                )}
                                {emp.category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 px-1.5 capitalize"
                                  >
                                    {emp.category}
                                  </Badge>
                                )}
                                {branch && (
                                  <span className="text-[10px] text-muted-foreground/80">
                                    • {branch}
                                  </span>
                                )}
                                {isSameBranch && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1 text-emerald-400 border-emerald-500/30"
                                  >
                                    Same Branch
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick row preview */}
                  {selectedEmp && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium pt-1">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span>{asg.employee_name}</span>
                      <span className="text-muted-foreground">→ Handed over to</span>
                      <span className="font-semibold underline">{selectedEmp.name}</span>
                      <span className="text-muted-foreground">from {formatDate(effectiveDate)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary" />
              সিঙ্গেল কনসোলিডেটেড বিলের সুবিধা:
            </p>
            <p className="text-[11px]">
              ✓ নির্বাচিত সকল নার্সের বদলি একসাথে রেকর্ড হয়ে যাবে। কাস্টমারের জন্য একাধিক আলাদা বিল হবে না; একটাই মাসিক বিলে প্রতিটি নার্সের কাজের দিন ও টাকার হিসাব সুন্দরভাবে আলাদা আলাদা রো-তে যুক্ত থাকবে।
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={batchMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => batchMutation.mutate()}
            disabled={batchMutation.isPending || !allAssigned || !effectiveDate}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {batchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Confirm &amp; Replace All {assignments.length} Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
