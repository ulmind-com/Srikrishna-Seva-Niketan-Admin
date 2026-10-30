import { useState } from "react";
import { UserPlus, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CustomerAssignmentDrawer } from "@/components/customers/CustomerAssignmentDrawer";
import type { Customer, Assignment } from "@/types/models";
import { pushNotificationService } from "@/services/push-notification.service";
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

export const AssignmentsPage = () => {
  const [pushingId, setPushingId] = useState<string | null>(null);

  const handleSendPush = async (assignment: Assignment) => {
    setPushingId(assignment.id);
    try {
      const res = await pushNotificationService.dispatchPush({
        target: "employee",
        employee_id: assignment.employee_id,
        title: "🚨 Duty Assignment Alert",
        message: `Duty for ${assignment.customer_name} (${assignment.shift} shift). Tap to view and accept.`,
        urgency: "high",
        link: "/staff/status",
      });
      toast.success(`Push notification sent to ${assignment.employee_name}!`, {
        description: `Alert with sound delivered to active devices (${res.sent || 1} delivered).`,
      });
    } catch (err: unknown) {
      toast.error("Failed to send push notification", {
        description: err instanceof Error ? err.message : "Please check nurse push subscription",
      });
    } finally {
      setPushingId(null);
    }
  };

  return (
    <ResourceView
      config={assignmentsConfig}
      extraRowAction={(assignment) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all shadow-xs"
          onClick={(e) => {
            e.stopPropagation();
            handleSendPush(assignment);
          }}
          disabled={pushingId === assignment.id}
          title={`Send push notification with sound to ${assignment.employee_name}`}
        >
          {pushingId === assignment.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BellRing className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>Push to Nurse</span>
        </Button>
      )}
      extraDropdownItems={(assignment) => (
        <DropdownMenuItem
          onClick={() => handleSendPush(assignment)}
          className="gap-2 cursor-pointer font-medium text-emerald-400 focus:text-emerald-300"
        >
          <BellRing className="h-4 w-4 text-emerald-400" /> Send Push Alert to Nurse
        </DropdownMenuItem>
      )}
    />
  );
};
export const ExpensesPage = () => <ResourceView config={expensesConfig} />;
export const PaymentsPage = () => <ResourceView config={paymentsConfig} />;
