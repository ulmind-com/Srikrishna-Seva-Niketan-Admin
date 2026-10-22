import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Calendar, Mail, FileUser, Package, Info, Trash2, ShieldAlert } from "lucide-react";
import type { ListParams } from "@/types/api";
import type { NotificationItem } from "@/types/models";
import { notificationService } from "@/services/notification.service";
import {
  useNotificationActions,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { env } from "@/config/env";
import { cn, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ICONS: Record<string, typeof Bell> = {
  booking: Calendar,
  contact: Mail,
  application: FileUser,
  rental: Package,
  enquiry: ShieldAlert,
  system: Info,
};

export function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const { data: unread = 0 } = useUnreadCount();
  const { markRead, markAllRead, remove } = useNotificationActions();

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: 15,
      ...(tab === "unread" ? { is_read: false } : {}),
    }),
    [page, tab]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", params],
    queryFn: () => notificationService.list(params),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Notifications · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="Notifications"
        description="Stay on top of everything happening across your platform."
        icon={<Bell />}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => markAllRead.mutate()}>
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unread > 0 && `(${unread})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title="You're all caught up"
            description="There are no notifications to show."
          />
        ) : (
          <div>
            {items.map((n: NotificationItem, i) => {
              const Icon = ICONS[n.type] ?? Info;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "group flex items-start gap-4 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-muted/40",
                    !n.is_read && "bg-primary/[0.03]"
                  )}
                >
                  <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-accent">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{n.title}</p>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => markRead.mutate(n.id)}
                        title="Mark read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => remove.mutate(n.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <Pagination
            meta={data?.pagination}
            page={page}
            pageSize={15}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        )}
      </Card>
    </div>
  );
}
