import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Moon,
  RefreshCw,
  Save,
  Search,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import {
  payrollService,
  type AttendanceStatus,
  type ShiftKind,
} from "@/services/payroll.service";
import type { Employee, Location } from "@/types/models";
import { describeError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: { key: AttendanceStatus; label: string; cls: string }[] = [
  { key: "present", label: "Present", cls: "bg-emerald-500 text-white border-emerald-500" },
  { key: "half_day", label: "Half", cls: "bg-amber-500 text-white border-amber-500" },
  { key: "absent", label: "Absent", cls: "bg-rose-600 text-white border-rose-600" },
  { key: "leave", label: "Leave", cls: "bg-rose-400 text-white border-rose-400" },
  { key: "off", label: "Off", cls: "bg-slate-500 text-white border-slate-500" },
];

const SHIFTS: { key: ShiftKind; label: string; icon: typeof Sun }[] = [
  { key: "day", label: "Day", icon: Sun },
  { key: "night", label: "Night", icon: Moon },
  { key: "full_24h", label: "24h", icon: Clock },
  { key: "custom", label: "Custom", icon: Clock },
];

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

interface Mark {
  status: AttendanceStatus | null;
  shift: ShiftKind;
  rate?: number | null;
}

/**
 * The daily attendance register — mark every staff member present / half-day /
 * on-leave / off for a chosen day. Leave and off days earn nothing, so they
 * flow straight through to the monthly payslip as unpaid off-dates.
 *
 * Backend scoping means a branch manager only sees and marks their own staff.
 */
export function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const [branch, setBranch] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["payroll-employees"],
    queryFn: () =>
      http.list<Employee>(endpoints.employees.root, {
        page_size: 100,
      }),
    staleTime: 60_000,
  });

  const { data: locData } = useQuery({
    queryKey: ["payroll-locations"],
    queryFn: () => http.list<Location>(endpoints.locations.root, { page_size: 100 }),
    staleTime: 300_000,
    enabled: !!user?.is_superuser,
  });

  const { data: roster, isFetching: rosterFetching } = useQuery({
    queryKey: ["attendance-day", date],
    queryFn: () => payrollService.dayRoster(date),
    staleTime: 3_000,
  });

  // Seed local marks from whatever is already recorded for the day.
  useEffect(() => {
    const seed: Record<string, Mark> = {};
    for (const r of roster?.records ?? []) {
      seed[r.employee_id] = { status: r.status, shift: r.shift, rate: r.pay_rate };
    }
    setMarks(seed);
  }, [roster, date]);

  const employees = empData?.items ?? [];
  const locations = locData?.items ?? [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => (branch === "all" ? true : e.location_id === branch))
      .filter((e) =>
        q
          ? [e.name, e.code, e.category, e.phone]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, branch, query]);

  // Live counts from the current (unsaved) marks across visible staff.
  const counts = useMemo(() => {
    const c = { present: 0, half_day: 0, absent: 0, leave: 0, off: 0, unmarked: 0 };
    for (const e of visible) {
      const s = marks[e.id]?.status;
      if (!s) c.unmarked += 1;
      else c[s] += 1;
    }
    return c;
  }, [visible, marks]);

  function setMark(empId: string, patch: Partial<Mark>) {
    setMarks((prev) => ({
      ...prev,
      [empId]: {
        status: prev[empId]?.status ?? null,
        shift: prev[empId]?.shift ?? "full_24h",
        rate: prev[empId]?.rate,
        ...patch,
      },
    }));
  }

  function setAll(status: AttendanceStatus) {
    setMarks((prev) => {
      const next = { ...prev };
      for (const e of visible) {
        next[e.id] = {
          status,
          shift: next[e.id]?.shift ?? "full_24h",
          rate: next[e.id]?.rate,
        };
      }
      return next;
    });
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const items = visible
        .filter((e) => marks[e.id]?.status)
        .map((e) => ({
          employee_id: e.id,
          status: marks[e.id].status as AttendanceStatus,
          shift: marks[e.id].shift,
        }));
      if (items.length === 0) return Promise.reject(new Error("Nothing to save — mark at least one staff member."));
      return payrollService.markBulk(date, items);
    },
    onSuccess: (res) => {
      toast.success(`Saved attendance for ${res.saved} staff`);
      qc.invalidateQueries({ queryKey: ["attendance-day", date] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const syncMut = useMutation({
    mutationFn: () => payrollService.syncFromAssignments(date),
    onSuccess: (res) => {
      toast.success(`Auto-marked ${res.created} from running duties`);
      qc.invalidateQueries({ queryKey: ["attendance-day", date] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Attendance</title>
      </Helmet>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark each staff member present, half-day, on leave or off for the day.
            Leave and off days are unpaid on the payslip.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
          >
            {syncMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Auto-fill from duties
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save attendance
          </Button>
        </div>
      </div>

      {/* Date bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setDate((d) => shiftDate(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{prettyDate(date)}</p>
            {date === today && <p className="text-[11px] text-muted-foreground">Today</p>}
          </div>
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" />
        {date !== today && (
          <Button variant="outline" onClick={() => setDate(today)}>Today</Button>
        )}
        <Button variant="outline" size="icon" aria-label="Next day" onClick={() => setDate((d) => shiftDate(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Staff</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{visible.length}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        {STATUSES.map((s) => (
          <div key={s.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{counts[s.key]}</p>
            {s.key === "off" && counts.unmarked > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">{counts.unmarked} unmarked</p>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff…" className="pl-9" />
        </div>
        {user?.is_superuser && locations.length > 0 && (
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setAll("present")}>All present</Button>
          <Button variant="outline" size="sm" onClick={() => setAll("off")}>All off</Button>
        </div>
      </div>

      {empLoading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={`overflow-hidden rounded-2xl border border-border bg-card ${rosterFetching ? "opacity-70" : ""}`}>
          <div className="divide-y divide-border">
            {visible.map((e) => {
              const m = marks[e.id];
              const needsShift = m?.status === "present" || m?.status === "half_day";
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {e.name.charAt(0)}
                  </div>
                  <div className="min-w-[150px] flex-1">
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.category}
                      {e.daily_rate ? ` · ₹${e.daily_rate}/day` : " · no rate set"}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    {STATUSES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setMark(e.id, { status: s.key })}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          m?.status === s.key ? s.cls : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-[120px]">
                    {needsShift ? (
                      <Select value={m?.shift ?? "full_24h"} onValueChange={(v) => setMark(e.id, { shift: v as ShiftKind })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SHIFTS.map((sh) => (
                            <SelectItem key={sh.key} value={sh.key}>{sh.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No staff match.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
