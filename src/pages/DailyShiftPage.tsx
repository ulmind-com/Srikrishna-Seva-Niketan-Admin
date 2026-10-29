import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MapPin,
  Moon,
  Search,
  Sun,
  Clock,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { staffAdminService } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AssignmentProgress,
  PLACE_LABEL,
} from "@/components/common/AssignmentProgress";
import type { Assignment, DailyRosterBranch } from "@/types/models";

const SHIFTS = [
  { key: "day", label: "Day", icon: Sun },
  { key: "night", label: "Night", icon: Moon },
  { key: "full_24h", label: "24 Hours", icon: Clock },
  { key: "custom", label: "Custom", icon: Clock },
] as const;

const SHIFT_LABEL: Record<string, string> = Object.fromEntries(
  SHIFTS.map((s) => [s.key, s.label]),
);

/** `YYYY-MM-DD` for a Date, formatted in IST (Asia/Kolkata). */
function toISODate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The day's shift register — pick a date, see every staff member on duty that
 * day, which shift they are on and where they are posted.
 *
 * Super admins see all branches; a branch manager sees only their own, because
 * the backend scopes the roster.
 */
export function DailyShiftPage() {
  const { user } = useAuth();
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["daily-roster", date],
    queryFn: () => staffAdminService.dailyRoster(date),
    staleTime: 5_000,
    refetchInterval: 8_000,
  });

  const totals = data?.totals;
  const branches = data?.branches ?? [];
  const byShift = totals?.by_shift ?? {};

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Daily Shifts</title>
      </Helmet>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Shifts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.is_superuser
            ? "Everyone on duty on a given day, across all branches."
            : "Everyone on duty on a given day in your branch."}
        </p>
      </div>

      {/* Date bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          onClick={() => setDate((d) => shiftDate(d, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{prettyDate(date)}</p>
            {date === today && (
              <p className="text-[11px] text-muted-foreground">Today</p>
            )}
          </div>
        </div>

        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-auto"
        />

        {date !== today && (
          <Button variant="outline" onClick={() => setDate(today)}>
            Today
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          onClick={() => setDate((d) => shiftDate(d, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Shift summary / filter */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setShift(null)}
          className={`rounded-2xl border p-4 text-left transition ${
            shift === null
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">On Duty</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {totals?.on_duty ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                across {totals?.branches ?? 0} branch
                {(totals?.branches ?? 0) === 1 ? "" : "es"}
              </p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </button>

        {SHIFTS.filter((s) => s.key !== "custom" || byShift.custom).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setShift((cur) => (cur === s.key ? null : s.key))}
            className={`rounded-2xl border p-4 text-left transition ${
              shift === s.key
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {byShift[s.key] ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {shift === s.key ? "Filtering" : "Tap to filter"}
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff, customer, place…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : branches.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No shifts on this day</p>
          <p className="text-sm text-muted-foreground">
            Nobody is scheduled for {prettyDate(date)}.
          </p>
        </div>
      ) : (
        <div className={`space-y-4 ${isFetching ? "opacity-60" : ""}`}>
          {branches.map((b) => (
            <BranchRoster
              key={b.location_id}
              branch={b}
              shift={shift}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchRoster({
  branch,
  shift,
  query,
}: {
  branch: DailyRosterBranch;
  shift: string | null;
  query: string;
}) {
  const q = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      branch.assignments
        .filter((a) => (shift ? a.shift === shift : true))
        .filter((a) =>
          q
            ? [a.employee_name, a.customer_name, a.place_name, PLACE_LABEL[a.place_type]]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
            : true,
        ),
    [branch.assignments, shift, q],
  );

  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{branch.location_name}</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              {branch.location_code}
            </Badge>
          </div>
          {branch.city && (
            <p className="text-xs text-muted-foreground">{branch.city}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {rows.length} on duty
        </Badge>
      </div>

      <div className="divide-y divide-border">
        {rows.map((a) => (
          <ShiftRow key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

function ShiftRow({ a }: { a: Assignment }) {
  const Icon = SHIFTS.find((s) => s.key === a.shift)?.icon ?? Clock;

  return (
    <Link
      to="/assignments"
      className="flex flex-wrap items-center gap-3 p-3 transition hover:bg-muted/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
        {a.employee_name.charAt(0)}
      </div>

      <div className="min-w-[140px] flex-1">
        <p className="text-sm font-medium">{a.employee_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          → {a.customer_name}
        </p>
      </div>

      <div className="min-w-[140px] flex-1">
        <p className="flex items-center gap-1 text-xs text-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          {PLACE_LABEL[a.place_type] ?? "—"}
        </p>
        {a.place_name && (
          <p className="truncate pl-4 text-xs text-muted-foreground">
            {a.place_name}
          </p>
        )}
      </div>

      <Badge variant="outline" className="shrink-0 text-[10px]">
        <Icon className="mr-1 h-3 w-3" />
        {SHIFT_LABEL[a.shift] ?? a.shift}
      </Badge>

      <AssignmentProgress row={a} />
    </Link>
  );
}
