import { endpoints } from "./api/endpoints";
import { http } from "./api/http";

export type AttendanceStatus = "present" | "half_day" | "leave" | "off" | "absent";
export type ShiftKind = "morning" | "day" | "night" | "full_24h" | "custom";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  location_id?: string | null;
  date: string;
  status: AttendanceStatus;
  shift: ShiftKind;
  start_time?: string | null;
  end_time?: string | null;
  shift_windows?: { start?: string | null; end?: string | null }[] | null;
  assignment_id?: string | null;
  customer_name?: string | null;
  pay_rate?: number | null;
  note?: string | null;
  payable: boolean;
  amount: number;
}

export interface DayRoster {
  date: string;
  totals: {
    marked: number;
    present: number;
    half_day: number;
    leave: number;
    off: number;
    absent: number;
  };
  records: AttendanceRecord[];
}

export interface AttendanceBulkItem {
  employee_id: string;
  status: AttendanceStatus;
  shift: ShiftKind;
  start_time?: string | null;
  end_time?: string | null;
  pay_rate?: number | null;
  note?: string | null;
}

export interface PayslipDay {
  date: string;
  status: AttendanceStatus | "unmarked";
  shift: ShiftKind | null;
  start_time?: string | null;
  end_time?: string | null;
  duration?: string | null;
  shift_windows?: { start?: string | null; end?: string | null }[] | null;
  customer_name?: string | null;
  pay_rate?: number | null;
  amount: number;
}

export interface PayslipSummary {
  present_days: number;
  total_shifts?: number;
  half_days: number;
  leave_days: number;
  off_days: number;
  absent_days: number;
  worked_days: number;
  marked_days: number;
  unmarked_days: number;
  payable_days: number;
  gross_pay: number;
  leave_deduction: number;
  net_payable: number;
  paid_amount?: number;
  remaining_amount?: number;
  payment_status?: "paid" | "partial" | "pending" | "no_due" | string;
  by_shift: Record<string, number>;
  off_dates: string[];
  absent_dates: string[];
}

export interface Payslip {
  employee: {
    id: string;
    name: string;
    code: string;
    category: string;
    daily_rate?: number | null;
    photo?: { url: string } | null;
    location_id?: string | null;
  };
  period: { month: string; start: string; end: string; days_in_month: number };
  summary: PayslipSummary;
  off_dates: string[];
  absent_dates: string[];
  days: PayslipDay[];
}

export interface PayrollRunRow {
  employee_id: string;
  name: string;
  code: string;
  category: string;
  daily_rate?: number | null;
  location_id: string;
  present_days: number;
  total_shifts?: number;
  half_days: number;
  leave_days: number;
  off_days: number;
  absent_days: number;
  worked_days: number;
  payable_days: number;
  gross_pay: number;
  leave_deduction: number;
  net_payable: number;
  paid_amount?: number;
  remaining_amount?: number;
  payment_status?: "paid" | "partial" | "pending" | "no_due" | string;
  by_shift: Record<string, number>;
}

export interface PayrollRun {
  period: { month: string; start: string; end: string; days_in_month: number };
  totals: {
    employees: number;
    total_gross_pay: number;
    total_paid?: number;
    total_remaining?: number;
  };
  rows: PayrollRunRow[];
}

export type LeaveType = "unpaid" | "paid" | "sick" | "casual" | "emergency";
export type LeaveApprovalStatus = "pending" | "approved" | "rejected";

export interface StaffLeave {
  id: string;
  employee_id: string;
  employee_name: string;
  assignment_id?: string | null;
  customer_name?: string | null;
  location_id?: string | null;
  leave_date: string;
  end_date?: string | null;
  leave_type: LeaveType;
  deduct_pay: boolean;
  approval_status: LeaveApprovalStatus;
  reason?: string | null;
  approved_by?: string | null;
  linked_break_id?: string | null;
  created_at?: string;
}

export interface StaffLeaveCreatePayload {
  employee_id: string;
  assignment_id?: string | null;
  leave_date: string;
  end_date?: string | null;
  leave_type: LeaveType;
  deduct_pay: boolean;
  approval_status: LeaveApprovalStatus;
  reason?: string;
}

/** Payroll: daily attendance marking + monthly payslip reads. */
export const payrollService = {
  dayRoster: (date: string, location_id?: string) =>
    http.get<DayRoster>(endpoints.payroll.attendanceDay, { date, location_id }),

  markBulk: (date: string, items: AttendanceBulkItem[]) =>
    http.post<{ date: string; saved: number; skipped: unknown[] }>(
      endpoints.payroll.attendanceBulk,
      { date, items },
    ),

  syncFromAssignments: (date: string) =>
    http.post<{ date: string; created: number; skipped: number }>(
      `${endpoints.payroll.attendanceSync}?date=${encodeURIComponent(date)}`,
    ),

  deleteRecord: (id: string) =>
    http.del<{ success: boolean }>(endpoints.payroll.attendanceItem(id)),

  payslip: (
    employee_id: string,
    month?: string,
    start_date?: string,
    end_date?: string,
  ) =>
    http.get<Payslip>(endpoints.payroll.payslip, {
      employee_id,
      month: month || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
    }),

  payrollRun: (
    month?: string,
    location_id?: string,
    start_date?: string,
    end_date?: string,
  ) =>
    http.get<PayrollRun>(endpoints.payroll.payslips, {
      month: month || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      location_id,
    }),

  listLeaves: (params?: {
    employee_id?: string;
    assignment_id?: string;
    approval_status?: string;
    start_date?: string;
    end_date?: string;
    location_id?: string;
  }) => http.list<StaffLeave>(endpoints.payroll.leaves, params),

  createLeave: (payload: StaffLeaveCreatePayload) =>
    http.post<StaffLeave>(endpoints.payroll.leaves, payload),

  updateLeave: (
    leave_id: string,
    payload: Partial<Pick<StaffLeave, "leave_type" | "deduct_pay" | "approval_status" | "reason">>,
  ) => http.put<StaffLeave>(endpoints.payroll.leaveItem(leave_id), payload),

  deleteLeave: (leave_id: string) =>
    http.del<{ success: boolean }>(endpoints.payroll.leaveItem(leave_id)),
};
