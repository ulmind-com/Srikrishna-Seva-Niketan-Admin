import { createCrudService } from "./crud.factory";
import { endpoints } from "./api/endpoints";
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
  assignments: createCrudService<Assignment>(endpoints.assignments.root),
  expenses: createCrudService<Expense>(endpoints.expenses.root),
  payments: createCrudService<Payment>(endpoints.payments.root),
};
