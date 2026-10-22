import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import { rawClient } from "./api/client";
import type { ListParams } from "@/types/api";
import type { Booking } from "@/types/models";

export const bookingService = {
  list: (params?: ListParams) => http.list<Booking>(endpoints.bookings.root, params),
  get: (id: string) => http.get<Booking>(`${endpoints.bookings.root}/${id}`),
  update: (id: string, data: Partial<Booking>) =>
    http.put<Booking>(`${endpoints.bookings.root}/${id}`, data),
  approve: (id: string) => http.post<Booking>(endpoints.bookings.approve(id)),
  reject: (id: string, reason?: string) =>
    http.post<Booking>(endpoints.bookings.reject(id), { reason }),
  cancel: (id: string, reason?: string) =>
    http.post<Booking>(endpoints.bookings.cancel(id), { reason }),
  assign: (id: string, assigned_staff_id: string, assigned_staff_name: string) =>
    http.post<Booking>(endpoints.bookings.assign(id), {
      assigned_staff_id,
      assigned_staff_name,
    }),
  remove: (id: string) => http.del<null>(`${endpoints.bookings.root}/${id}`),
  exportCsv: async (params?: Record<string, any>): Promise<Blob> => {
    const res = await rawClient.get(endpoints.bookings.export, {
      params,
      responseType: "blob",
    });
    return res.data as Blob;
  },
};
