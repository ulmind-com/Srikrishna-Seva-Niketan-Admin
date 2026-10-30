import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** `YYYY-MM-DD` in local time. */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export interface Preset {
  id: string;
  label: string;
  getRange: () => { start: string; end: string };
}

const PRESETS: Preset[] = [
  {
    id: "today",
    label: "Today",
    getRange: () => {
      const now = toISO(new Date());
      return { start: now, end: now };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getRange: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const str = toISO(d);
      return { start: str, end: str };
    },
  },
  {
    id: "week",
    label: "This Week",
    getRange: () => {
      const now = new Date();
      const d = new Date(now);
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      d.setDate(d.getDate() - dow);
      return { start: toISO(d), end: toISO(now) };
    },
  },
  {
    id: "last7",
    label: "Last 7 Days",
    getRange: () => {
      const now = new Date();
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { start: toISO(d), end: toISO(now) };
    },
  },
  {
    id: "month",
    label: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toISO(start), end: toISO(now) };
    },
  },
  {
    id: "last_month",
    label: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toISO(start), end: toISO(end) };
    },
  },
  {
    id: "year",
    label: "This Year",
    getRange: () => {
      const now = new Date();
      return { start: `${now.getFullYear()}-01-01`, end: toISO(now) };
    },
  },
  {
    id: "all",
    label: "All Time",
    getRange: () => {
      return { start: "2024-01-01", end: toISO(new Date()) };
    },
  },
];

interface ReportDatePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string, presetId?: string) => void;
  activePreset?: string;
  className?: string;
}

export function ReportDatePicker({
  start,
  end,
  onChange,
  activePreset,
  className,
}: ReportDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(start);
  const [localEnd, setLocalEnd] = useState(end);

  const handlePresetClick = (preset: Preset) => {
    const r = preset.getRange();
    setLocalStart(r.start);
    setLocalEnd(r.end);
    onChange(r.start, r.end, preset.id);
    setOpen(false);
  };

  const handleApply = () => {
    if (localStart && localEnd) {
      onChange(localStart, localEnd, "custom");
      setOpen(false);
    }
  };

  // Human readable date formatting for trigger button
  const formatDisplay = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const currentPresetObj = PRESETS.find((p) => p.id === activePreset);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 border-border/80 bg-background/80 hover:bg-muted/60 text-xs font-medium shadow-xs",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          <span>
            {formatDisplay(start)} &ndash; {formatDisplay(end)}
          </span>
          {currentPresetObj && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {currentPresetObj.label}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0 shadow-xl" align="start">
        <div className="border-b border-border p-3 bg-muted/30">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            Select Date Range for Reports
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pick a quick preset or choose custom start and end dates.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-3 border-b border-border bg-background">
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{p.label}</span>
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        <div className="p-3 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Start Date
              </Label>
              <Input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                End Date
              </Label>
              <Input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground font-mono">
              {localStart} &rarr; {localEnd}
            </span>
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground"
              onClick={handleApply}
              disabled={!localStart || !localEnd}
            >
              Apply Range
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
