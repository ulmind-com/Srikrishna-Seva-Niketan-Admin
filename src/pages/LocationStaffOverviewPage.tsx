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
  Activity,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { staffAdminService } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

/**
 * Branch-wise staff & operational performance overview.
 *
 * Scoped automatically by backend:
 * - Super admin sees all branches with executive roll-up
 * - Branch manager sees only the branches assigned to their account
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
      working: acc.working + (s.working ?? 0),
      revenue: acc.revenue + (s.revenue ?? 0),
    }),
    { total: 0, verified: 0, pending: 0, working: 0, revenue: 0 },
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Branch Operations & Staff Overview</title>
      </Helmet>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Building2 className="h-4 w-4" /> Location Console
            </span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              Live Staff & Revenue
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Staff & Revenue by Branch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Every branch across the organisation with staff on duty and revenue collection."
              : "The branch(es) assigned to your manager account."}
          </p>
        </div>
        {totals.pending > 0 && (
          <Button asChild variant="outline" className="shadow-sm">
            <Link to="/staff-verification">
              <Clock className="mr-2 h-4 w-4 text-warning" />
              {totals.pending} awaiting review
            </Link>
          </Button>
        )}
      </div>

      {/* Top Roll-up Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Users} label="Total Registered Staff" value={totals.total} />
        <SummaryCard
          icon={Activity}
          label="Staff On Duty / Working"
          value={totals.working}
          tone="success"
          isLive
        />
        <SummaryCard
          icon={IndianRupee}
          label="Total Realised Revenue"
          value={formatCurrency(totals.revenue)}
          tone="success"
        />
        <SummaryCard
          icon={UserCheck}
          label="Verified Staff"
          value={totals.verified}
          tone="default"
        />
      </div>

      {isLoading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No branches available</p>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Add a branch first under Branches to get started."
              : "No branches are currently assigned to your manager account. Contact Super Admin."}
          </p>
          {isSuperAdmin && (
            <Button asChild variant="outline" className="mt-4">
              <Link to="/locations">Manage branches</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.location_id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-lg flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" /> {s.location_name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.city || "—"} · <span className="font-mono font-medium">{s.location_code}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s.location_code}
                  </Badge>
                </div>

                {/* Branch Key Metrics Grid */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center border border-border/60">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Staff Total</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{s.total}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Working
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {s.working ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Revenue</p>
                    <p className="text-xs font-bold text-foreground mt-2 truncate">
                      {formatCurrency(s.revenue ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <Badge variant="success" className="text-[11px]">{s.verified} verified</Badge>
                  {(s.working ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                      {s.working} on duty
                    </Badge>
                  )}
                  {s.pending > 0 && <Badge variant="warning" className="text-[11px]">{s.pending} pending</Badge>}
                  {s.rejected > 0 && <Badge variant="danger" className="text-[11px]">{s.rejected} returned</Badge>}
                  {s.draft > 0 && <Badge variant="muted" className="text-[11px]">{s.draft} incomplete</Badge>}
                </div>

                {/* Verified share progress bar */}
                <div className="mt-3.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{
                        width: `${s.total ? (s.verified / s.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {s.total
                        ? `${Math.round((s.verified / s.total) * 100)}% verified`
                        : "No staff registered yet"}
                    </span>
                    {s.total > 0 && (
                      <span>
                        {Math.round(((s.working ?? 0) / s.total) * 100)}% deployed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-border/80 flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary gap-1">
                  <Link to={`/assignments?location_id=${s.location_id}`}>
                    <Activity className="h-3.5 w-3.5" /> Duty Shifts
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Link to={`/employees?location_id=${s.location_id}`}>
                    Manage staff <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
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
  isLive = false,
}: {
  icon: any;
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning";
  isLive?: boolean;
}) {
  const tones = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
  } as const;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`grid h-12 w-12 place-items-center rounded-xl shrink-0 ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-2xl font-bold leading-none truncate text-foreground">{value}</p>
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}
