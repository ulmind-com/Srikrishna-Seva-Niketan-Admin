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
import { isAssignmentEndedIST } from "@/lib/staff-status";

const SHIFT_LABEL: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

/** Shift label — the server-computed window(s) for custom shifts, else label. */
function shiftText(r: Assignment): string {
  if (r.shift === "custom" && r.shift_label) return r.shift_label;
  return SHIFT_LABEL[r.shift] ?? r.shift;
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  active: "success",
  scheduled: "secondary",
  completed: "warning",
  cancelled: "danger",
  replaced: "warning",
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
        { label: "Replaced", value: "replaced" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
  ],
  columns: [
    {
      // Staff, customer, posted location and branch — the "who / where" of the row, stacked.
      header: "Staff → Customer",
      headClassName: "min-w-[180px]",
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span>{r.employee_name}</span>
            {r.acceptance_status === "accepted" && (
              <VerifiedBadge size={15} title="Verified Staff" />
            )}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="font-medium text-foreground/90">→ {r.customer_name}</span>
            <span className="text-[11px] text-muted-foreground/70">
              ({PLACE_LABEL[r.place_type] ?? r.place_type})
            </span>
          </span>
          {r.place_name && (
            <span className="text-[11px] text-muted-foreground/80 truncate max-w-[200px]">
              📍 {r.place_name}
            </span>
          )}
          {r.purpose && (
            <span className="text-[11px] text-primary/90 truncate max-w-[220px]">
              🎯 {r.purpose}
            </span>
          )}
          <BranchName
            id={r.location_id}
            className="text-[11px] text-muted-foreground/70"
          />
          {r.is_replacement && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 w-fit">
              🔄 Replacement for {r.replacement_for_employee_name || "Previous Staff"}
            </span>
          )}
          {r.replaced_by_employee_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 w-fit">
              🛑 Replaced by {r.replaced_by_employee_name} ({r.days_worked != null ? `${r.days_worked}d` : "Off"})
            </span>
          )}
        </div>
      ),
    },
    {
      // Shift window(s), date range, duty breaks, and progress bar
      header: "Shift, Period & Progress",
      headClassName: "min-w-[180px]",
      cell: (r) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.shift === "custom" && r.shift_label ? (
              <div className="flex flex-col gap-1">
                {r.shift_label.split(", ").map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex w-fit items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-primary"
                  >
                    {w}
                  </span>
                ))}
              </div>
            ) : (
              <Badge variant="outline" className="w-fit">
                {shiftText(r)}
              </Badge>
            )}
            {r.duty_breaks && r.duty_breaks.length > 0 && (
              <span className="inline-flex w-fit items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                ⏸️ {r.duty_breaks.length} {r.duty_breaks.length === 1 ? "Break" : "Breaks"}
              </span>
            )}
          </div>
          <span className="flex flex-col gap-0.5 text-[11px] tabular-nums text-muted-foreground">
            <span><DateCell value={r.start_date} /></span>
            <span className="text-muted-foreground/70">
              {r.end_date ? <>→ <DateCell value={r.end_date} /></> : "→ ongoing"}
            </span>
          </span>
          <div className="mt-0.5 pt-1 border-t border-border/40">
            <AssignmentProgress row={r} />
          </div>
        </div>
      ),
    },
    {
      // Rates, profit and how the money is collected — the full billing picture.
      header: "Billing (₹)",
      headClassName: "min-w-[150px]",
      cell: (r) => {
        const isWorkEnded =
          Boolean(r.end_date) || r.status === "completed" || r.status === "replaced";
        const days = r.days_worked ?? r.total_days;
        const contractAmt = r.contract_amount ?? 0;
        const dailyBill =
          r.customer_daily_rate != null && days != null
            ? Math.round(r.customer_daily_rate * days)
            : null;
        const bill = dailyBill ?? r.customer_rate ?? 0;
        const dailyPay =
          r.employee_daily_rate != null && days != null
            ? Math.round(r.employee_daily_rate * days)
            : null;
        const pay = dailyPay ?? r.employee_payout ?? 0;
        const dailyExp =
          r.daily_other_expense != null && days != null
            ? Math.round(r.daily_other_expense * days)
            : null;
        const exp = dailyExp ?? r.other_expense ?? 0;
        const profit = bill - pay - exp;
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
          <div className="flex flex-col gap-1.5">
            {contractAmt > 0 && (
              <div className="text-[11px] font-semibold text-sky-400 whitespace-nowrap tabular-nums">
                Contract: ₹{contractAmt.toLocaleString()}
              </div>
            )}
            {isWorkEnded ? (
              <div className="flex flex-col gap-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {bill > 0 && (
                  <div>
                    Bill: <span className="font-semibold text-foreground">₹{bill.toLocaleString()}</span>
                    {r.customer_daily_rate != null && days != null && (
                      <span className="ml-1 text-[10px] text-muted-foreground/75">
                        (₹{r.customer_daily_rate}×{days}d)
                      </span>
                    )}
                  </div>
                )}
                {pay > 0 && (
                  <div>
                    Pay: ₹{pay.toLocaleString()}
                    {r.employee_daily_rate != null && days != null && (
                      <span className="ml-1 text-[10px] text-muted-foreground/75">
                        (₹{r.employee_daily_rate}×{days}d)
                      </span>
                    )}
                  </div>
                )}
                {exp > 0 && (
                  <div>
                    Exp: ₹{exp.toLocaleString()}
                    {r.daily_other_expense != null && days != null && (
                      <span className="ml-1 text-[10px] text-muted-foreground/75">
                        (₹{r.daily_other_expense}×{days}d)
                      </span>
                    )}
                  </div>
                )}
                {(bill > 0 || pay > 0 || exp > 0) && (
                  <div className={`font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                    Profit: ₹{profit.toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {r.customer_daily_rate != null && r.customer_daily_rate > 0 && (
                  <div>Rate: ₹{r.customer_daily_rate.toLocaleString()}/day</div>
                )}
                {r.employee_daily_rate != null && r.employee_daily_rate > 0 && (
                  <div>Staff: ₹{r.employee_daily_rate.toLocaleString()}/day</div>
                )}
                {r.daily_other_expense != null && r.daily_other_expense > 0 && (
                  <div>Exp: ₹{r.daily_other_expense.toLocaleString()}/day</div>
                )}
                <span className="text-[10.5px] font-medium text-amber-400">
                  ⏳ Bill after work ends
                </span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 items-start">
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
          </div>
        );
      },
    },
    {
      // Lifecycle status + the nurse's acceptance response, together.
      header: "Status & Response",
      headClassName: "min-w-[160px]",
      cell: (r) => {
        let response;
        if (r.acceptance_status === "accepted") {
          response = (
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
        } else if (r.acceptance_status === "declined") {
          response = (
            <div className="flex flex-col gap-1 items-start max-w-[220px]">
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
        } else {
          response = (
            <div className="flex flex-col gap-0.5 items-start">
              <Badge variant="warning" className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[11px] font-semibold animate-pulse">
                <Clock className="h-3 w-3" /> Awaiting Response
              </Badge>
              <span className="text-[10px] text-muted-foreground">Push sent to nurse</span>
            </div>
          );
        }
        const isReplaced = r.status === "replaced" || Boolean(r.replaced_by_employee_name);
        const effStatus = isReplaced
          ? "replaced"
          : r.status !== "cancelled" && isAssignmentEndedIST(r)
          ? "completed"
          : r.status;
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge
              variant={isReplaced ? "warning" : (STATUS_VARIANT[effStatus] ?? "outline")}
              className={`capitalize ${isReplaced ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : ""}`}
            >
              {isReplaced ? "Replaced" : effStatus}
            </Badge>
            {response}
          </div>
        );
      },
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
      name: "duty_schedule",
      label: "Shift & Duty Schedule (কাজের শিফট ও সময়সূচী)",
      type: "duty_schedule",
      section: "Assignment",
      colSpan: 2,
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
      name: "purpose",
      label: "Purpose (কিসের জন্য পাঠানো হচ্ছে)",
      type: "text",
      placeholder: "e.g. Post-surgery care, Elderly care, Bedside support",
      helper: "Specify why the staff is being assigned here.",
      section: "Place",
    },
    {
      name: "place_name",
      label: "Hospital / Nursing Home / Place Name",
      type: "text",
      placeholder: "e.g. Apollo Gleneagles, Rehab Center, Clinic...",
      helper: "Enter the hospital, nursing home, or other location name.",
      showWhen: { field: "place_type", in: ["hospital", "nursing_home", "other"] },
      colSpan: 2,
      section: "Place",
    },
    { name: "address", label: "Address", type: "textarea", section: "Place", colSpan: 2 },
    {
      name: "payment_type",
      label: "Payment Model",
      type: "select",
      required: true,
      defaultValue: "prepaid",
      options: [
        { label: "Prepaid", value: "prepaid" },
        { label: "Postpaid", value: "postpaid" },
      ],
      section: "Billing",
    },
    {
      name: "payment_status",
      label: "Payment Status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending (বকেয়া)", value: "pending" },
        { label: "Paid / Received (পরিশোধিত)", value: "paid" },
        { label: "Collected (ক্যাশ বুঝে পেয়েছে)", value: "received" },
      ],
      section: "Billing",
    },
    { name: "customer_daily_rate", label: "Daily Rate — Customer (₹/day)", type: "number", min: 0, helper: "Charged to the customer per day.", section: "Billing" },
    { name: "contract_amount", label: "Total Contract Amount (₹)", type: "number", min: 0, helper: "Agreed customer contract amount — stays fixed while Bill calculates from Daily Rate × Days.", section: "Billing" },
    { name: "employee_daily_rate", label: "Daily Payout — Staff (₹/day)", type: "number", min: 0, helper: "Paid to the nurse per day — an expense.", section: "Billing" },
    { name: "daily_other_expense", label: "Daily Other Expense (₹/day)", type: "number", min: 0, helper: "Travel, kit, etc. per day — multiplied by duty days (e.g. ₹50 × 5d = ₹250).", section: "Billing" },
    { name: "notes", label: "Notes", type: "textarea", section: "Billing", colSpan: 2 },
  ],
};
