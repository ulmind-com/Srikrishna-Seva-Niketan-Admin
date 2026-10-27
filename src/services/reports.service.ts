import { endpoints } from "./api/endpoints";
import { http } from "./api/http";

export interface Payslip {
  employee_id: string;
  employee_name: string;
  total_payout: number;
  engagements: number;
}

export interface ProfitLossReport {
  income: number; // alias for revenue (kept for compatibility)
  revenue: number;
  staff_payout: number;
  assignment_expense: number;
  general_expense: number;
  expense: number; // total expense
  profit: number;
  margin_pct: number;
  expense_by_category: Record<string, number>;
  assignment_count: number;
  expense_count: number;
  payslips: Payslip[];
}

export interface DistributionRow {
  customer_id: string;
  customer_name: string;
  phone?: string | null;
  address?: string | null;
  staff_count: number;
  staff: { employee_id: string; employee_name: string; shift: string }[];
}

export interface DistributionReport {
  total_staff: number;
  total_customers: number;
  assigned_staff: number;
  free_staff_count: number;
  customers: DistributionRow[];
  free_staff: { employee_id: string; name: string; phone: string; category: string }[];
}

export interface CustomerPaymentRow {
  customer_id: string;
  customer_name: string;
  phone?: string | null;
  total_paid: number;
  pending: number;
  payment_count: number;
  last_payment?: string | null;
}

export interface CustomerPaymentsReport {
  total_paid: number;
  total_pending: number;
  customers: CustomerPaymentRow[];
}

export interface DailySummaryReport {
  date: string;
  total_staff: number;
  available_staff: number;
  assigned_staff: number;
  on_leave_staff: number;
  inactive_staff: number;
  active_customers: number;
  todays_shifts: number;
  vacancies: number;
  status_breakdown: Record<string, number>;
}

interface ReportParams {
  start?: string;
  end?: string;
  location_id?: string;
  on?: string;
  [key: string]: string | undefined;
}

export const reportsService = {
  profitLoss: (params?: ReportParams) =>
    http.get<ProfitLossReport>(endpoints.reports.profitLoss, params),
  distribution: (params?: ReportParams) =>
    http.get<DistributionReport>(endpoints.reports.distribution, params),
  customerPayments: (params?: ReportParams) =>
    http.get<CustomerPaymentsReport>(endpoints.reports.customerPayments, params),
  dailySummary: (params?: ReportParams) =>
    http.get<DailySummaryReport>(endpoints.reports.dailySummary, params),
  sendDailyEmail: () =>
    http.post<{ success: boolean }>(endpoints.reports.dailyEmail),
};
