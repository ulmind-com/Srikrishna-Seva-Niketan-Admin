import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type {
  DutyReportItem,
  DutyReportSummary,
} from "@/services/reports.service";

export interface DutyExportInput {
  items: DutyReportItem[];
  summary?: DutyReportSummary;
  start: string;
  end: string;
  branchName: string;
}

const rupeePdf = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;

/** Human label for a payment model + its settlement state. */
function paymentLabel(r: DutyReportItem): string {
  if (r.payment_type !== "postpaid") return "Prepaid · Advance Paid";
  const collected = r.payment_status === "paid" || r.payment_status === "received";
  return collected ? "Postpaid · Cash Collected" : "Postpaid · Pending";
}

function shiftLabel(s: string): string {
  if (s === "full_24h") return "24 Hours";
  if (s === "day") return "Day";
  if (s === "night") return "Night";
  return s;
}

/** The full, ordered column set — shared by both PDF and Excel so the two
 * downloads carry exactly the same detail. */
function rowRecord(r: DutyReportItem): Record<string, string | number> {
  return {
    "Start Date": r.start_date,
    "End Date": r.end_date || "(ongoing)",
    "Duration (Days)": r.duration_days ?? 1,
    Shift: shiftLabel(r.shift),
    "Client (Patient)": r.customer_name,
    "Client Phone": r.customer_phone || "",
    "Service Staff": r.employee_name,
    "Staff Code": r.employee_code || "",
    "Posted At": r.place_name || r.place_type,
    Address: r.address || "",
    "Payment Model": paymentLabel(r),
    "Client Bill (INR)": r.customer_rate,
    "Staff Payout (INR)": r.employee_payout,
    "Expense (INR)": r.other_expense,
    "Net Profit (INR)": r.profit,
    "Margin %": r.margin_pct,
    "Duty Status": r.status,
    Response: r.acceptance_status,
    "Completed At": r.work_completed_at
      ? new Date(r.work_completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "",
    "Payment Received At": r.payment_received_at
      ? new Date(r.payment_received_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "",
    "Received By": r.payment_received_by || "",
    Branch: r.location_name,
  };
}

/** Build and download a full-detail PDF of the duty & payment report. */
export function downloadDutyReportPdf(input: DutyExportInput) {
  const { items, summary, start, end, branchName } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const marginX = 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Srikrishna Seva Niketan", marginX, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Duty & Payment Report", marginX, 56);
  doc.text(`Period: ${start}  to  ${end}`, marginX, 70);
  doc.text(`Branch: ${branchName}`, marginX, 84);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, marginX, 98);

  let y = 112;
  if (summary) {
    autoTable(doc, {
      startY: y,
      head: [["Total Duties", "Client Billed", "Staff Payout", "Expenses", "Net Profit", "Margin", "Prepaid", "Postpaid Collected", "Postpaid Pending"]],
      body: [[
        String(summary.total_duties),
        rupeePdf(summary.total_billed),
        rupeePdf(summary.total_staff_payout),
        rupeePdf(summary.total_expenses),
        rupeePdf(summary.total_profit),
        `${summary.overall_margin_pct}%`,
        rupeePdf(summary.prepaid_total),
        rupeePdf(summary.postpaid_collected),
        rupeePdf(summary.postpaid_pending),
      ]],
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [20, 110, 120], fontSize: 7 },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  const records = items.map(rowRecord);
  const headers = records.length ? Object.keys(records[0]) : [];
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: records.map((rec) => headers.map((h) => String(rec[h] ?? ""))),
    theme: "striped",
    styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [20, 110, 120], fontSize: 6 },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`duty_report_${start}_to_${end}.pdf`);
}

/** Build and download a full-detail Excel (.xlsx) of the duty & payment report. */
export function downloadDutyReportXlsx(input: DutyExportInput) {
  const { items, summary, start, end, branchName } = input;
  const wb = XLSX.utils.book_new();

  const detail = XLSX.utils.json_to_sheet(items.map(rowRecord));
  XLSX.utils.book_append_sheet(wb, detail, "Duties");

  const summaryRows: (string | number)[][] = [
    ["Srikrishna Seva Niketan — Duty & Payment Report"],
    ["Period", `${start} to ${end}`],
    ["Branch", branchName],
    ["Generated", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
    [],
  ];
  if (summary) {
    summaryRows.push(
      ["Total Duties", summary.total_duties],
      ["Client Billed (INR)", summary.total_billed],
      ["Staff Payout (INR)", summary.total_staff_payout],
      ["Expenses (INR)", summary.total_expenses],
      ["Net Profit (INR)", summary.total_profit],
      ["Overall Margin %", summary.overall_margin_pct],
      ["Prepaid Engagements (INR)", summary.prepaid_total],
      ["Prepaid Count", summary.prepaid_count],
      ["Postpaid Cash Collected (INR)", summary.postpaid_collected],
      ["Postpaid Pending Cash (INR)", summary.postpaid_pending],
      ["Postpaid Count", summary.postpaid_count],
    );
  }
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  XLSX.writeFile(wb, `duty_report_${start}_to_${end}.xlsx`);
}
