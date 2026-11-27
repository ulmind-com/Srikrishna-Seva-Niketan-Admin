import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { StaffStatementResponse } from "@/services/finance.service";
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

/**
 * Bank-statement style A4 Staff Salary & Payment Statement PDF for any [From Date → To Date].
 * Shows period summary, chronological passbook (duties earned vs payouts with running balance),
 * and full payment voucher history.
 */
export function downloadStaffStatementPdf(stmt: StaffStatementResponse) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ROSE: [number, number, number] = [190, 18, 60];

  // Top Header Banner
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 58, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SRIKRISHNA SEVA NIKETAN", marginX, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text("KOLKATA 700012  |  Mob: 8537861040", marginX, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("STAFF PAYMENT STATEMENT", pageWidth - marginX, 25, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `${formatSlashDateIST(stmt.period.start)}  to  ${formatSlashDateIST(stmt.period.end)}`,
    pageWidth - marginX,
    42,
    { align: "right" }
  );

  // Staff Meta Block
  let y = 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text(stmt.employee.name, marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const subParts = [
    stmt.employee.code,
    stmt.employee.category,
    stmt.employee.phone ? `Mob: ${stmt.employee.phone}` : null,
    stmt.employee.location_name,
  ].filter(Boolean);
  doc.text(subParts.join("  ·  "), marginX, y + 15);

  doc.text(
    `Generated: ${nowIST().toFormat("dd/MM/yyyy hh:mm a")} IST`,
    pageWidth - marginX,
    y,
    { align: "right" }
  );
  doc.text(
    `Daily Rate: ${stmt.employee.daily_rate ? `${rupee(stmt.employee.daily_rate)}/day` : "—"}`,
    pageWidth - marginX,
    y + 15,
    { align: "right" }
  );

  const s = stmt.summary;
  const statusText =
    s.status === "paid"
      ? "PAID IN FULL"
      : s.status === "partial"
      ? "PARTIAL PAID"
      : s.status === "advance"
      ? "ADVANCE PAID"
      : s.status === "no_due"
      ? "NO DUES"
      : "PENDING";

  // Summary KPI Grid
  autoTable(doc, {
    startY: y + 28,
    head: [
      [
        "Payable Days",
        "Present / Half",
        "Salary Earned",
        "Total Paid",
        s.advance_amount > 0 ? "Advance Paid" : "Balance Remaining",
        "Status",
      ],
    ],
    body: [
      [
        String(s.payable_days),
        `${s.present_days}P / ${s.half_days}H`,
        rupee(s.salary_due),
        rupee(s.paid_amount),
        rupee(s.advance_amount > 0 ? s.advance_amount : s.remaining_amount),
        statusText,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 6, halign: "center", textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: {
      2: { fontStyle: "bold" },
      3: { textColor: EMERALD, fontStyle: "bold" },
      4: { textColor: s.remaining_amount > 0 ? ROSE : EMERALD, fontStyle: "bold" },
      5: { fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX },
  });

  let nextY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  // Section 1: Bank-Statement Passbook Ledger (Earnings + Payouts + Running Balance)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text("ACCOUNT STATEMENT PASSBOOK (DATE-WISE LEDGER)", marginX, nextY);

  autoTable(doc, {
    startY: nextY + 8,
    head: [["Date", "Ref / Voucher", "Particulars", "Earned (+)", "Paid (-)", "Balance"]],
    body:
      stmt.passbook.length > 0
        ? stmt.passbook.map((row) => [
            formatSlashDateIST(row.date),
            row.ref_no,
            row.particulars,
            row.credit > 0 ? rupee(row.credit) : "—",
            row.debit > 0 ? rupee(row.debit) : "—",
            row.running_balance < 0
              ? `Adv ${rupee(Math.abs(row.running_balance))}`
              : rupee(row.running_balance),
          ])
        : [["—", "—", "No duties or payouts recorded in this date range.", "—", "—", "—"]],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4, textColor: SLATE },
    headStyles: { fillColor: INDIGO, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 70, fontStyle: "bold" },
      2: { cellWidth: 205 },
      3: { halign: "right", cellWidth: 62 },
      4: { halign: "right", cellWidth: 62 },
      5: { halign: "right", cellWidth: 62, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && stmt.passbook[data.row.index]) {
        const raw = stmt.passbook[data.row.index];
        if (raw.entry_type === "payout") {
          data.cell.styles.fillColor = [238, 242, 255];
          if (data.column.index === 4) {
            data.cell.styles.textColor = INDIGO;
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
    foot: [
      [
        {
          content: "STATEMENT TOTAL",
          colSpan: 3,
          styles: { halign: "right", fontStyle: "bold", fillColor: [241, 245, 249], textColor: SLATE },
        },
        {
          content: rupee(s.salary_due),
          styles: { halign: "right", fontStyle: "bold", fillColor: [241, 245, 249], textColor: SLATE },
        },
        {
          content: rupee(s.paid_amount),
          styles: { halign: "right", fontStyle: "bold", fillColor: [238, 242, 255], textColor: INDIGO },
        },
        {
          content:
            s.advance_amount > 0
              ? `Adv ${rupee(s.advance_amount)}`
              : s.remaining_amount === 0
              ? "Rs 0"
              : rupee(s.remaining_amount),
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: s.remaining_amount > 0 ? [255, 228, 230] : [220, 252, 231],
            textColor: s.remaining_amount > 0 ? ROSE : EMERALD,
          },
        },
      ],
    ],
    showFoot: "lastPage",
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber}   |   Srikrishna Seva Niketan   |   Staff Payment Statement`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
    },
  });

  nextY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  // Section 2: Payment Vouchers / Slips Breakdown (if any)
  if (stmt.payments.length > 0) {
    if (nextY > pageHeight - 120) {
      doc.addPage();
      nextY = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(`PAYMENT VOUCHERS / SLIPS (${stmt.payments.length})`, marginX, nextY);

    autoTable(doc, {
      startY: nextY + 8,
      head: [["Date", "Voucher No", "Mode & Txn Ref", "Paid By & Note", "Amount Paid"]],
      body: stmt.payments.map((p) => [
        formatSlashDateIST(p.date || ""),
        p.voucher_no,
        `${modeText(p.mode)}${p.transaction_id ? ` · ${p.transaction_id}` : ""}`,
        [p.paid_by, p.note].filter(Boolean).join(" — ") || "—",
        rupee(p.amount),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, textColor: SLATE },
      headStyles: { fillColor: SLATE, textColor: 255, fontSize: 8, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 68, fontStyle: "bold", textColor: INDIGO },
        2: { cellWidth: 130 },
        3: { cellWidth: 185 },
        4: { halign: "right", cellWidth: 76, fontStyle: "bold", textColor: INDIGO },
      },
      margin: { left: marginX, right: marginX },
    });

    nextY =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 36;
  } else {
    nextY += 24;
  }

  if (nextY < pageHeight - 50) {
    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - marginX - 160, nextY, pageWidth - marginX, nextY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Authorised Signature", pageWidth - marginX, nextY + 12, { align: "right" });
  }

  const safeName = stmt.employee.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`staff_statement_${safeName}_${stmt.period.start}_to_${stmt.period.end}.pdf`);
}
