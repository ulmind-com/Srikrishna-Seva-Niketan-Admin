import { useState, useEffect } from "react";
import { Calendar, Clock, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShiftWindowsField, type ShiftWindow } from "./ShiftWindowsField";
import { cn } from "@/lib/utils";

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface DutyScheduleFieldProps {
  watch: (name?: string) => any;
  setValue: (name: string, value: any, options?: any) => void;
  register: any;
}

const SHIFT_OPTIONS = [
  { id: "full_24h", label: "24 Hours", sub: "২৪ ঘণ্টা", defStart: "08:00", defEnd: "08:00" },
  { id: "day", label: "Day", sub: "দিনের ডিউটি", defStart: "08:00", defEnd: "20:00" },
  { id: "night", label: "Night", sub: "রাতের ডিউটি", defStart: "20:00", defEnd: "08:00" },
  { id: "morning", label: "Morning", sub: "সকালের ডিউটি", defStart: "07:00", defEnd: "15:00" },
  { id: "custom", label: "Custom", sub: "কাস্টম শিফট", defStart: "08:00", defEnd: "20:00" },
];

export function DutyScheduleField({
  watch,
  setValue,
}: DutyScheduleFieldProps) {
  const currentShift = watch("shift") || "full_24h";
  const startDate = watch("start_date") || getTodayIST();
  const startTime = watch("start_time") || "08:00";
  const endDate = watch("end_date");
  const endTime = watch("end_time") || "20:00";
  const shiftWindows = watch("shift_windows") || [];

  // Track ON/OFF state for End Date & Time. If endDate has a value, default to ON.
  const [hasEndDate, setHasEndDate] = useState<boolean>(() => Boolean(endDate && String(endDate).trim()));

  // Ensure initial values in react-hook-form
  useEffect(() => {
    if (!watch("shift")) setValue("shift", "full_24h", { shouldDirty: false });
    if (!watch("start_date")) setValue("start_date", getTodayIST(), { shouldDirty: false });
    if (!watch("start_time")) setValue("start_time", "08:00", { shouldDirty: false });
    if (hasEndDate && !watch("end_time")) setValue("end_time", "20:00", { shouldDirty: false });
  }, []);

  const handleShiftChange = (shiftId: string) => {
    setValue("shift", shiftId, { shouldDirty: true });
    const opt = SHIFT_OPTIONS.find((s) => s.id === shiftId);
    if (opt) {
      setValue("start_time", opt.defStart, { shouldDirty: true });
      setValue("end_time", opt.defEnd, { shouldDirty: true });
    }
  };

  const handleToggleEndDate = () => {
    const nextState = !hasEndDate;
    setHasEndDate(nextState);
    if (!nextState) {
      setValue("end_date", null, { shouldDirty: true });
      setValue("end_time", null, { shouldDirty: true });
    } else {
      const defEnd = startDate || getTodayIST();
      setValue("end_date", defEnd, { shouldDirty: true });
      const opt = SHIFT_OPTIONS.find((s) => s.id === currentShift);
      setValue("end_time", opt?.defEnd || "20:00", { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
      {/* 1. Shift Selection Pills */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Duty Shift (কাজের শিফট) *</span>
          <span className="text-[11px] text-muted-foreground font-normal">
            শিফট নির্বাচন করুন (টাইম ও ঘড়ি পরিবর্তনযোগ্য)
          </span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SHIFT_OPTIONS.map((opt) => {
            const isSelected = currentShift === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleShiftChange(opt.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border text-xs text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/80 bg-background hover:bg-muted/50 text-foreground"
                )}
              >
                <span className="leading-tight">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Start Schedule: Calendar Date + Clock Time side by side */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>Start Schedule (কাজের শুরুর তারিখ ও সময়) *</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Start Date (ক্যালেন্ডার থেকে শুরুর তারিখ)
            </span>
            <Input
              type="date"
              value={startDate ? String(startDate).slice(0, 10) : ""}
              onChange={(e) => setValue("start_date", e.target.value, { shouldDirty: true })}
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
              value={startTime || "08:00"}
              onChange={(e) => setValue("start_time", e.target.value, { shouldDirty: true })}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* 3. End Schedule: Calendar Date + Clock Time with ON/OFF Switch */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>End Schedule (কাজের সমাপ্তির তারিখ ও সময়)</span>
          </Label>
          <button
            type="button"
            onClick={handleToggleEndDate}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer",
              hasEndDate
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border-border"
            )}
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
                value={endDate ? String(endDate).slice(0, 10) : ""}
                min={startDate ? String(startDate).slice(0, 10) : undefined}
                onChange={(e) => setValue("end_date", e.target.value, { shouldDirty: true })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" /> End Time (ক্লক / সমাপ্তির সময়)
              </span>
              <Input
                type="time"
                value={endTime || "20:00"}
                onChange={(e) => setValue("end_time", e.target.value, { shouldDirty: true })}
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

      {/* 4. Custom Shift Windows (Shown when shift == custom) */}
      {currentShift === "custom" && (
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Custom Shift Windows (স্প্লিট শিফট বা একাধিক সময়সূচী)
            </Label>
            <span className="text-[10px] text-muted-foreground">
              প্রয়োজনে একাধিক উইন্ডো যোগ করুন
            </span>
          </div>
          <ShiftWindowsField
            value={shiftWindows}
            onChange={(windows: ShiftWindow[]) =>
              setValue("shift_windows", windows, { shouldDirty: true })
            }
          />
        </div>
      )}
    </div>
  );
}
