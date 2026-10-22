import { Link } from "react-router-dom";
import { Bell, CheckCheck, Calendar, Mail, FileUser, Package, Info, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useNotificationActions,
  useNotifications,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { timeAgo, cn } from "@/lib/utils";
import type { NotificationItem } from "@/types/models";

const ICONS: Record<string, typeof Bell> = {
  booking: Calendar,
  contact: Mail,
  application: FileUser,
  rental: Package,
  enquiry: ShieldAlert,
  system: Info,
};

export function NotificationsPopover() {
  const { data: unread = 0 } = useUnreadCount();
  const { data } = useNotifications();
  const { markRead, markAllRead } = useNotificationActions();
  const items = data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-accent">
                {unread} new
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState
              icon={<Bell />}
              title="You're all caught up"
              description="New activity will show up here."
            />
          ) : (
            items.map((n: NotificationItem, i) => {
              const Icon = ICONS[n.type] ?? Info;
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    !n.is_read && "bg-primary/[0.04]"
                  )}
                >
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </motion.button>
              );
            })
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
