import { CalendarClock } from "lucide-react";
import type { Assignment } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { BranchName } from "@/components/common/BranchName";
import { DateCell } from "./cells";
import { loadCustomerOptions, loadEmployeeOptions } from "./branch-field";

const SHIFT_LABEL: Record<string, string> = {
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  active: "success",
  scheduled: "secondary",
  completed: "warning",
  cancelled: "danger",
};

export const assignmentsConfig: ResourceConfig<Assignment> = {
  name: "Assignment",
  titlePlural: "Assignments / Shifts",
  description:
    "Assign staff to customers on daily shifts. Assigning notifies the branch and marks the staff member occupied.",
  icon: <CalendarClock />,
  service: resourceServices.assignments,
  queryKey: "assignments",
  permission: "assignments",
  defaultSort: "start_date",
  formWidth: "lg",
  getRowTitle: (row) => `${row.employee_name} → ${row.customer_name}`,
  filters: [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
  ],
  columns: [
    {
      header: "Staff → Customer",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.employee_name}</span>
          <span className="text-xs text-muted-foreground">→ {r.customer_name}</span>
        </div>
      ),
    },
    {
      header: "Shift",
      cell: (r) => <Badge variant="outline">{SHIFT_LABEL[r.shift] ?? r.shift}</Badge>,
    },
    {
      header: "Period",
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          <DateCell value={r.start_date} />
          {r.end_date ? <> → <DateCell value={r.end_date} /></> : " → ongoing"}
        </div>
      ),
    },
    {
      header: "Rates (₹)",
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          {r.customer_rate != null && <div>Bill: ₹{r.customer_rate.toLocaleString()}</div>}
          {r.employee_payout != null && <div>Pay: ₹{r.employee_payout.toLocaleString()}</div>}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    {
      header: "Branch",
      cell: (r) => <BranchName id={r.location_id} className="text-sm" />,
    },
  ],
  fields: [
    {
      name: "employee_id",
      label: "Staff Member",
      type: "select",
      required: true,
      section: "Assignment",
      placeholder: "Select staff…",
      helper: "Staff and customer must belong to the same branch.",
      dynamicOptions: { queryKey: "employee-options", fetch: loadEmployeeOptions },
    },
    {
      name: "customer_id",
      label: "Customer",
      type: "select",
      required: true,
      section: "Assignment",
      placeholder: "Select customer…",
      dynamicOptions: { queryKey: "customer-options", fetch: loadCustomerOptions },
    },
    {
      name: "shift",
      label: "Shift",
      type: "select",
      required: true,
      defaultValue: "full_24h",
      options: [
        { label: "Day", value: "day" },
        { label: "Night", value: "night" },
        { label: "24 Hours", value: "full_24h" },
        { label: "Custom", value: "custom" },
      ],
      section: "Assignment",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "scheduled",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
      section: "Assignment",
    },
    { name: "start_date", label: "Start Date", type: "date", required: true, section: "Schedule" },
    { name: "end_date", label: "End Date", type: "date", helper: "Leave blank for ongoing.", section: "Schedule" },
    { name: "customer_rate", label: "Customer Rate (₹)", type: "number", min: 0, helper: "Defaults to the customer's billing rate.", section: "Billing" },
    { name: "employee_payout", label: "Staff Payout (₹)", type: "number", min: 0, helper: "Defaults to the staff member's daily rate.", section: "Billing" },
    { name: "notes", label: "Notes", type: "textarea", section: "Billing", colSpan: 2 },
  ],
};
