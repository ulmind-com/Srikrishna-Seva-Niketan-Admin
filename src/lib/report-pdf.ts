import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  ProfitLossReport,
  DistributionReport,
  CustomerPaymentsReport,
} from "@/services/reports.service";

const rupee = (n?: number | null) =>
  `Rs ${(n ?? 0).toLocaleString("en-IN")}`;

export interface ReportPdfInput {
  periodLabel: string;
  start: string;
  end: string;
  branchName: string;
  pnl?: ProfitLossReport;
  payments?: CustomerPaymentsReport;
  distribution?: DistributionReport;
}

/**
 * Build and download a one-click PDF of the current report — P&L, payslips,
 * payments and staff distribution for the selected period and branch.
 *
 * Uses jsPDF + autotable (no server round-trip) so the super admin can save a
 * weekly / monthly / yearly report exactly as seen on screen.
 */
export function downloadReportPdf(input: ReportPdfInput) {
  const { periodLabel, start, end, branchName, pnl, payments, distribution } =
    input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Srikrishna Seva Niketan", marginX, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Nursing & Home Health Care — Financial Report", marginX, 62);
  doc.setTextColor(40);
  doc.text(`Period: ${periodLabel} (${start} to ${end})`, marginX, 80);
  doc.text(`Branch: ${branchName}`, marginX, 94);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    pageW - marginX,
    80,
    { align: "right" },
  );

  let y = 118;

  // ---- P&L summary ----
  if (pnl) {
    const margin =
      pnl.income > 0 ? Math.round((pnl.profit / pnl.income) * 100) : 0;
    autoTable(doc, {
      startY: y,
      head: [["Profit & Loss", "Amount"]],
      body: [
        ["Income (collected)", rupee(pnl.income)],
        ["Expense", rupee(pnl.expense)],
        ["Profit / Loss", rupee(pnl.profit)],
        ["Margin", `${margin}%`],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 20;

    const expenseRows = Object.entries(pnl.expense_by_category ?? {});
    if (expenseRows.length) {
      autoTable(doc, {
        startY: y,
        head: [["Expense Category", "Amount"]],
        body: expenseRows.map(([k, v]) => [k, rupee(v)]),
        theme: "striped",
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 20;
    }

    if (pnl.payslips?.length) {
      autoTable(doc, {
        startY: y,
        head: [["Staff Payslip", "Engagements", "Payout"]],
        body: pnl.payslips.map((s) => [
          s.employee_name,
          String(s.engagements),
          rupee(s.total_payout),
        ]),
        theme: "striped",
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 20;
    }
  }

  // ---- Payments ----
  if (payments) {
    autoTable(doc, {
      startY: y,
      head: [["Customer Payment", "Paid", "Pending"]],
      body: [
        ...payments.customers.map((c) => [
          c.customer_name,
          rupee(c.total_paid),
          rupee(c.pending),
        ]),
        ["TOTAL", rupee(payments.total_paid), rupee(payments.total_pending)],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      footStyles: { fontStyle: "bold" },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 20;
  }

  // ---- Distribution ----
  if (distribution) {
    autoTable(doc, {
      startY: y,
      head: [["Staff Deployment", "Count"]],
      body: [
        ["Total staff", String(distribution.total_staff)],
        ["Assigned (distributed)", String(distribution.assigned_staff)],
        ["Free (vacancy)", String(distribution.free_staff_count)],
        ["Active customers", String(distribution.total_customers)],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      margin: { left: marginX, right: marginX },
    });
  }

  const safePeriod = periodLabel.replace(/\s+/g, "-").toLowerCase();
  doc.save(`report-${safePeriod}-${start}_${end}.pdf`);
}
