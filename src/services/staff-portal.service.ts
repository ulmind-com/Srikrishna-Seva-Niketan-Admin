import { endpoints } from "./api/endpoints";
import { staffRequest } from "./api/staff-client";
import { http } from "./api/http";
import type {
  DailyRoster,
  DeploymentOverview,
  Employee,
  ImageAsset,
  LocationStaffStat,
  StaffBranchOption,
} from "@/types/models";

/** Token pair + profile returned by register/login. */
export interface StaffSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  staff: Employee;
}

/** The onboarding profile fields a staff member fills in. */
export interface StaffOnboardingPayload {
  phone?: string;
  alt_phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  dob?: string;
  gender?: string;
  category?: string;
  designation?: string;
  experience?: string;
  work_history?: string;
  previous_employer?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  document_verification?: Record<string, unknown>;
}

/** Calls made *as the staff member* (staff-scoped token). */
export const staffPortalService = {
  /** Public — branch dropdown on the signup form. */
  branches: () =>
    staffRequest<StaffBranchOption[]>({
      method: "GET",
      url: endpoints.staffPortal.branches,
    }),

  sendOtp: (email: string) =>
    staffRequest<{ email: string }>({
      method: "POST",
      url: endpoints.staffPortal.sendOtp,
      data: { email },
    }),

  verifyOtp: (email: string, otp: string) =>
    staffRequest<{ email: string; verified: boolean }>({
      method: "POST",
      url: endpoints.staffPortal.verifyOtp,
      data: { email, otp },
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    location_id: string;
    otp?: string;
  }) =>
    staffRequest<StaffSession>({
      method: "POST",
      url: endpoints.staffPortal.register,
      data: payload,
    }),

  login: (email: string, password: string) =>
    staffRequest<StaffSession>({
      method: "POST",
      url: endpoints.staffPortal.login,
      data: { email, password },
    }),

  me: () => staffRequest<Employee>({ method: "GET", url: endpoints.staffPortal.me }),

  saveProfile: (payload: StaffOnboardingPayload) =>
    staffRequest<Employee>({
      method: "PUT",
      url: endpoints.staffPortal.me,
      data: payload,
    }),

  submit: () =>
    staffRequest<Employee>({ method: "POST", url: endpoints.staffPortal.submit }),

  /** Upload the staff member's own photo / signature / ID proof. */
  upload: (file: File | Blob, kind: "photo" | "signature" | "id_proof") => {
    const form = new FormData();
    const name = file instanceof File ? file.name : `${kind}.png`;
    form.append("file", file, name);
    form.append("kind", kind);
    return staffRequest<ImageAsset>({
      method: "POST",
      url: endpoints.staffPortal.upload,
      data: form,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** The staff member's own notification feed. */
  notifications: () =>
    staffRequest<{ items: StaffNotification[]; total: number }>({
      method: "GET",
      url: endpoints.staffPortal.notifications,
    }),
  unreadCount: () =>
    staffRequest<{ unread: number }>({
      method: "GET",
      url: endpoints.staffPortal.notificationsUnread,
    }),
  markNotificationRead: (id: string) =>
    staffRequest<StaffNotification>({
      method: "POST",
      url: endpoints.staffPortal.notificationRead(id),
    }),
  markAllNotificationsRead: () =>
    staffRequest<{ updated: number }>({
      method: "POST",
      url: endpoints.staffPortal.notificationsReadAll,
    }),

  /** The nurse's own duty assignments — price-free. */
  assignments: (pending?: boolean) =>
    staffRequest<{ items: StaffAssignment[]; total: number }>({
      method: "GET",
      url: endpoints.staffPortal.assignments,
      params: pending ? { pending: true } : undefined,
    }),
  acceptAssignment: (id: string) =>
    staffRequest<StaffAssignment>({
      method: "POST",
      url: endpoints.staffPortal.assignmentAccept(id),
    }),
  declineAssignment: (id: string, reason?: string) =>
    staffRequest<StaffAssignment>({
      method: "POST",
      url: endpoints.staffPortal.assignmentDecline(id),
      data: { reason },
    }),
  /** Route from the nurse's current GPS to the duty location. */
  route: (id: string, lat: number, lng: number) =>
    staffRequest<RouteResult>({
      method: "GET",
      url: endpoints.staffPortal.assignmentRoute(id),
      params: { lat, lng },
    }),
  pingLocation: (lat: number, lng: number) =>
    staffRequest<{ ok: boolean }>({
      method: "POST",
      url: endpoints.staffPortal.location,
      data: { lat, lng },
    }),
};

/** An assignment as the nurse sees it — deliberately carries no money field. */
export interface StaffAssignment {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  place_type: "home" | "hospital" | "nursing_home" | "other";
  place_name?: string | null;
  address?: string | null;
  shift: string;
  start_date: string;
  end_date?: string | null;
  acceptance_status: "pending" | "accepted" | "declined";
  dest_lat?: number | null;
  dest_lng?: number | null;
  total_days?: number | null;
  days_remaining?: number | null;
}

/** Shortest-path result from the staff route endpoint. */
export interface RouteResult {
  distance_m: number | null;
  duration_s: number | null;
  /** Polyline as [lng, lat] pairs, or null when routing was unavailable. */
  geometry: number[][] | null;
  dest_lat: number | null;
  dest_lng: number | null;
}

export interface StaffNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id?: string | null;
  created_at?: string | null;
}

/** Calls made *as an admin* against staff records. */
export const staffAdminService = {
  /** Branch-wise counts — every branch for a super admin, own branches for a manager. */
  statsByLocation: () =>
    http.get<LocationStaffStat[]>(endpoints.employees.statsByLocation),

  /** Who is deployed, who is free — per branch, scoped to the caller. */
  deployment: () =>
    http.get<DeploymentOverview>(endpoints.assignments.deployment),

  /** Every shift running on one day, grouped by branch. */
  dailyRoster: (date: string) =>
    http.get<DailyRoster>(endpoints.assignments.daily, { date }),

  /** The review queue, optionally narrowed to one branch. */
  listByStatus: (verification_status: string, location_id?: string) =>
    http.list<Employee>(endpoints.employees.root, {
      verification_status,
      location_id,
      page_size: 100,
    }),

  verify: (
    id: string,
    payload: {
      designation?: string;
      hrms_code?: string;
      join_date?: string;
      daily_rate?: number;
    },
  ) => http.post<Employee>(endpoints.employees.verify(id), payload),

  reject: (id: string, reason: string) =>
    http.post<Employee>(endpoints.employees.reject(id), { reason }),
};
