import { endpoints } from "./api/endpoints";
import { staffRequest } from "./api/staff-client";
import { http } from "./api/http";
import type {
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

  register: (payload: {
    name: string;
    email: string;
    password: string;
    location_id: string;
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
};

/** Calls made *as an admin* against staff records. */
export const staffAdminService = {
  /** Branch-wise counts — every branch for a super admin, own branches for a manager. */
  statsByLocation: () =>
    http.get<LocationStaffStat[]>(endpoints.employees.statsByLocation),

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
