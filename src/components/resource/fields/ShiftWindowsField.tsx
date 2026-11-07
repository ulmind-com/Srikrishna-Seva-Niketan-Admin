import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface ShiftWindow {
  start?: string | null;
  end?: string | null;
}

/**
 * Edit a custom shift's time windows. One assignment can have several windows
 * (e.g. 6:00 AM–2:00 PM and 6:00 PM–10:00 PM) — add a row per window, each with
 * its own start and end. Overnight windows (end before start) are fine.
 */
export function ShiftWindowsField({
  value,
  onChange,
}: {
  value: ShiftWindow[] | null | undefined;
  onChange: (v: ShiftWindow[]) => void;
}) {
  const windows: ShiftWindow[] = value && value.length ? value : [{ start: "", end: "" }];

  const update = (i: number, patch: Partial<ShiftWindow>) => {
    const next = windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w));
    onChange(next);
  };
  const add = () => onChange([...windows, { start: "", end: "" }]);
  const remove = (i: number) => {
    const next = windows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [{ start: "", end: "" }]);
  };

  return (
    <div className="space-y-2">
      {windows.map((w, i) => (
        <div key={i} className="flex items-end gap-2 rounded-lg border border-border bg-muted/20 p-2">
          <div className="w-7 shrink-0 pb-2 text-center text-xs font-semibold text-muted-foreground">
            {i + 1}
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted-foreground">Start</label>
            <Input
              type="time"
              value={w.start ?? ""}
              onChange={(e) => update(i, { start: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted-foreground">End</label>
            <Input
              type="time"
              value={w.end ?? ""}
              onChange={(e) => update(i, { end: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mb-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
            aria-label="Remove shift window"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add shift time
      </Button>
    </div>
  );
}
