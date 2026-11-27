import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  CalendarCheck,
  CalendarOff,
  CheckCircle2,
  History,
  Loader2,
  PauseCircle,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ReplaceStaffDialog } from "@/components/assignments/ReplaceStaffDialog";
import { AdminCompleteDutyDialog } from "@/components/assignments/AdminCompleteDutyDialog";
import { DutyBreakDialog } from "@/components/assignments/DutyBreakDialog";
import { LeaveRecordDialog } from "@/components/assignments/LeaveRecordDialog";
import { AssignmentHistoryDialog } from "@/components/assignments/AssignmentHistoryDialog";
import { BreakDetailsDialog } from "@/components/assignments/BreakDetailsDialog";
import type { Assignment } from "@/types/models";
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
import { createAssignmentsConfig } from "@/config/resources/assignments.config";
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

export const AssignmentsPage = () => {
  const navigate = useNavigate();
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [replaceAssignment, setReplaceAssignment] = useState<Assignment | null>(null);
  const [completeAssignment, setCompleteAssignment] = useState<Assignment | null>(null);
  const [breakAssignment, setBreakAssignment] = useState<Assignment | null>(null);
  const [leaveAssignment, setLeaveAssignment] = useState<Assignment | null>(null);

  const [historyAssignment, setHistoryAssignment] = useState<Assignment | null>(null);
  const [breakViewAssignment, setBreakViewAssignment] = useState<Assignment | null>(null);
  const config = useMemo(
    () => createAssignmentsConfig({ onViewBreaks: setBreakViewAssignment }),
    []
  );

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
    <>
      <ResourceView
        config={config}
        extraRowAction={(assignment) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs font-semibold gap-1 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                setReplaceAssignment(assignment);
              }}
              title={`Replace staff or handover duty for ${assignment.customer_name}`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Replace</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all shadow-xs"
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
            </Button>
          </div>
        )}
        extraDropdownItems={(assignment) => (
          <>
            {assignment.status !== "completed" && (
              <DropdownMenuItem
                onClick={() => setCompleteAssignment(assignment)}
                className="gap-2 cursor-pointer font-medium text-emerald-400 focus:text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> কাজ সম্পন্ন (Mark Duty Completed)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setBreakAssignment(assignment)}
              className="gap-2 cursor-pointer font-medium text-amber-400 focus:text-amber-300"
            >
              <PauseCircle className="h-4 w-4 text-amber-400" /> সাময়িক বন্ধ / ছুটি (Duty Pause / Break)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLeaveAssignment(assignment)}
              className="gap-2 cursor-pointer font-medium text-orange-400 focus:text-orange-300"
            >
              <CalendarOff className="h-4 w-4 text-orange-400" /> Apply / Record Staff Leave
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/attendance?employee_id=${assignment.employee_id}`)}
              className="gap-2 cursor-pointer font-medium text-sky-400 focus:text-sky-300"
            >
              <CalendarCheck className="h-4 w-4 text-sky-400" /> Mark Attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setHistoryAssignment(assignment)}
              className="gap-2 cursor-pointer font-medium text-purple-400 focus:text-purple-300"
            >
              <History className="h-4 w-4 text-purple-400" /> View Assignment History
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSendPush(assignment)}
              className="gap-2 cursor-pointer font-medium text-emerald-400 focus:text-emerald-300"
            >
              <BellRing className="h-4 w-4 text-emerald-400" /> Send Push Alert to Nurse
            </DropdownMenuItem>
          </>
        )}
      />

      <ReplaceStaffDialog
        assignment={replaceAssignment}
        onClose={() => setReplaceAssignment(null)}
      />

      <AdminCompleteDutyDialog
        assignment={completeAssignment}
        onClose={() => setCompleteAssignment(null)}
      />

      <DutyBreakDialog
        assignment={breakAssignment}
        onClose={() => setBreakAssignment(null)}
      />

      <LeaveRecordDialog
        assignment={leaveAssignment}
        open={!!leaveAssignment}
        onClose={() => setLeaveAssignment(null)}
      />

      <AssignmentHistoryDialog
        assignment={historyAssignment}
        onClose={() => setHistoryAssignment(null)}
      />

      <BreakDetailsDialog
        assignment={breakViewAssignment}
        onClose={() => setBreakViewAssignment(null)}
        onManageBreaks={(asg) => setBreakAssignment(asg)}
      />
    </>
  );
};
export const ExpensesPage = () => <ResourceView config={expensesConfig} />;
export const PaymentsPage = () => <ResourceView config={paymentsConfig} />;
