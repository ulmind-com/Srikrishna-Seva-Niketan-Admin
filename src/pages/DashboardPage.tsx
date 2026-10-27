import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  CalendarCheck,
  Clock,
  Stethoscope,
  FileUser,
  Mail,
  ArrowRight,
  Plus,
  Users,
  IndianRupee,
  Activity,
  UserCheck,
  HeartPulse,
  TrendingUp,
  Building2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";
import { useAuth } from "@/contexts/AuthContext";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  BookingStatusChart,
  BookingsTrendChart,
} from "@/components/dashboard/DashboardCharts";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { env } from "@/config/env";
import { formatDate, formatCurrency, timeAgo } from "@/lib/utils";

const GENERAL_QUICK_ACTIONS = [
  { label: "Staff Directory", to: "/employees", icon: Users },
  { label: "Assignments / Shifts", to: "/assignments", icon: Activity },
  { label: "Payments & Revenue", to: "/payments", icon: IndianRupee },
  { label: "Bookings", to: "/bookings", icon: CalendarCheck },
  { label: "Verification Queue", to: "/staff-verification", icon: ShieldCheck },
  { label: "Medical Services", to: "/services", icon: Stethoscope },
];

const MANAGER_QUICK_ACTIONS = [
  { label: "Assign Staff to Duty", to: "/assignments", icon: Activity },
  { label: "Branch Staff Directory", to: "/employees", icon: Users },
  { label: "Record Payment", to: "/payments", icon: IndianRupee },
  { label: "Register New Staff", to: "/employees", icon: Plus },
  { label: "Patients & Customers", to: "/customers", icon: HeartPulse },
  { label: "Branch Reports", to: "/reports", icon: TrendingUp },
];

export function DashboardPage() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardService.stats(),
    refetchInterval: 30_000,
  });
  const chartsQuery = useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: () => dashboardService.charts(30),
  });
  const bookingsQuery = useQuery({
    queryKey: ["dashboard", "recent-bookings"],
    queryFn: () => dashboardService.recentBookings(6),
  });
  const contactsQuery = useQuery({
    queryKey: ["dashboard", "recent-contacts"],
    queryFn: () => dashboardService.recentContacts(5),
  });
  const applicationsQuery = useQuery({
    queryKey: ["dashboard", "recent-applications"],
    queryFn: () => dashboardService.recentApplications(5),
  });

  const stats = statsQuery.data;
  const isManagerScoped = Boolean(
    stats?.is_scoped || (!user?.is_superuser && (user?.location_ids?.length ?? 0) > 0)
  );

  // Cards for Branch Manager: focus on Staff, Working Staff, Revenue, Active Shifts
  const managerCards = stats
    ? [
        {
          label: "Total Staff in Branch",
          value: stats.staff?.total ?? 0,
          icon: <Users className="h-5 w-5" />,
          tone: "primary" as const,
          hint: `${stats.staff?.verified ?? 0} verified · ${stats.staff?.pending ?? 0} pending review`,
          to: "/employees",
        },
        {
          label: "Staff Working / On Duty",
          value: stats.staff?.working ?? 0,
          icon: <Activity className="h-5 w-5" />,
          tone: "success" as const,
          hint: "Active on-duty patient shifts",
          to: "/assignments",
        },
        {
          label: "Available Staff",
          value: stats.staff?.available ?? 0,
          icon: <UserCheck className="h-5 w-5" />,
          tone: "accent" as const,
          hint: "Ready for immediate deployment",
          to: "/employees",
        },
        {
          label: "Total Branch Revenue",
          value: formatCurrency(stats.revenue?.total ?? 0),
          icon: <IndianRupee className="h-5 w-5" />,
          tone: "success" as const,
          hint: `${stats.revenue?.payment_count ?? 0} engagements`,
          to: "/payments",
        },
        {
          label: "Active Shifts",
          value: stats.assignments?.active ?? 0,
          icon: <CalendarCheck className="h-5 w-5" />,
          tone: "primary" as const,
          hint: "Currently engaged patient shifts",
          to: "/assignments",
        },
        {
          label: "Active Patients",
          value: stats.customers?.active ?? 0,
          icon: <HeartPulse className="h-5 w-5" />,
          tone: "accent" as const,
          hint: "Patients receiving home care",
          to: "/customers",
        },
        {
          label: "Net Branch Profit",
          value: formatCurrency(stats.revenue?.profit ?? 0),
          icon: <TrendingUp className="h-5 w-5" />,
          tone: "warning" as const,
          hint: "Revenue minus local expenses",
          to: "/reports",
        },
        {
          label: "Staff Awaiting Review",
          value: stats.staff?.pending ?? 0,
          icon: <Clock className="h-5 w-5" />,
          tone: "warning" as const,
          hint: "Pending verification & ID card generation",
          to: "/staff-verification",
        },
      ]
    : [];

  // Cards for Super Admin: global enterprise view
  const adminCards = stats
    ? [
        {
          label: "Total Staff (All Branches)",
          value: stats.staff?.total ?? 0,
          icon: <Users className="h-5 w-5" />,
          tone: "primary" as const,
          hint: `${stats.staff?.verified ?? 0} verified across all locations`,
          to: "/employees",
        },
        {
          label: "Staff On Duty / Working",
          value: stats.staff?.working ?? 0,
          icon: <Activity className="h-5 w-5" />,
          tone: "success" as const,
          hint: "Active live assignments",
          to: "/assignments",
        },
        {
          label: "Total Organisation Revenue",
          value: formatCurrency(stats.revenue?.total ?? 0),
          icon: <IndianRupee className="h-5 w-5" />,
          tone: "success" as const,
          hint: `${stats.revenue?.payment_count ?? 0} total engagements`,
          to: "/payments",
        },
        {
          label: "Active Shifts",
          value: stats.assignments?.active ?? 0,
          icon: <CalendarCheck className="h-5 w-5" />,
          tone: "accent" as const,
          hint: "Ongoing patient engagements",
          to: "/assignments",
        },
        {
          label: "Total Bookings",
          value: stats.bookings?.total ?? 0,
          icon: <CalendarCheck className="h-5 w-5" />,
          tone: "primary" as const,
          hint: `${stats.bookings?.pending ?? 0} pending review`,
          to: "/bookings",
        },
        {
          label: "Pending Bookings",
          value: stats.bookings?.pending ?? 0,
          icon: <Clock className="h-5 w-5" />,
          tone: "warning" as const,
          hint: "Awaiting patient confirmation",
          to: "/bookings",
        },
        {
          label: "Job Applications",
          value: stats.applications ?? 0,
          icon: <FileUser className="h-5 w-5" />,
          tone: "accent" as const,
          hint: "Recruitment applicants",
          to: "/applications",
        },
        {
          label: "Active Services",
          value: stats.services ?? 0,
          icon: <Stethoscope className="h-5 w-5" />,
          tone: "success" as const,
          hint: "Catalogue services available",
          to: "/services",
        },
      ]
    : [];

  const activeCards = isManagerScoped ? managerCards : adminCards;
  const activeQuickActions = isManagerScoped ? MANAGER_QUICK_ACTIONS : GENERAL_QUICK_ACTIONS;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>
          {isManagerScoped ? "Branch Dashboard" : "Dashboard"} · {env.APP_NAME}
        </title>
      </Helmet>

      {/* Hero / Page Header with Location Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-card to-muted/30 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {isManagerScoped ? (
              <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {stats?.branch_names && stats.branch_names.length > 0
                  ? stats.branch_names.join(", ")
                  : "Assigned Location"}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-2.5 py-0.5">
                Headquarters Console
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Tracking
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] ?? "Manager"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isManagerScoped
              ? "Here is your branch live performance: registered staff, staff on duty, active shifts, and revenue."
              : "Here's what's happening across all locations and operations today."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManagerScoped ? (
            <Button asChild className="gap-2 shadow-sm">
              <Link to="/assignments">
                <Activity className="h-4 w-4" /> Manage Duty Shifts
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2 shadow-sm">
              <Link to="/bookings">
                View Bookings <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {statsQuery.isLoading ? (
        <CardsSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {activeCards.map((c, i) => (
            <StatCard key={c.label} {...c} index={i} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <Card className="border border-border">
        <CardContent className="flex flex-wrap items-center gap-2.5 p-4">
          <span className="flex items-center px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions:
          </span>
          {activeQuickActions.map((action) => (
            <Button key={action.label} variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <Link to={action.to}>
                <action.icon className="h-3.5 w-3.5 text-primary" /> {action.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* For Super Admin: Branch Performance Matrix */}
      {!isManagerScoped && stats?.branches_summary && stats.branches_summary.length > 0 && (
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-card/60 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" /> Branch Performance Matrix
              </CardTitle>
              <CardDescription>
                Compare staff deployment, active staff on duty, and revenue collected across each branch.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff-by-location">
                View Full Breakdown <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {stats.branches_summary.map((branch) => (
                <div key={branch.id} className="p-5 space-y-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-base text-foreground flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" /> {branch.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {branch.city || "—"} · <span className="font-mono">{branch.code}</span>
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {branch.code}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center border border-border/60">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Staff</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{branch.total_staff}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Working
                      </p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {branch.working_staff}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-sm font-bold text-foreground mt-1 truncate">
                        {formatCurrency(branch.revenue)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {branch.total_staff > 0
                        ? `${Math.round((branch.working_staff / branch.total_staff) * 100)}% deployed`
                        : "No staff assigned"}
                    </span>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary gap-1">
                      <Link to={`/employees?location_id=${branch.id}`}>
                        Manage Branch <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts (Trend & Breakdown) */}
      {chartsQuery.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[360px] rounded-xl xl:col-span-2" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
      ) : (
        chartsQuery.data && (
          <div className="grid gap-4 xl:grid-cols-3">
            <BookingsTrendChart data={chartsQuery.data.bookings_trend} />
            <BookingStatusChart data={chartsQuery.data.booking_status} />
          </div>
        )
      )}

      {/* Recent activity grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent bookings */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest booking requests</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bookings">
                All <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2">
            {bookingsQuery.isLoading ? (
              <ListSkeleton />
            ) : !bookingsQuery.data?.length ? (
              <EmptyState title="No bookings yet" description="New bookings will appear here." />
            ) : (
              <ul className="space-y-0.5">
                {bookingsQuery.data.map((b) => (
                  <li key={b.id}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.patient_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.service_name} · {formatDate(b.preferred_date)}
                        </p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Latest contacts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Latest Messages</CardTitle>
              <CardDescription>Contact form enquiries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/contact">
                All <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2">
            {contactsQuery.isLoading ? (
              <ListSkeleton />
            ) : !contactsQuery.data?.length ? (
              <EmptyState title="No messages yet" description="Contact messages will appear here." />
            ) : (
              <ul className="space-y-0.5">
                {contactsQuery.data.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.service_required ?? c.subject ?? c.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Latest applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Latest Job Applications</CardTitle>
              <CardDescription>Recent nurse and caregiver applicants</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">
                All <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2">
            {applicationsQuery.isLoading ? (
              <ListSkeleton />
            ) : !applicationsQuery.data?.length ? (
              <EmptyState
                icon={<Plus />}
                title="No applications yet"
                description="Job applications will appear here."
              />
            ) : (
              <ul className="grid gap-0.5 sm:grid-cols-2">
                {applicationsQuery.data.map((a) => (
                  <li key={a.id}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
                        <FileUser className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.job_title}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 px-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
