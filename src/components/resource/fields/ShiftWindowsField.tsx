import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, X } from "lucide-react";
import { todayIST } from "@/lib/ist-datetime";

export interface ShiftWindow {
  date?: string | null;
  start?: string | null;
  end?: string | null;
}

/**
 * Custom shift repeater: each entry has Start Date + Shift Start Time + Shift End Time,
 * plus a `+ Add shift` button so admins can add one or multiple dates / split shifts.
 */
export function ShiftWindowsField({
  value,
  onChange,
  defaultDate,
  minDate,
}: {
  value: ShiftWindow[] | null | undefined;
  onChange: (v: ShiftWindow[]) => void;
  defaultDate?: string;
  minDate?: string;
}) {
  const fallbackDate = defaultDate || todayIST();
  const windows: ShiftWindow[] =
    value && value.length
      ? value.map((w) => ({
          date: w.date ?? fallbackDate,
          start: w.start ?? "",
          end: w.end ?? "",
        }))
      : [{ date: fallbackDate, start: "07:00", end: "12:00" }];

  const update = (i: number, patch: Partial<ShiftWindow>) => {
    const next = windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w));
    onChange(next);
  };
  const add = () => {
    const last = windows[windows.length - 1];
    onChange([
      ...windows,
      { date: last?.date || fallbackDate, start: "", end: "" },
    ]);
  };
  const remove = (i: number) => {
    const next = windows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [{ date: fallbackDate, start: "", end: "" }]);
  };

  return (
    <div className="space-y-2.5">
      {windows.map((w, i) => (
        <div
          key={i}
          className="grid grid-cols-1 sm:grid-cols-[24px_1.2fr_1fr_1fr_36px] items-end gap-2 rounded-xl border border-border bg-muted/20 p-2.5"
        >
          <div className="hidden sm:block pb-2 text-center text-xs font-semibold text-muted-foreground">
            {i + 1}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Calendar className="h-3 w-3 text-primary" />
              Start Date (তারিখ)
            </label>
            <Input
              type="date"
              min={minDate}
              value={w.date ? String(w.date).slice(0, 10) : fallbackDate}
              onChange={(e) => update(i, { date: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3 text-primary" />
              Start Time (শুরু)
            </label>
            <Input
              type="time"
              value={w.start ?? ""}
              onChange={(e) => update(i, { start: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3 text-primary" />
              End Time (শেষ)
            </label>
            <Input
              type="time"
              value={w.end ?? ""}
              onChange={(e) => update(i, { end: e.target.value })}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive justify-self-end sm:justify-self-center"
            onClick={() => remove(i)}
            aria-label="Remove shift window"
            title="Remove row"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full sm:w-auto border-dashed border-primary/50 text-primary hover:bg-primary/10"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add Custom Shift
      </Button>
    </div>
  );
}
