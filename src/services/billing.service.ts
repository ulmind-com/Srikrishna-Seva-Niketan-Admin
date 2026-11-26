import { http } from "./api/http";
import { endpoints } from "./api/endpoints";

export interface MonthlyBillLineItem {
  assignment_id: string;
  employee_id?: string;
  employee_name?: string;
  employee_code?: string | null;
  employee_category?: string | null;
  from: string;
  to: string;
  from_time?: string | null;
  to_time?: string | null;
  shift: string;
  shift_label: string;
  start_time?: string | null;
  end_time?: string | null;
  days: number;
  daily_rate: number;
  amount: number;
  is_ongoing?: boolean;
  is_replacement?: boolean;
  replacement_reason?: string | null;
  replacement_for_employee_name?: string | null;
  replaced_by_employee_name?: string | null;
}

export interface MonthlyBillGroup {
  key: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  employee_names?: string[];
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_alt_phone?: string | null;
  customer_address?: string | null;
  location_id: string;
  location_name?: string | null;
  branch_phone?: string | null;
  branch_city?: string | null;
  branch_pincode?: string | null;
  start_date?: string;
  end_date?: string;
  line_items: MonthlyBillLineItem[];
  total_days: number;
  total_amount: number;
  bill_no?: number | null;
}

export interface MonthlyBillsResponse {
  month?: string;
  period?: { start: string; end: string; label: string };
  totals: { bills: number; total_days: number; total_amount: number };
  bills: MonthlyBillGroup[];
}

export const billingService = {
  monthly: (
    month?: string,
    location_id?: string,
    start_date?: string,
    end_date?: string,
    customer_id?: string
  ) =>
    http.get<MonthlyBillsResponse>(endpoints.billing.monthly, {
      ...(month ? { month } : {}),
      ...(start_date ? { start_date } : {}),
      ...(end_date ? { end_date } : {}),
      ...(location_id && location_id !== "all" ? { location_id } : {}),
      ...(customer_id && customer_id !== "all" ? { customer_id } : {}),
    }),

  issueMonthly: (
    month: string,
    customer_id: string,
    employee_id?: string,
    start_date?: string,
    end_date?: string
  ) =>
    http.post<{ bill_no: number }>(endpoints.billing.issueMonthly, {
      month,
      customer_id,
      employee_id,
      ...(start_date ? { start_date } : {}),
      ...(end_date ? { end_date } : {}),
    }),
};
