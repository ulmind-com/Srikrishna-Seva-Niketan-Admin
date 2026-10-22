import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/contexts/AuthContext";

const KEY = "notifications";

export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [KEY, "unread"],
    queryFn: () => notificationService.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 10_000,
    select: (d) => d.unread,
  });
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [KEY, "list", { page: 1, page_size: 12 }],
    queryFn: () => notificationService.list({ page: 1, page_size: 12 }),
    enabled: isAuthenticated,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead, remove };
}
