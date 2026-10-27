import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AsyncOption {
  label: string;
  value: string;
}

/**
 * A searchable picker for API-backed options.
 *
 * Built for the lists that actually get long here — a branch with a hundred
 * nurses — and for the states a plain `<select>` hides: still loading, failed
 * to load, or genuinely empty. Each of those says so, instead of opening an
 * empty box that looks broken.
 */
export function AsyncSelect({
  value,
  onChange,
  options,
  isLoading = false,
  isError = false,
  onRetry,
  placeholder = "Select…",
  emptyMessage = "Nothing to choose from yet.",
  id,
}: {
  value?: string;
  onChange: (value: string) => void;
  options: AsyncOption[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  placeholder?: string;
  emptyMessage?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm",
            "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {isLoading && !options.length
              ? "Loading…"
              : (selected?.label ?? placeholder)}
          </span>
          {isLoading && !options.length ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        {/* Search */}
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-10 border-0 pl-9 focus-visible:ring-0"
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {isError ? (
            <div className="px-3 py-6 text-center">
              <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-danger" />
              <p className="text-sm font-medium">Could not load the list</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No match for “{query}”.
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                  opt.value === value
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    opt.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          )}
        </div>

        {!isLoading && !isError && options.length > 0 && (
          <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            {filtered.length} of {options.length}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
