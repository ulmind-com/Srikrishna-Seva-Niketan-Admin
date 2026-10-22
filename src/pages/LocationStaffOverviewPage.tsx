import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { staffAdminService } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Branch-wise staff overview.
 *
 * The same page serves both roles because the backend scopes the data: a
 * super admin gets every branch, while a branch manager gets only the
 * branches assigned to their account.
 */
export function LocationStaffOverviewPage() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.is_superuser);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["staff-location-stats"],
    queryFn: staffAdminService.statsByLocation,
  });

  const totals = stats.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      verified: acc.verified + s.verified,
      pending: acc.pending + s.pending,
    }),
    { total: 0, verified: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Staff by Branch</title>
      </Helmet>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff by Branch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Every branch across the organisation."
              : "The branches assigned to your account."}
          </p>
        </div>
        {totals.pending > 0 && (
          <Button asChild variant="outline">
            <Link to="/staff-verification">
              <Clock className="mr-2 h-4 w-4" />
              {totals.pending} awaiting review
            </Link>
          </Button>
        )}
      </div>

      {/* Roll-up */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Total staff" value={totals.total} />
        <SummaryCard
          icon={UserCheck}
          label="Verified"
          value={totals.verified}
          tone="success"
        />
        <SummaryCard
          icon={Clock}
          label="Awaiting review"
          value={totals.pending}
          tone="warning"
        />
      </div>

      {isLoading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No branches yet</p>
          <p className="text-sm text-muted-foreground">
            Add a branch first, then staff can register against it.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/locations">Manage branches</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.location_id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{s.location_name}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {s.city || "—"} · <span className="font-mono">{s.location_code}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold leading-none">{s.total}</p>
                  <p className="text-[11px] text-muted-foreground">staff</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="success">{s.verified} verified</Badge>
                {s.pending > 0 && <Badge variant="warning">{s.pending} pending</Badge>}
                {s.rejected > 0 && <Badge variant="danger">{s.rejected} returned</Badge>}
                {s.draft > 0 && <Badge variant="muted">{s.draft} incomplete</Badge>}
              </div>

              {/* Verified share */}
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{
                      width: `${s.total ? (s.verified / s.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {s.total
                    ? `${Math.round((s.verified / s.total) * 100)}% verified`
                    : "No staff registered yet"}
                </p>
              </div>

              <Button asChild variant="ghost" size="sm" className="mt-4 self-start">
                <Link to={`/employees?location_id=${s.location_id}`}>
                  Manage staff <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  const tones = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  } as const;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
