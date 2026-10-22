import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import type { ListParams } from "@/types/api";
import type {
  ActivityLog,
  Booking,
  ContactMessage,
  DashboardCharts,
  DashboardStats,
  JobApplication,
} from "@/types/models";

export const dashboardService = {
  stats: () => http.get<DashboardStats>(endpoints.dashboard.stats),
  charts: (days = 30) =>
    http.get<DashboardCharts>(endpoints.dashboard.charts, { days }),
  recentBookings: (limit = 5) =>
    http.get<Booking[]>(endpoints.dashboard.recentBookings, { limit }),
  recentContacts: (limit = 5) =>
    http.get<ContactMessage[]>(endpoints.dashboard.recentContacts, { limit }),
  recentApplications: (limit = 5) =>
    http.get<JobApplication[]>(endpoints.dashboard.recentApplications, { limit }),
  activityLogs: (params?: ListParams) =>
    http.list<ActivityLog>(endpoints.dashboard.activityLogs, params),
};
