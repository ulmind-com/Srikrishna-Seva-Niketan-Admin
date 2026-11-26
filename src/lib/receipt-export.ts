import { jsPDF } from "jspdf";
import { formatSlashDateIST, monthLabelIST, nowIST } from "@/lib/ist-datetime";
import { formatBillNo } from "@/lib/utils";

const EMERALD: [number, number, number] = [15, 118, 110];
const INDIGO: [number, number, number] = [67, 56, 202];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

const rupee = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;
const modeText = (m?: string | null) => (m || "cash").replace(/_/g, " ").toUpperCase();

export interface ClientReceiptPdfData {
  receipt_no?: string | null;
  customer_name: string;
  phone?: string | null;
  location_name?: string | null;
  bill_no?: number | null;
  bill_no_formatted?: string | null;
  amount: number;
  date?: string | null;
  mode: string;
  transaction_id?: string | null;
  note?: string | null;
  invoiced_amount?: number;
  total_received?: number;
  outstanding_amount?: number;
  received_by?: string | null;
}

/** Generate downloadable A5/A4 Official Client Payment Receipt PDF (`RCP-001`...). */
export function downloadClientReceiptPdf(data: ClientReceiptPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a5", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;

  // Header bar
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 56, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SRIKRISHNA SEVA NIKETAN", marginX, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 245, 240);
  doc.text("KOLKATA 700012  |  Mob: 8537861040", marginX, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("PAYMENT RECEIPT", pageWidth - marginX, 26, { align: "right" });
  doc.setFontSize(10);
  doc.text(data.receipt_no || "RCP-DRAFT", pageWidth - marginX, 42, { align: "right" });

  // Outer card border
  doc.setDrawColor(210, 222, 228);
  doc.setLineWidth(1);
  doc.roundedRect(marginX, 72, pageWidth - marginX * 2, pageHeight - 104, 6, 6);

  let y = 96;
  const colRightX = pageWidth - marginX - 18;
  const colLeftX = marginX + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("RECEIVED WITH THANKS FROM", colLeftX, y);
  doc.text("RECEIPT DETAILS", colRightX, y, { align: "right" });

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SLATE);
  doc.text(data.customer_name, colLeftX, y);
  doc.setFontSize(10);
  doc.text(`Date: ${formatSlashDateIST(data.date || nowIST().toISODate())}`, colRightX, y, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  if (data.phone) doc.text(`Phone: ${data.phone}`, colLeftX, y);
  const billLabel = data.bill_no_formatted || (data.bill_no ? formatBillNo(data.bill_no) : "On Account");
  doc.text(`Bill / Invoice: ${billLabel}`, colRightX, y, { align: "right" });

  y += 14;
  if (data.location_name) doc.text(`Branch: ${data.location_name}`, colLeftX, y);
  doc.text(`Mode: ${modeText(data.mode)}${data.transaction_id ? ` (Ref: ${data.transaction_id})` : ""}`, colRightX, y, {
    align: "right",
  });

  // Amount box
  y += 22;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(...EMERALD);
  doc.roundedRect(colLeftX, y, pageWidth - marginX * 2 - 36, 52, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...EMERALD);
  doc.text("AMOUNT RECEIVED", colLeftX + 16, y + 18);

  doc.setFontSize(18);
  doc.text(rupee(data.amount), colLeftX + 16, y + 40);

  if (typeof data.outstanding_amount === "number") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(
      `Total Billed: ${rupee(data.invoiced_amount ?? 0)}   |   Paid to Date: ${rupee(data.total_received ?? data.amount)}   |   Balance Due: ${rupee(data.outstanding_amount)}`,
      colRightX - 14,
      y + 32,
      { align: "right" }
    );
  }

  y += 72;
  if (data.note) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Note: ${data.note}`, colLeftX, y);
  }

  // Footer
  const fy = pageHeight - 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${nowIST().toFormat("dd/MM/yyyy hh:mm a")} IST${data.received_by ? `  |  Collected by: ${data.received_by}` : ""}`,
    colLeftX,
    fy
  );
  doc.line(colRightX - 130, fy - 10, colRightX, fy - 10);
  doc.text("Authorized Signatory", colRightX, fy, { align: "right" });

  const safeCust = data.customer_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeNo = (data.receipt_no || "receipt").toLowerCase();
  doc.save(`${safeNo}-${safeCust}.pdf`);
}

export interface StaffVoucherPdfData {
  voucher_no?: string | null;
  employee_name: string;
  code?: string | null;
  category?: string | null;
  month?: string | null;
  amount: number;
  date?: string | null;
  mode: string;
  transaction_id?: string | null;
  paid_by?: string | null;
  note?: string | null;
  salary_due?: number;
  total_paid?: number;
  remaining_amount?: number;
}

/** Generate downloadable Official Staff Salary Payout Voucher PDF (`PAY-001`...). */
export function downloadStaffVoucherPdf(data: StaffVoucherPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a5", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 56, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SRIKRISHNA SEVA NIKETAN", marginX, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text("Staff Payroll & Disbursement Voucher", marginX, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("SALARY VOUCHER", pageWidth - marginX, 26, { align: "right" });
  doc.setFontSize(10);
  doc.text(data.voucher_no || "PAY-DRAFT", pageWidth - marginX, 42, { align: "right" });

  doc.setDrawColor(210, 222, 228);
  doc.setLineWidth(1);
  doc.roundedRect(marginX, 72, pageWidth - marginX * 2, pageHeight - 104, 6, 6);

  let y = 96;
  const colRightX = pageWidth - marginX - 18;
  const colLeftX = marginX + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("PAID TO STAFF MEMBER", colLeftX, y);
  doc.text("VOUCHER DETAILS", colRightX, y, { align: "right" });

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...SLATE);
  doc.text(data.employee_name, colLeftX, y);
  doc.setFontSize(10);
  doc.text(`Date: ${formatSlashDateIST(data.date || nowIST().toISODate())}`, colRightX, y, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const subInfo = [data.code, data.category].filter(Boolean).join(" · ");
  if (subInfo) doc.text(subInfo, colLeftX, y);
  doc.text(`Salary Month: ${data.month ? monthLabelIST(data.month) : "—"}`, colRightX, y, { align: "right" });

  y += 14;
  doc.text(`Mode: ${modeText(data.mode)}${data.transaction_id ? ` (Ref: ${data.transaction_id})` : ""}`, colRightX, y, {
    align: "right",
  });

  y += 22;
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(...INDIGO);
  doc.roundedRect(colLeftX, y, pageWidth - marginX * 2 - 36, 52, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INDIGO);
  doc.text("AMOUNT PAID", colLeftX + 16, y + 18);

  doc.setFontSize(18);
  doc.text(rupee(data.amount), colLeftX + 16, y + 40);

  if (typeof data.remaining_amount === "number") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(
      `Salary Due: ${rupee(data.salary_due ?? 0)}   |   Paid Total: ${rupee(data.total_paid ?? data.amount)}   |   Balance Due: ${rupee(data.remaining_amount)}`,
      colRightX - 14,
      y + 32,
      { align: "right" }
    );
  }

  y += 72;
  if (data.note) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Note: ${data.note}`, colLeftX, y);
  }

  const fy = pageHeight - 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated ${nowIST().toFormat("dd/MM/yyyy hh:mm a")} IST${data.paid_by ? `  |  Authorized by: ${data.paid_by}` : ""}`,
    colLeftX,
    fy
  );
  doc.line(colRightX - 130, fy - 10, colRightX, fy - 10);
  doc.text("Staff / Authorized Signature", colRightX, fy, { align: "right" });

  const safeName = data.employee_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeNo = (data.voucher_no || "voucher").toLowerCase();
  doc.save(`${safeNo}-${safeName}.pdf`);
}
