import { CalendarClock, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { Assignment } from "@/types/models";
import { resourceServices } from "@/services/resources";
import type { ResourceConfig } from "@/components/resource/types";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { BranchName } from "@/components/common/BranchName";
import {
  AssignmentProgress,
  PLACE_LABEL,
} from "@/components/common/AssignmentProgress";
import { DateCell } from "./cells";
import { loadEmployeeOptions } from "./branch-field";

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
          <span className="font-medium flex items-center gap-1.5">
            <span>{r.employee_name}</span>
            {r.acceptance_status === "accepted" && (
              <VerifiedBadge size={15} title="Verified Staff" />
            )}
          </span>
          <span className="text-xs text-muted-foreground">→ {r.customer_name}</span>
        </div>
      ),
    },
    {
      header: "Shift",
      cell: (r) => <Badge variant="outline">{SHIFT_LABEL[r.shift] ?? r.shift}</Badge>,
    },
    {
      header: "Posted At",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-sm">{PLACE_LABEL[r.place_type] ?? "—"}</span>
          {r.place_name && (
            <span className="text-xs text-muted-foreground">{r.place_name}</span>
          )}
        </div>
      ),
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
      header: "Progress",
      cell: (r) => <AssignmentProgress row={r} />,
    },
    {
      header: "Rates & Profit (₹)",
      cell: (r) => {
        const bill = r.customer_rate ?? 0;
        const pay = r.employee_payout ?? 0;
        const exp = r.other_expense ?? 0;
        const profit = bill - pay - exp;
        return (
          <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
            {r.customer_rate != null && <div>Bill: <span className="font-semibold text-foreground">₹{r.customer_rate.toLocaleString()}</span></div>}
            {r.employee_payout != null && <div>Pay: ₹{r.employee_payout.toLocaleString()}</div>}
            {r.other_expense != null && r.other_expense > 0 && <div>Exp: ₹{r.other_expense.toLocaleString()}</div>}
            {bill > 0 && (
              <div className={`font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                Profit: ₹{profit.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Payment",
      cell: (r) => {
        const isPostpaid = r.payment_type === "postpaid";
        const collected = r.payment_status === "paid" || r.payment_status === "received";
        // Prepaid is collected in advance by the office — always settled; only
        // postpaid can be pending collection by the staff member.
        const settled = !isPostpaid || collected;
        const payLabel = !isPostpaid
          ? "✓ Advance Paid"
          : collected
          ? "✓ Cash Collected"
          : "⏳ Pending Collection";
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge
              variant={isPostpaid ? "secondary" : "default"}
              className={isPostpaid ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]"}
            >
              {isPostpaid ? "Postpaid (Cash)" : "Prepaid"}
            </Badge>
            <span className={`text-[11px] font-medium ${settled ? "text-success" : "text-amber-400"}`}>
              {payLabel}
            </span>
          </div>
        );
      },
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
      header: "Staff Response",
      cell: (r) => {
        if (r.acceptance_status === "accepted") {
          return (
            <div className="flex flex-col gap-0.5 items-start">
              <Badge variant="success" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Accepted
              </Badge>
              {r.accepted_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.accepted_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        }

        if (r.acceptance_status === "declined") {
          return (
            <div className="flex flex-col gap-1 items-start max-w-[240px]">
              <Badge variant="danger" className="bg-rose-500/15 text-rose-400 border-rose-500/30 gap-1 text-[11px] font-semibold">
                <XCircle className="h-3 w-3" /> Declined
              </Badge>
              {r.decline_reason && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 font-medium">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Reason:
                  </span>
                  “{r.decline_reason}”
                </div>
              )}
              {r.declined_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.declined_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-0.5 items-start">
            <Badge variant="warning" className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[11px] font-semibold animate-pulse">
              <Clock className="h-3 w-3" /> Awaiting Response
            </Badge>
            <span className="text-[10px] text-muted-foreground">Push sent to nurse</span>
          </div>
        );
      },
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
      emptyMessage: "No staff registered yet. Add them in Staff Register first.",
      dynamicOptions: { queryKey: "employee-options", fetch: loadEmployeeOptions },
    },
    {
      name: "customer_id",
      label: "Customer",
      type: "customer",
      required: true,
      section: "Assignment",
      helper: "Pick an existing customer, or add a new one inline.",
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
    {
      name: "place_type",
      label: "Posted At",
      type: "select",
      required: true,
      defaultValue: "home",
      options: [
        { label: "Customer's Home", value: "home" },
        { label: "Hospital", value: "hospital" },
        { label: "Nursing Home", value: "nursing_home" },
        { label: "Other", value: "other" },
      ],
      section: "Place",
    },
    {
      name: "place_name",
      label: "Hospital / Nursing Home Name",
      type: "text",
      placeholder: "e.g. Apollo Gleneagles",
      helper: "Leave blank for a home posting.",
      section: "Place",
    },
    { name: "address", label: "Address", type: "textarea", section: "Place", colSpan: 2 },
    {
      name: "dest_lat",
      label: "Customer / Duty Location Pin",
      type: "geopoint",
      section: "Place",
      colSpan: 2,
      latField: "dest_lat",
      lngField: "dest_lng",
      addressField: "address",
      helper: "Draggable pin for exact nurse navigation. Use 'Locate Address on Map' or drag the pin to set the exact customer location.",
    },
    { name: "start_date", label: "Start Date", type: "date", required: true, section: "Schedule" },
    {
      name: "duration_days",
      label: "Duration (days)",
      type: "number",
      min: 1,
      placeholder: "e.g. 10",
      helper: "Sets the end date automatically. Leave blank for ongoing.",
      section: "Schedule",
    },
    { name: "end_date", label: "End Date", type: "date", helper: "Optional — overrides duration.", section: "Schedule" },
    {
      name: "payment_type",
      label: "Payment Model",
      type: "select",
      required: true,
      defaultValue: "prepaid",
      options: [
        { label: "Prepaid (অফিসে অগ্রিম পরিশোধিত)", value: "prepaid" },
        { label: "Postpaid (সার্ভিসের পর স্টাফ ক্যাশ নেবে)", value: "postpaid" },
      ],
      section: "Billing",
      helper: "Prepaid: office already collected. Postpaid: staff member collects cash in hand after service.",
    },
    {
      name: "payment_status",
      label: "Payment Status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending (বকেয়া)", value: "pending" },
        { label: "Paid / Received (পরিশোধিত)", value: "paid" },
        { label: "Collected by Staff (স্টাফ ক্যাশ বুঝে পেয়েছে)", value: "received" },
      ],
      section: "Billing",
    },
    { name: "customer_rate", label: "Contract Amount (₹)", type: "number", min: 0, helper: "What the customer pays — counts as revenue.", section: "Billing" },
    { name: "employee_payout", label: "Staff Payout (₹)", type: "number", min: 0, helper: "What the nurse is paid — an expense.", section: "Billing" },
    { name: "other_expense", label: "Other Expense (₹)", type: "number", min: 0, helper: "Travel, kit, etc. for this engagement — an expense.", section: "Billing" },
    { name: "notes", label: "Notes", type: "textarea", section: "Billing", colSpan: 2 },
  ],
};
