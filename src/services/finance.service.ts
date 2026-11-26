import { endpoints } from "./api/endpoints";
import { http } from "./api/http";

export type PaymentMode = "cash" | "upi" | "bank_transfer" | "card" | "cheque";

export interface ClientInvoiceEntry {
  assignment_id: string;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  employee_name: string;
  start_date: string;
  end_date?: string | null;
  days_worked: number;
  invoiced_amount: number;
  received_amount: number;
  outstanding_amount: number;
  status: "paid" | "partial" | "pending" | string;
}

export interface ClientReceiptEntry {
  id: string;
  receipt_no?: string | null;
  assignment_id?: string | null;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  amount: number;
  date?: string | null;
  mode: PaymentMode | string;
  transaction_id?: string | null;
  note?: string | null;
}

export interface ClientLedgerRow {
  customer_id: string;
  customer_name: string;
  phone?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  invoiced_amount: number;
  received_amount: number;
  outstanding_amount: number;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  payment_count: number;
  last_payment_date?: string | null;
  status: "paid" | "partial" | "pending" | "advance" | "no_bill" | string;
  invoices: ClientInvoiceEntry[];
  receipts: ClientReceiptEntry[];
}

export interface ClientLedgerResponse {
  summary: {
    total_billed: number;
    total_received: number;
    total_outstanding: number;
    collection_rate_pct: number;
    client_count: number;
    paid_clients: number;
    partial_clients: number;
    unpaid_clients: number;
  };
  clients: ClientLedgerRow[];
}

export interface StaffPayoutEntry {
  id: string;
  voucher_no?: string | null;
  amount: number;
  date?: string | null;
  month?: string | null;
  mode: PaymentMode | string;
  transaction_id?: string | null;
  paid_by?: string | null;
  note?: string | null;
}

export interface StaffLedgerRow {
  employee_id: string;
  employee_name: string;
  code: string;
  category: string;
  location_id: string;
  daily_rate?: number | null;
  worked_days: number;
  payable_days: number;
  salary_due: number;
  paid_amount: number;
  remaining_amount: number;
  status: "paid" | "partial" | "pending" | "advance" | "no_due" | string;
  payment_count: number;
  last_payment_date?: string | null;
  payments: StaffPayoutEntry[];
}

export interface StaffLedgerResponse {
  month: string;
  period: { start: string; end: string };
  summary: {
    total_salary_due: number;
    total_paid: number;
    total_remaining: number;
    staff_count: number;
    paid_staff: number;
    partial_staff: number;
    unpaid_staff: number;
  };
  staff: StaffLedgerRow[];
}

export interface PaymentHistoryItem {
  id: string;
  kind: "client_receipt" | "staff_salary" | "expense" | string;
  direction: "incoming" | "outgoing" | string;
  ref_no: string;
  party_id?: string | null;
  party_name: string;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  assignment_id?: string | null;
  month?: string | null;
  amount: number;
  date?: string | null;
  mode: string;
  transaction_id?: string | null;
  note?: string | null;
  location_id?: string | null;
  created_at?: string | null;
}

export interface PaymentHistoryResponse {
  summary: {
    total_incoming: number;
    total_staff_paid: number;
    total_expenses: number;
    total_outgoing: number;
    net_cash_flow: number;
    count: number;
  };
  items: PaymentHistoryItem[];
}

export interface CreateClientPaymentPayload {
  customer_id: string;
  assignment_id?: string | null;
  monthly_bill_id?: string | null;
  bill_no?: number | null;
  amount: number;
  date?: string;
  mode: PaymentMode;
  status?: "paid" | "partial" | "pending";
  transaction_id?: string;
  note?: string;
}

export interface CreateStaffPaymentPayload {
  employee_id: string;
  month?: string;
  assignment_id?: string | null;
  amount: number;
  date?: string;
  mode: PaymentMode;
  transaction_id?: string;
  note?: string;
}

export interface CreatedPaymentResponse {
  id: string;
  receipt_no?: string | null;
  customer_id: string;
  customer_name: string;
  assignment_id?: string | null;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  amount: number;
  date: string;
  mode: string;
  status: string;
  transaction_id?: string | null;
  received_by?: string | null;
  note?: string | null;
}

export interface CreatedStaffPaymentResponse {
  id: string;
  voucher_no?: string | null;
  employee_id: string;
  employee_name: string;
  month?: string | null;
  amount: number;
  date: string;
  mode: string;
  transaction_id?: string | null;
  paid_by?: string | null;
  note?: string | null;
}

export const financeService = {
  clientLedger: (params?: {
    start?: string;
    end?: string;
    location_id?: string;
    customer_id?: string;
  }) => http.get<ClientLedgerResponse>(endpoints.payments.clientLedger, params),

  recordClientPayment: (payload: CreateClientPaymentPayload) =>
    http.post<CreatedPaymentResponse>(endpoints.payments.root, payload),

  deleteClientPayment: (id: string) =>
    http.del<{ success: boolean }>(`${endpoints.payments.root}/${id}`),

  staffLedger: (params?: {
    month?: string;
    start?: string;
    end?: string;
    location_id?: string;
  }) => http.get<StaffLedgerResponse>(endpoints.payments.staffLedger, params),

  recordStaffPayment: (payload: CreateStaffPaymentPayload) =>
    http.post<CreatedStaffPaymentResponse>(endpoints.payments.staff, payload),

  deleteStaffPayment: (id: string) =>
    http.del<{ success: boolean }>(endpoints.payments.staffItem(id)),

  history: (params?: {
    start?: string;
    end?: string;
    location_id?: string;
    direction?: string;
    mode?: string;
    search?: string;
  }) => http.get<PaymentHistoryResponse>(endpoints.payments.history, params),
};
