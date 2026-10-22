import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import { apiRequest } from "./api/client";
import type { ListParams } from "@/types/api";
import type { NotificationItem } from "@/types/models";

export const notificationService = {
  list: (params?: ListParams) =>
    http.list<NotificationItem>(endpoints.notifications.root, params),
  unreadCount: () =>
    http.get<{ unread: number }>(endpoints.notifications.unread),
  markRead: (id: string) =>
    http.post<NotificationItem>(endpoints.notifications.read(id)),
  markAllRead: () =>
    http.post<{ updated: number }>(endpoints.notifications.readAll),
  remove: (id: string) =>
    apiRequest<null>({
      method: "DELETE",
      url: `${endpoints.notifications.root}/${id}`,
    }),
};
