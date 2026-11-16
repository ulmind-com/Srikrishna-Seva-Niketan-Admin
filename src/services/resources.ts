import { createCrudService } from "./crud.factory";
import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import type {
  Assignment,
  Blog,
  Category,
  Equipment,
  FAQ,
  Customer,
  Employee,
  Expense,
  Location,
  Payment,
  Service,
  StaffMember,
  Testimonial,
  Video,
} from "@/types/models";

const baseAssignments = createCrudService<Assignment>(endpoints.assignments.root);

export interface ReplaceStaffPayload {
  new_employee_id: string;
  effective_date: string;
  reason?: string;
  customer_daily_rate?: number;
  employee_daily_rate?: number;
  notes?: string;
}

export interface BatchReplaceItemPayload {
  assignment_id: string;
  new_employee_id: string;
  effective_date: string;
  reason?: string;
  notes?: string;
}

export interface MultiStaffItemPayload {
  employee_id: string;
  shift: string;
  start_time?: string;
  end_time?: string;
  customer_daily_rate?: number;
  employee_daily_rate?: number;
  notes?: string;
}

export interface MultiStaffAssignPayload {
  customer_id: string;
  location_id?: string;
  start_date: string;
  end_date?: string;
  duration_days?: number;
  customer_daily_rate?: number;
  employee_daily_rate?: number;
  place_type?: string;
  place_name?: string;
  address?: string;
  dest_lat?: number;
  dest_lng?: number;
  payment_type?: string;
  notes?: string;
  staff_list: MultiStaffItemPayload[];
}

export const assignmentService = {
  ...baseAssignments,
  replaceStaff: (id: string, payload: ReplaceStaffPayload) =>
    http.post<{ previous_assignment: Assignment; new_assignment: Assignment }>(
      endpoints.assignments.replaceStaff(id),
      payload
    ),
  batchReplace: (replacements: BatchReplaceItemPayload[]) =>
    http.post<{ items: { previous_assignment: Assignment; new_assignment: Assignment }[]; count: number }>(
      endpoints.assignments.batchReplace,
      { replacements }
    ),
  multiAssign: (payload: MultiStaffAssignPayload) =>
    http.post<{ items: Assignment[]; count: number }>(
      endpoints.assignments.multiAssign,
      payload
    ),
};

/** CRUD services for the config-driven resource modules. */
export const resourceServices = {
  services: createCrudService<Service>(endpoints.services.root),
  serviceCategories: createCrudService<Category>(endpoints.services.categories),
  equipment: createCrudService<Equipment>(endpoints.equipment.root),
  equipmentCategories: createCrudService<Category>(endpoints.equipment.categories),
  blogs: createCrudService<Blog>(endpoints.blogs.root),
  blogCategories: createCrudService<Category>(endpoints.blogs.categories),
  videos: createCrudService<Video>(endpoints.videos.root),
  testimonials: createCrudService<Testimonial>(endpoints.testimonials.root),
  faqs: createCrudService<FAQ>(endpoints.faqs.root),
  staff: createCrudService<StaffMember>(endpoints.staff.root),
  locations: createCrudService<Location>(endpoints.locations.root),
  employees: createCrudService<Employee>(endpoints.employees.root),
  customers: createCrudService<Customer>(endpoints.customers.root),
  assignments: assignmentService,
  expenses: createCrudService<Expense>(endpoints.expenses.root),
  payments: createCrudService<Payment>(endpoints.payments.root),
};
