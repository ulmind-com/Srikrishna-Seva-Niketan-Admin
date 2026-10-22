import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DashboardCharts as ChartsData } from "@/types/models";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { humanize } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#33C4C7",
  in_progress: "#1F8E94",
  completed: "#10B981",
  rejected: "#EF4444",
  cancelled: "#6B7280",
};

interface TooltipEntry {
  name?: string;
  value?: number | string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-pop">
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-foreground">
          {entry.value} {entry.name}
        </p>
      ))}
    </div>
  );
}

export function BookingsTrendChart({ data }: { data: ChartsData["bookings_trend"] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: (() => {
      try {
        return format(parseISO(d.date), "dd MMM");
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <Card className="col-span-1 xl:col-span-2">
      <CardHeader>
        <CardTitle>Booking Trend</CardTitle>
        <CardDescription>New bookings over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#33C4C7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#33C4C7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#94A3B8"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#94A3B8"
                allowDecimals={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="bookings"
                stroke="#33C4C7"
                strokeWidth={2.5}
                fill="url(#bookingFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingStatusChart({
  data,
}: {
  data: ChartsData["booking_status"];
}) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const total = entries.reduce((sum, e) => sum + e.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Status</CardTitle>
        <CardDescription>Distribution by current state</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
            No booking data yet
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={entries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {entries.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? "#33C4C7"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {entries.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[entry.name] ?? "#33C4C7",
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {humanize(entry.name)}
                  </span>
                  <span className="ml-auto text-xs font-semibold text-foreground">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
