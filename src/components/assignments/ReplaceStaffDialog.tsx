import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  ArrowRight,
  Loader2,
  Stethoscope,
  Sparkles,
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
import {
  ShiftWindowsField,
  type ShiftWindow,
} from "@/components/resource/fields/ShiftWindowsField";
import type { Assignment, ShiftType } from "@/types/models";
import { formatDate } from "@/lib/utils";
import { calculateDutyScheduleIST, todayIST } from "@/lib/ist-datetime";

interface ReplaceStaffDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const getTodayIST = todayIST;

export function ReplaceStaffDialog({
  assignment,
  onClose,
  onSuccess,
}: ReplaceStaffDialogProps) {
  const qc = useQueryClient();

  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => getTodayIST());
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>("");
  const [shift, setShift] = useState<ShiftType>("full_24h");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [shiftWindows, setShiftWindows] = useState<ShiftWindow[]>([
    { date: getTodayIST(), start: "07:00", end: "12:00" },
  ]);
  const [reason, setReason] = useState("");

  // Initialize from existing assignment when opened
  useEffect(() => {
    if (assignment) {
      const today = getTodayIST();
      setEffectiveDate(today);
      const existingEnd = assignment.end_date ? String(assignment.end_date).slice(0, 10) : "";
      setEndDate(existingEnd);
      setHasEndDate(Boolean(existingEnd));
      const asgShift = (assignment.shift || "full_24h") as ShiftType;
      setShift(asgShift);

      if (assignment.shift_windows && assignment.shift_windows.length > 0) {
        setShiftWindows(
          assignment.shift_windows.map((w) => ({
            date: (w as ShiftWindow).date || today,
            start: w.start || "07:00",
            end: w.end || "12:00",
          }))
        );
      } else {
        setShiftWindows([{ date: today, start: "07:00", end: "12:00" }]);
      }

      const effStart =
        assignment.start_time ||
        (asgShift === "night"
          ? "20:00"
          : asgShift === "morning"
            ? "07:00"
            : "08:00");
      setStartTime(effStart);

      if (assignment.end_time) setEndTime(assignment.end_time);
      else if (asgShift === "full_24h") setEndTime(effStart);
      else if (asgShift === "day") setEndTime("20:00");
      else if (asgShift === "night") setEndTime("08:00");
      else if (asgShift === "morning") setEndTime("15:00");
    }
  }, [assignment]);

  // Load ALL active staff across the entire agency (page_size: 100 within backend limits)
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["employees", "all-for-replace"],
    queryFn: () => resourceServices.employees.list({ page_size: 100 }),
    staleTime: 30_000,
  });

  // Load branches to show location tag for each staff
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

  const selectedNewEmp = useMemo(
    () => allStaff.find((e) => e.id === newEmployeeId),
    [allStaff, newEmployeeId]
  );

  // Auto-fill timings when shift changes
    const handleShiftChange = (newShift: ShiftType) => {
    setShift(newShift);
    if (newShift === "day") {
      setStartTime("08:00");
      setEndTime("20:00");
    } else if (newShift === "night") {
      setStartTime("20:00");
      setEndTime("08:00");
    } else if (newShift === "morning") {
      setStartTime("07:00");
      setEndTime("15:00");
    } else if (newShift === "full_24h") {
      setStartTime("08:00");
      setEndTime("08:00");
    } else if (newShift === "custom") {
      setStartTime("08:00");
      setEndTime("20:00");
      const base = effectiveDate || getTodayIST();
      setShiftWindows((prev) =>
        prev.length ? prev.map((w) => ({ ...w, date: w.date || base })) : [{ date: base, start: "07:00", end: "12:00" }]
      );
    }
  };

  // Compute handoff summary dates + live IST duty day counts
  const handoffDates = useMemo(() => {
    if (!assignment || !effectiveDate) return null;
    const prevSummary = calculateDutyScheduleIST({
      startDate: String(assignment.start_date).slice(0, 10),
      endDate: effectiveDate,
      startTime: assignment.start_time || "08:00",
      endTime: startTime,
      shift: assignment.shift,
      dutyBreaks: assignment.duty_breaks,
      shiftWindows: assignment.shift_windows,
      isHandover: true,
    });
    const newSummary =
      hasEndDate && endDate
        ? calculateDutyScheduleIST({
            startDate: effectiveDate,
            endDate,
            startTime,
            endTime,
            shift,
            shiftWindows: shift === "custom" ? shiftWindows : undefined,
          })
        : null;
    return {
      prevEnd: effectiveDate,
      newStart: effectiveDate,
      newEnd: hasEndDate && endDate ? endDate : "Ongoing (চলমান — প্রতি মাসে বিলিং)",
      prevDays: prevSummary?.days ?? null,
      newDays: newSummary?.days ?? null,
    };
  }, [assignment, effectiveDate, hasEndDate, endDate, startTime, endTime, shift, shiftWindows]);

  const replaceMutation = useMutation({
    mutationFn: () => {
      if (!assignment) throw new Error("No assignment selected");
      if (!newEmployeeId) throw new Error("Please select the replacement staff member");
      if (!effectiveDate) throw new Error("Please choose the start date (শুরুর তারিখ)");
      if (hasEndDate && !endDate) throw new Error("Please choose the end date (শেষের তারিখ)");

      const isCustom = shift === "custom";
      const validWindows = isCustom
        ? shiftWindows.filter((w) => w.date || w.start || w.end)
        : undefined;

      return resourceServices.assignments.replaceStaff(assignment.id, {
        new_employee_id: newEmployeeId,
        effective_date: effectiveDate,
        end_date: hasEndDate && endDate.trim() ? endDate.trim() : null,
        shift: shift,
        start_time: startTime.trim() || undefined,
        end_time: hasEndDate || isCustom ? (endTime.trim() || undefined) : null,
        shift_windows: isCustom && validWindows?.length ? validWindows : undefined,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });

      toast.success("Staff replaced successfully!", {
        description: `Duty handed over to ${selectedNewEmp?.name || "replacement nurse"} (${effectiveDate} to ${endDate}). Instant alert delivered to staff portal.`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  if (!assignment) return null;

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Duty Handover &amp; Staff Replacement
          </div>
          <DialogTitle className="text-xl font-bold">
            Replace Staff (স্টাফ পরিবর্তন / নতুন অ্যাসাইন)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign a substitute nurse/attendant for{" "}
            <span className="font-semibold text-foreground">
              {assignment.customer_name}
            </span>
            . The client's monthly bill will automatically consolidate both attendants with their exact timings and dates.
          </DialogDescription>
        </DialogHeader>

        {/* 1. Currently Active Staff Details */}
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Stethoscope className="h-4 w-4 text-primary" />
              <span>বর্তমানে কর্মরত: {assignment.employee_name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[11px] font-mono capitalize">
                {assignment.shift === "full_24h"
                  ? "24 Hours Shift"
                  : assignment.shift === "day"
                  ? "Day Shift"
                  : assignment.shift === "night"
                  ? "Night Shift"
                  : assignment.shift}
              </Badge>
              {(assignment.start_time || assignment.end_time) && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {assignment.start_time || "08:00"} - {assignment.end_time || "20:00"}
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/60">
            <div>
              <span className="font-medium text-foreground">Started Date: </span>
              {formatDate(assignment.start_date)}
            </div>
            <div>
              <span className="font-medium text-foreground">Scheduled End: </span>
              {assignment.end_date ? formatDate(assignment.end_date) : "Ongoing"}
            </div>
          </div>
        </div>

        {/* 2. Form Controls */}
        <div className="space-y-4 py-1">
          {/* Replacement Staff Selector using SearchableStaffSelect */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Select Replacement Staff (নতুন স্টাফ নির্বাচন করুন) *</span>
              {loadingStaff && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-normal">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading staff...
                </span>
              )}
            </Label>
            <SearchableStaffSelect
              staffList={allStaff}
              value={newEmployeeId}
              onChange={(id) => setNewEmployeeId(id)}
              branchMap={branchMap}
              targetLocationId={assignment.location_id}
              excludeEmployeeIds={[assignment.employee_id]}
              placeholder="Search or choose available replacement staff..."
            />
          </div>

          {/* Shift & Schedule Configuration */}
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 space-y-3.5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Shift (নতুন স্টাফের কাজের শিফট) *
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  ক্লক থেকে যেকোনো সময় সেট করতে পারেন
                </span>
              </Label>

              {/* Shift Type Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "full_24h", label: "24 Hours", sub: "২৪ ঘণ্টা" },
                  { id: "day", label: "Day Shift", sub: "দিনের ডিউটি" },
                  { id: "night", label: "Night Shift", sub: "রাতের ডিউটি" },
                  { id: "custom", label: "Custom Shift", sub: "কাস্টম উইন্ডোজ" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleShiftChange(opt.id as ShiftType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs text-center transition-all ${
                      shift === opt.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/80 bg-background hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Schedule: Calendar + Clock */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Effective Start Schedule (শুরুর তারিখ ও সময়) *</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> Start Date (ক্যালেন্ডার থেকে শুরুর তারিখ)
                  </span>
                  <Input
                    type="date"
                    value={effectiveDate}
                    min={String(assignment.start_date).slice(0, 10)}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" /> Start Time (ক্লক / কখন থেকে কাজ শুরু)
                  </span>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const next = e.target.value;
                      const prev = startTime;
                      setStartTime(next);
                      if (shift === "full_24h" && (!endTime || endTime === prev)) {
                        setEndTime(next);
                      }
                    }}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* End Schedule: Calendar + Clock with ON/OFF switch */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>End Schedule (কাজের সমাপ্তির তারিখ ও সময়)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hasEndDate;
                    setHasEndDate(next);
                    if (!next) {
                      setEndDate("");
                    } else if (!endDate) {
                      setEndDate(effectiveDate);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    hasEndDate
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border-border"
                  }`}
                >
                  <span>{hasEndDate ? "ON (নির্দিষ্ট সমাপ্তি)" : "OFF (অনির্দিষ্টকাল)"}</span>
                </button>
              </div>

              {hasEndDate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" /> End Date (ক্যালেন্ডার থেকে শেষ তারিখ)
                    </span>
                    <Input
                      type="date"
                      value={endDate}
                      min={effectiveDate}
                      required
                      placeholder="Select end date"
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-primary" /> End Time (ক্লক / সমাপ্তির সময়)
                    </span>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/60 p-2.5 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                    <UserCheck className="h-3.5 w-3.5" />
                    Ongoing / চলমান ডিউটি (মাসিক বিলিং)
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    কাজের কোনো নির্দিষ্ট শেষ তারিখ নেই, অনির্দিষ্টকাল চলমান থাকবে এবং প্রতি মাসের শেষে বিল তৈরি হবে।
                  </p>
                </div>
              )}
            </div>

            {/* Custom Shift Windows (ONLY when shift == custom) */}
            {shift === "custom" && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Custom Shift Windows (তারিখ, শুরু ও শেষের সময়)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    + বাটনে ক্লিক করে আরও শিফট যোগ করুন
                  </span>
                </div>
                <ShiftWindowsField
                  value={shiftWindows}
                  onChange={(windows) => setShiftWindows(windows)}
                  defaultDate={effectiveDate || getTodayIST()}
                  minDate={String(assignment.start_date).slice(0, 10)}
                />
              </div>
            )}
          </div>

          {/* Reason / Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Reason / Note (কারণ, যেমন: ছুটি / ইমারজেন্সি)
            </Label>
            <Input
              placeholder="e.g. Family emergency, staff medical leave, duty handover"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Handover Timeline Preview */}
          {handoffDates && selectedNewEmp && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 text-xs space-y-2 text-foreground">
              <div className="font-bold text-primary flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> Duty Handover Mapping (কার জায়গায় কে আসছে):
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    1. {assignment.employee_name} (Previous Nurse):
                  </span>
                  <span>
                    {formatDate(assignment.start_date)} → {formatDate(handoffDates.prevEnd)} ({startTime})
                    {handoffDates.prevDays != null ? ` · ${handoffDates.prevDays}d` : ""} (Completed / Handed Over)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  <span>2. {selectedNewEmp.name} (New Replacement):</span>
                  <span>
                    {formatDate(handoffDates.newStart)} ({startTime}) → {hasEndDate && endDate ? `${formatDate(endDate)} (${endTime})${handoffDates.newDays != null ? ` · ${handoffDates.newDays}d` : ""}` : "Ongoing (চলমান ডিউটি)"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground pl-6 text-[11px]">
                  <span>Shift: <strong className="text-foreground capitalize">{shift}</strong></span>
                  <span>Time: <strong className="text-foreground">{startTime} - {endTime}</strong></span>
                </div>
              </div>

              <div className="pt-2 border-t border-primary/20 flex items-center gap-2 text-[11px] text-muted-foreground">
                <BellRing className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  কনফার্ম করার সাথে সাথে <strong>{selectedNewEmp.name}</strong>-এর অ্যাপ প্রোফাইলে অ্যালার্ম ও নোটিফিকেশন পৌঁছে যাবে।
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={replaceMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => replaceMutation.mutate()}
            disabled={replaceMutation.isPending || !newEmployeeId || !effectiveDate || (hasEndDate && !endDate)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {replaceMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Confirm &amp; Replace Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
