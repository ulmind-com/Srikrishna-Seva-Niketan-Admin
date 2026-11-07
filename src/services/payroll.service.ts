import { endpoints } from "./api/endpoints";
import { http } from "./api/http";

export type AttendanceStatus = "present" | "half_day" | "leave" | "off";
export type ShiftKind = "day" | "night" | "full_24h" | "custom";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  location_id?: string | null;
  date: string;
  status: AttendanceStatus;
  shift: ShiftKind;
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
  };
  records: AttendanceRecord[];
}

export interface AttendanceBulkItem {
  employee_id: string;
  status: AttendanceStatus;
  shift: ShiftKind;
  pay_rate?: number | null;
  note?: string | null;
}

export interface PayslipDay {
  date: string;
  status: AttendanceStatus | "unmarked";
  shift: ShiftKind | null;
  customer_name?: string | null;
  pay_rate?: number | null;
  amount: number;
}

export interface PayslipSummary {
  present_days: number;
  half_days: number;
  leave_days: number;
  off_days: number;
  marked_days: number;
  unmarked_days: number;
  payable_days: number;
  gross_pay: number;
  by_shift: Record<string, number>;
  off_dates: string[];
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
  half_days: number;
  leave_days: number;
  off_days: number;
  payable_days: number;
  gross_pay: number;
  by_shift: Record<string, number>;
}

export interface PayrollRun {
  period: { month: string; start: string; end: string; days_in_month: number };
  totals: { employees: number; total_gross_pay: number };
  rows: PayrollRunRow[];
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

  payslip: (employee_id: string, month: string) =>
    http.get<Payslip>(endpoints.payroll.payslip, { employee_id, month }),

  payrollRun: (month: string, location_id?: string) =>
    http.get<PayrollRun>(endpoints.payroll.payslips, { month, location_id }),
};
