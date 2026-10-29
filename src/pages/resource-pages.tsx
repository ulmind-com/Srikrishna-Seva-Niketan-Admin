import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CustomerAssignmentDrawer } from "@/components/customers/CustomerAssignmentDrawer";
import type { Customer } from "@/types/models";
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

export const CustomersPage = () => {
  const [assignCustomer, setAssignCustomer] = useState<Customer | null>(null);

  return (
    <>
      <ResourceView
        config={customersConfig}
        extraRowAction={(customer) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs font-semibold gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all duration-200 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              setAssignCustomer(customer);
            }}
            title={`Assign Nurse / Duty to ${customer.name}`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Assign Duty</span>
          </Button>
        )}
        extraDropdownItems={(customer) => (
          <DropdownMenuItem
            onClick={() => setAssignCustomer(customer)}
            className="gap-2 cursor-pointer font-medium text-primary"
          >
            <UserPlus className="h-4 w-4" /> Assign Nurse / Duty
          </DropdownMenuItem>
        )}
      />

      <CustomerAssignmentDrawer
        customer={assignCustomer}
        onClose={() => setAssignCustomer(null)}
      />
    </>
  );
};

export const AssignmentsPage = () => <ResourceView config={assignmentsConfig} />;
export const ExpensesPage = () => <ResourceView config={expensesConfig} />;
export const PaymentsPage = () => <ResourceView config={paymentsConfig} />;
