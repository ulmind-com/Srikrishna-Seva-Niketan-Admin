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

export interface DutyReportItem {
  id: string;
  start_date: string;
  end_date?: string | null;
  duration_days?: number | null;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  shift: string;
  place_type: string;
  place_name?: string | null;
  address?: string | null;
  payment_type: "prepaid" | "postpaid" | string;
  payment_status: string;
  customer_rate: number;
  employee_payout: number;
  other_expense: number;
  profit: number;
  margin_pct: number;
  status: string;
  acceptance_status: string;
  work_completed_at?: string | null;
  payment_received_at?: string | null;
  payment_received_by?: string | null;
  location_id: string;
  location_name: string;
}

export interface DutyReportSummary {
  total_duties: number;
  total_billed: number;
  total_staff_payout: number;
  total_expenses: number;
  total_profit: number;
  overall_margin_pct: number;
  prepaid_count: number;
  prepaid_total: number;
  postpaid_count: number;
  postpaid_total: number;
  postpaid_collected: number;
  postpaid_pending: number;
}

export interface DutyReport {
  summary: DutyReportSummary;
  items: DutyReportItem[];
}

interface ReportParams {
  start?: string;
  end?: string;
  location_id?: string;
  on?: string;
  payment_type?: string;
  status?: string;
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
  duties: (params?: ReportParams) =>
    http.get<DutyReport>(endpoints.reports.duties, params),
  sendDailyEmail: () =>
    http.post<{ success: boolean }>(endpoints.reports.dailyEmail),
};
