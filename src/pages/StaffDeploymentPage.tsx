import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Activity,
  Building2,
  CalendarClock,
  ChevronDown,
  Inbox,
  Loader2,
  MapPin,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { staffAdminService } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AssignmentProgress,
  PLACE_LABEL,
} from "@/components/common/AssignmentProgress";
import type { Assignment, DeploymentBranch } from "@/types/models";

const SHIFT_LABEL: Record<string, string> = {
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

/**
 * Who is out on duty and who is still free — branch by branch.
 *
 * A super admin sees every branch; a branch manager sees only their own,
 * because the backend scopes the payload. The point of the screen is the
 * question managers actually ask: of my staff, how many are deployed, how
 * many are left, and when does each one come free again.
 */
export function StaffDeploymentPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-deployment"],
    queryFn: staffAdminService.deployment,
    staleTime: 30_000,
  });

  const totals = data?.totals;
  const branches = data?.branches ?? [];

  const deployedPct = totals?.total_staff
    ? Math.round((totals.assigned_count / totals.total_staff) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Staff Deployment</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Deployment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.is_superuser
              ? "Every branch — who is on duty, who is free, and how many days each engagement has left."
              : "Your branch — who is on duty, who is free, and how many days each engagement has left."}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff, customer, place…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Roll-up */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Staff" value={totals?.total_staff ?? 0} />
        <StatCard
          icon={Activity}
          label="On Duty"
          value={totals?.assigned_count ?? 0}
          tone="warning"
          hint={`${deployedPct}% deployed`}
        />
        <StatCard
          icon={UserCheck}
          label="Available"
          value={totals?.available_count ?? 0}
          tone="success"
          hint="Ready to assign"
        />
        <StatCard
          icon={Building2}
          label="Branches"
          value={totals?.branches ?? 0}
        />
      </div>

      {/* Org-wide deployment bar */}
      {!!totals?.total_staff && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium">Overall deployment</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {totals.assigned_count}
              </span>{" "}
              on duty ·{" "}
              <span className="font-semibold text-foreground">
                {totals.available_count}
              </span>{" "}
              available
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${deployedPct}%` }}
            />
          </div>
        </div>
      )}

      {branches.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No branches available</p>
          <p className="text-sm text-muted-foreground">
            {user?.is_superuser
              ? "Create a branch to start assigning staff."
              : "No branches are assigned to your manager account."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map((b) => (
            <BranchCard key={b.location_id} branch={b} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One branch: counts, a deployment bar, and the two staff lists. */
function BranchCard({
  branch,
  query,
}: {
  branch: DeploymentBranch;
  query: string;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"duty" | "free">("duty");

  const q = query.trim().toLowerCase();

  const assignments = useMemo(
    () =>
      q
        ? branch.assignments.filter((a) =>
            [a.employee_name, a.customer_name, a.place_name, PLACE_LABEL[a.place_type]]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          )
        : branch.assignments,
    [branch.assignments, q],
  );

  const freeStaff = useMemo(
    () =>
      q
        ? branch.available_staff.filter((s) =>
            [s.name, s.code, s.category].some((v) =>
              String(v).toLowerCase().includes(q),
            ),
          )
        : branch.available_staff,
    [branch.available_staff, q],
  );

  // Hide a branch entirely when a search matches nothing in it.
  if (q && assignments.length === 0 && freeStaff.length === 0) return null;

  const pct = branch.total_staff
    ? Math.round((branch.assigned_count / branch.total_staff) * 100)
    : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-muted/40"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{branch.location_name}</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              {branch.location_code}
            </Badge>
            {branch.city && (
              <span className="text-xs text-muted-foreground">{branch.city}</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {branch.assigned_count}/{branch.total_staff} deployed
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 gap-4 sm:flex">
          <Metric label="On duty" value={branch.assigned_count} tone="text-warning" />
          <Metric label="Free" value={branch.available_count} tone="text-success" />
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {/* Tabs */}
          <div className="mb-4 flex gap-1.5 rounded-xl bg-muted p-1">
            <TabButton
              active={tab === "duty"}
              onClick={() => setTab("duty")}
              label={`On Duty (${assignments.length})`}
            />
            <TabButton
              active={tab === "free"}
              onClick={() => setTab("free")}
              label={`Available (${freeStaff.length})`}
            />
          </div>

          {tab === "duty" ? (
            assignments.length === 0 ? (
              <EmptyRow text="Nobody from this branch is on duty right now." />
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <DutyRow key={a.id} a={a} />
                ))}
              </div>
            )
          ) : freeStaff.length === 0 ? (
            <EmptyRow text="Every staff member in this branch is deployed." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {freeStaff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {s.photo?.url ? (
                      <img
                        src={s.photo.url}
                        alt={s.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{s.category}</span> · {s.code}
                    </p>
                  </div>
                  <Badge variant="success" className="shrink-0 text-[10px]">
                    Free
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One deployed staff member — where they are and how long they have left. */
function DutyRow({ a }: { a: Assignment }) {
  return (
    <Link
      to="/assignments"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="min-w-[150px] flex-1">
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
        <CalendarClock className="mr-1 h-3 w-3" />
        {SHIFT_LABEL[a.shift] ?? a.shift}
      </Badge>

      <AssignmentProgress row={a} />
    </Link>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-card text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="text-right">
      <p className={`text-lg font-bold leading-none ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
  tone?: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-primary/10 text-primary";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
