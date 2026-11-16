import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  ArrowRight,
  Loader2,
  Stethoscope,
  Sparkles,
  Users,
  Clock,
  Calendar,
  BellRing,
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
import { Badge } from "@/components/ui/badge";
import { SearchableStaffSelect } from "@/components/common/SearchableStaffSelect";
import type { Assignment, ShiftType } from "@/types/models";
import { formatDate } from "@/lib/utils";

interface BatchReplaceStaffDialogProps {
  assignments: Assignment[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface SingleReplacementState {
  newEmployeeId: string;
  shift: ShiftType;
  startTime: string;
  endTime: string;
  effectiveDate: string;
  endDate: string;
  reason: string;
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

  const todayStr = useMemo(() => getTodayIST(), []);
  const [globalDate, setGlobalDate] = useState(() => getTodayIST());
  const [globalReason, setGlobalReason] = useState("");

  // Per-assignment states
  const [replacements, setReplacements] = useState<Record<string, SingleReplacementState>>(() => {
    const init: Record<string, SingleReplacementState> = {};
    assignments.forEach((asg) => {
      const asgShift = (asg.shift || "full_24h") as ShiftType;
      init[asg.id] = {
        newEmployeeId: "",
        shift: asgShift,
        startTime: asg.start_time || (asgShift === "day" ? "08:00" : asgShift === "night" ? "20:00" : "08:00"),
        endTime: asg.end_time || (asgShift === "day" ? "20:00" : asgShift === "night" ? "08:00" : "20:00"),
        effectiveDate: todayStr,
        endDate: asg.end_date ? String(asg.end_date).slice(0, 10) : "",
        reason: "",
      };
    });
    return init;
  });

  // 1. Load ALL staff across all branches
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["employees", "all-for-replace"],
    queryFn: () => resourceServices.employees.list({ page_size: 300 }),
    staleTime: 30_000,
  });

  // 2. Load branch names
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

  const allStaff = useMemo(() => staffData?.items ?? [], [staffData]);

  const customerName = assignments[0]?.customer_name || "Customer";

  const allAssigned =
    assignments.length > 0 &&
    assignments.every((a) => Boolean(replacements[a.id]?.newEmployeeId));

  const handleGlobalDateChange = (date: string) => {
    setGlobalDate(date);
    setReplacements((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], effectiveDate: date };
      });
      return next;
    });
  };

  const handleGlobalReasonChange = (reason: string) => {
    setGlobalReason(reason);
    setReplacements((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], reason };
      });
      return next;
    });
  };

  const updateItem = (
    assignmentId: string,
    updates: Partial<SingleReplacementState>
  ) => {
    setReplacements((prev) => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] || {
          newEmployeeId: "",
          shift: "full_24h",
          startTime: "08:00",
          endTime: "20:00",
          effectiveDate: globalDate,
          endDate: "",
          reason: globalReason,
        }),
        ...updates,
      },
    }));
  };

  const batchMutation = useMutation({
    mutationFn: () => {
      if (assignments.length === 0) throw new Error("No assignments selected");

      const payload = assignments.map((asg) => {
        const item = replacements[asg.id];
        if (!item?.newEmployeeId) {
          throw new Error(`Please select replacement for ${asg.employee_name}`);
        }
        return {
          assignment_id: asg.id,
          new_employee_id: item.newEmployeeId,
          effective_date: item.effectiveDate || globalDate,
          end_date: item.endDate?.trim() || undefined,
          shift: item.shift,
          start_time: item.startTime?.trim() || undefined,
          end_time: item.endTime?.trim() || undefined,
          reason: item.reason?.trim() || globalReason.trim() || undefined,
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

      toast.success(
        `Successfully replaced ${data.count || assignments.length} staff members!`,
        {
          description: `Handover recorded. All replacement staff have been notified on their devices. Single consolidated bill maintained.`,
        }
      );
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Multi-Staff Duty Handover
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Batch Replace Staff ({assignments.length} জন নার্স একসাথে পরিবর্তন)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ক্লায়েন্ট <span className="font-semibold text-foreground">{customerName}</span>-এর অধীনে কর্মরত কর্মীদের জন্য নতুন নার্স দিয়ে বদলি ও সময়সূচী নির্ধারণ করুন।
          </DialogDescription>
        </DialogHeader>

        {/* Global Handover Settings */}
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Common Effective Date (সবার শুরুর তারিখ) *</span>
            </Label>
            <Input
              type="date"
              value={globalDate}
              onChange={(e) => handleGlobalDateChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Common Reason / Note (বদলি করার কারণ / নোট)
            </Label>
            <Input
              placeholder="e.g. Regular monthly shift rotation / emergency"
              value={globalReason}
              onChange={(e) => handleGlobalReasonChange(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Per-Nurse Replacement Selection */}
        <div className="space-y-4 py-2">
          <Label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4 text-primary" />
              Currently Active Staff &amp; Their Replacements (বর্তমানে কে আছে এবং কার জায়গায় কে আসবে):
            </span>
            {loadingStaff && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-normal">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading staff...
              </span>
            )}
          </Label>

          <div className="space-y-3.5">
            {assignments.map((asg, index) => {
              const item = replacements[asg.id] || {
                newEmployeeId: "",
                shift: (asg.shift || "full_24h") as ShiftType,
                startTime: asg.start_time || "08:00",
                endTime: asg.end_time || "20:00",
                effectiveDate: globalDate,
                endDate: asg.end_date ? String(asg.end_date).slice(0, 10) : "",
                reason: globalReason,
              };

              const selectedEmp = allStaff.find((e) => e.id === item.newEmployeeId);

              return (
                <div
                  key={asg.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs"
                >
                  {/* Current Active Staff Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        বর্তমানে: {asg.employee_name}
                      </span>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {asg.shift === "full_24h"
                          ? "24 Hours Shift"
                          : asg.shift === "day"
                          ? "Day Shift"
                          : asg.shift === "night"
                          ? "Night Shift"
                          : asg.shift}
                      </Badge>
                      {(asg.start_time || asg.end_time) && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded">
                          {asg.start_time || "08:00"} - {asg.end_time || "20:00"}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Started: {formatDate(asg.start_date)}
                    </span>
                  </div>

                  {/* Replacement Staff Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      ↳ Select Substitute Staff (নতুন স্থলাভিষিক্ত কর্মী নির্বাচন করুন) *
                    </Label>
                    <SearchableStaffSelect
                      staffList={allStaff}
                      value={item.newEmployeeId}
                      onChange={(id) => updateItem(asg.id, { newEmployeeId: id })}
                      branchMap={branchMap}
                      targetLocationId={asg.location_id}
                      excludeEmployeeIds={[asg.employee_id]}
                      placeholder={`Choose replacement for ${asg.employee_name}...`}
                    />
                  </div>

                  {/* Shift & Timing Selector for this replacement */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Shift
                      </Label>
                      <select
                        value={item.shift}
                        onChange={(e) => {
                          const newShift = e.target.value as ShiftType;
                          let sTime = item.startTime;
                          let eTime = item.endTime;
                          if (newShift === "day") {
                            sTime = "08:00";
                            eTime = "20:00";
                          } else if (newShift === "night") {
                            sTime = "20:00";
                            eTime = "08:00";
                          } else if (newShift === "full_24h") {
                            sTime = "08:00";
                            eTime = "08:00";
                          }
                          updateItem(asg.id, { shift: newShift, startTime: sTime, endTime: eTime });
                        }}
                        className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="full_24h">24 Hours Shift</option>
                        <option value="day">Day Shift (12h)</option>
                        <option value="night">Night Shift (12h)</option>
                        <option value="custom">Custom Timing</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => updateItem(asg.id, { startTime: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        End Time
                      </Label>
                      <Input
                        type="time"
                        value={item.endTime}
                        onChange={(e) => updateItem(asg.id, { endTime: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Effective Handover Preview */}
                  {selectedEmp && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-500 font-semibold pt-1">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      <span>{asg.employee_name}</span>
                      <span className="text-muted-foreground font-normal">→ Handed over to</span>
                      <span className="underline">{selectedEmp.name}</span>
                      <span className="text-muted-foreground font-normal">
                        ({item.shift}, {item.startTime}-{item.endTime}) from {formatDate(item.effectiveDate)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              স্বয়ংক্রিয় নোটিফিকেশন ও সিঙ্গেল বিলিং সুবিধা:
            </p>
            <p className="text-[11px] leading-relaxed">
              ✓ কনফার্ম করার সাথে সাথে প্রত্যেক নতুন নার্সের নিজস্ব স্টাফ পোর্টালে কাজের বিস্তারিত অ্যাসাইনমেন্ট নোটিফিকেশন ও রিংটোন বেজে উঠবে।
            </p>
            <p className="text-[11px] leading-relaxed">
              ✓ পূর্বের নার্সদের কাছেও হ্যান্ডওভার নোটিফিকেশন পৌঁছে যাবে। ক্লায়েন্টের জন্য একটাই কনসোলিডেটেড বিল জেনারেট হবে যেখানে সব নার্সদের কাজের সময় ও টাকার হিসাব সঠিকভাবে যুক্ত থাকবে।
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={batchMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => batchMutation.mutate()}
            disabled={batchMutation.isPending || !allAssigned}
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
