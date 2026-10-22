import { ResourceView } from "@/components/resource/ResourceView";
import { categoriesConfig } from "@/config/resources/categories.config";
import { servicesConfig } from "@/config/resources/services.config";
import { equipmentConfig } from "@/config/resources/equipment.config";
import { blogsConfig } from "@/config/resources/blogs.config";
import { careersConfig } from "@/config/resources/careers.config";
import { staffConfig } from "@/config/resources/staff.config";
import { locationsConfig } from "@/config/resources/locations.config";
import { employeesConfig } from "@/config/resources/employees.config";
import { customersConfig } from "@/config/resources/customers.config";
import { assignmentsConfig } from "@/config/resources/assignments.config";
import { expensesConfig } from "@/config/resources/expenses.config";
import { paymentsConfig } from "@/config/resources/payments.config";
import {
  faqsConfig,
  testimonialsConfig,
} from "@/config/resources/content.config";

export const CategoriesPage = () => <ResourceView config={categoriesConfig} />;
export const ServicesPage = () => <ResourceView config={servicesConfig} />;
export const EquipmentPage = () => <ResourceView config={equipmentConfig} />;
export const BlogsPage = () => <ResourceView config={blogsConfig} />;
export const CareersPage = () => <ResourceView config={careersConfig} />;
export const TestimonialsPage = () => <ResourceView config={testimonialsConfig} />;
export const FaqPage = () => <ResourceView config={faqsConfig} />;
export const StaffPage = () => <ResourceView config={staffConfig} />;
export const LocationsPage = () => <ResourceView config={locationsConfig} />;
export const EmployeesPage = () => <ResourceView config={employeesConfig} />;
export const CustomersPage = () => <ResourceView config={customersConfig} />;
export const AssignmentsPage = () => <ResourceView config={assignmentsConfig} />;
export const ExpensesPage = () => <ResourceView config={expensesConfig} />;
export const PaymentsPage = () => <ResourceView config={paymentsConfig} />;
