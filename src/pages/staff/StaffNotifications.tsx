import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CheckCheck, Loader2 } from "lucide-react";
import { staffPortalService } from "@/services/staff-portal.service";
import { Badge } from "@/components/ui/badge";

/** Relative "2h ago" style time for a notification. */
function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * The staff member's own live notification feed.
 *
 * Polls every 20s so a new duty assignment (or a status change made by the
 * office) appears here on its own, with an unread count the nurse can clear.
 */
export function StaffNotifications() {
  const qc = useQueryClient();

  const feed = useQuery({
    queryKey: ["staff-notifications"],
    queryFn: () => staffPortalService.notifications(),
    refetchInterval: 20_000,
  });

  const items = feed.data?.items ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => staffPortalService.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => staffPortalService.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-notifications"] }),
  });

  return (
    <section className="no-print rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-5 w-5 text-primary" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </div>
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {feed.isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No notifications yet. New duty assignments will appear here.
        </p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => !n.is_read && markRead.mutate(n.id)}
                className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-muted/40 ${
                  n.is_read ? "opacity-70" : ""
                }`}
              >
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.is_read && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
