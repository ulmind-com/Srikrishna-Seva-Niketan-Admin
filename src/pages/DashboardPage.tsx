import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Stethoscope,
  Package,
  FileUser,
  Newspaper,
  Mail,
  ArrowRight,
  Plus,
  ClipboardList,
} from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
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
import { env } from "@/config/env";
import { formatDate, timeAgo } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "New Service", to: "/services", icon: Stethoscope },
  { label: "Add Equipment", to: "/equipment", icon: Package },
  { label: "Write Article", to: "/blogs", icon: Newspaper },
  { label: "View Bookings", to: "/bookings", icon: CalendarCheck },
];

export function DashboardPage() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardService.stats(),
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

  const cards = stats
    ? [
        { label: "Total Bookings", value: stats.bookings.total, icon: <CalendarCheck />, tone: "primary" as const, hint: `${stats.bookings.pending} pending`, to: "/bookings" },
        { label: "Pending Bookings", value: stats.bookings.pending, icon: <Clock />, tone: "warning" as const, hint: "Awaiting review", to: "/bookings" },
        { label: "Completed", value: stats.bookings.completed, icon: <CheckCircle2 />, tone: "success" as const, hint: "Fulfilled bookings", to: "/bookings" },
        { label: "Services", value: stats.services, icon: <Stethoscope />, tone: "accent" as const, to: "/services" },
        { label: "Rental Requests", value: stats.rentals, icon: <ClipboardList />, tone: "primary" as const, to: "/rentals" },
        { label: "Applications", value: stats.applications, icon: <FileUser />, tone: "accent" as const, to: "/applications" },
        { label: "New Messages", value: stats.new_contacts, icon: <Mail />, tone: "warning" as const, to: "/contact" },
        { label: "Blog Posts", value: stats.blogs, icon: <Newspaper />, tone: "success" as const, to: "/blogs" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard · {env.APP_NAME}</title>
      </Helmet>

      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "Admin"} 👋`}
        description="Here's what's happening across your platform today."
        actions={
          <Button asChild>
            <Link to="/bookings">
              View bookings <ArrowRight />
            </Link>
          </Button>
        }
      />

      {/* Stat cards */}
      {statsQuery.isLoading ? (
        <CardsSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c, i) => (
            <StatCard key={c.label} {...c} index={i} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <span className="flex items-center px-1 text-sm font-medium text-muted-foreground">
            Quick actions:
          </span>
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.label} variant="outline" size="sm" asChild>
              <Link to={action.to}>
                <action.icon /> {action.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Charts */}
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
                All <ArrowRight />
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
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
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
              <CardDescription>Contact form submissions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/contact">
                All <ArrowRight />
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
              <CardTitle>Latest Applications</CardTitle>
              <CardDescription>Recent job applicants</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">
                All <ArrowRight />
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
