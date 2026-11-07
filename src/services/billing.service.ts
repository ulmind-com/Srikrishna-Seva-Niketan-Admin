import { http } from "./api/http";
import { endpoints } from "./api/endpoints";

export interface MonthlyBillLineItem {
  assignment_id: string;
  from: string;
  to: string;
  shift: string;
  shift_label: string;
  start_time?: string | null;
  end_time?: string | null;
  days: number;
  daily_rate: number;
  amount: number;
}

export interface MonthlyBillGroup {
  key: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_alt_phone?: string | null;
  customer_address?: string | null;
  location_id: string;
  location_name?: string | null;
  line_items: MonthlyBillLineItem[];
  total_days: number;
  total_amount: number;
  bill_no?: number | null;
}

export interface MonthlyBillsResponse {
  month: string;
  totals: { bills: number; total_days: number; total_amount: number };
  bills: MonthlyBillGroup[];
}

export const billingService = {
  monthly: (month: string, location_id?: string) =>
    http.get<MonthlyBillsResponse>(endpoints.billing.monthly, {
      month,
      ...(location_id ? { location_id } : {}),
    }),

  issueMonthly: (month: string, employee_id: string, customer_id: string) =>
    http.post<{ bill_no: number }>(endpoints.billing.issueMonthly, {
      month,
      employee_id,
      customer_id,
    }),
};
