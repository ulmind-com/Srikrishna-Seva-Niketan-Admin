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
  if (r.payment_type !== "postpaid") {
    return "Prepaid (Advance Paid)";
  }
  const collected = r.payment_status === "paid" || r.payment_status === "received";
  return collected ? "Postpaid (Cash Collected)" : "Postpaid (Pending Collection)";
}

function shiftLabel(s: string): string {
  if (s === "full_24h") return "24 Hours";
  if (s === "day") return "Day Shift";
  if (s === "night") return "Night Shift";
  return s;
}

/** Build and download a full-detail PDF of the duty & payment report. */
export function downloadDutyReportPdf(input: DutyExportInput) {
  const { items, summary, start, end, branchName } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const marginX = 24;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- Header Banner ----
  doc.setFillColor(15, 118, 110); // Emerald teal
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SHRI KRISHNA NURSING CARE SERVICES", marginX, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 245, 240);
  doc.text("Detailed Duty Engagements, Patient Billing & Staff Payout Ledger", pageWidth - marginX, 26, {
    align: "right",
  });

  // ---- Sub-Header Metadata ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Report Period: ${start}  to  ${end}`, marginX, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Branch: ${branchName}   |   Total Duties: ${items.length}`, marginX, 74);
  doc.text(
    `Generated On: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    pageWidth - marginX,
    60,
    { align: "right" }
  );

  let startY = 88;

  // ---- Financial Summary Table (KPIs) ----
  if (summary) {
    autoTable(doc, {
      startY,
      head: [
        [
          "Total Duties",
          "Client Billed",
          "Staff Payout",
          "Other Expenses",
          "Net Company Profit",
          "Margin %",
          "Prepaid (Advance)",
          "Postpaid Collected",
          "Postpaid Pending",
        ],
      ],
      body: [
        [
          String(summary.total_duties),
          rupeePdf(summary.total_billed),
          rupeePdf(summary.total_staff_payout),
          rupeePdf(summary.total_expenses),
          rupeePdf(summary.total_profit),
          `${summary.overall_margin_pct}%`,
          rupeePdf(summary.prepaid_total),
          rupeePdf(summary.postpaid_collected),
          rupeePdf(summary.postpaid_pending),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 8, fontStyle: "bold", halign: "center", cellPadding: 4 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59] },
      columnStyles: {
        1: { textColor: [16, 149, 90] }, // billed
        2: { textColor: [225, 29, 72] }, // payout
        3: { textColor: [225, 29, 72] }, // expenses
        4: { textColor: (summary.total_profit ?? 0) >= 0 ? [16, 149, 90] : [225, 29, 72] },
        8: { textColor: [217, 119, 6] }, // pending
      },
      margin: { left: marginX, right: marginX },
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ---- Detailed Rows ----
  const rows = items.map((r, idx) => {
    const isPostpaid = r.payment_type === "postpaid";
    const collected = r.payment_status === "paid" || r.payment_status === "received";
    const statusNote = !isPostpaid
      ? "Prepaid · Advance"
      : collected
      ? "Postpaid · Collected"
      : "Postpaid · Pending";

    const periodStr = `${r.start_date}${r.end_date ? "\n→ " + r.end_date : "\n(ongoing)"}\n${shiftLabel(
      r.shift
    )} (${r.duration_days ?? 1}d)`;

    const patientStr = `${r.customer_name}\n${r.customer_phone || ""}${
      r.place_name || r.address ? "\n" + (r.place_name || r.address) : ""
    }`;

    const nurseStr = `${r.employee_name}\n${r.employee_code || "Staff"}\n${r.location_name}`;

    return [
      String(idx + 1),
      periodStr,
      patientStr,
      nurseStr,
      rupeePdf(r.customer_rate),
      rupeePdf(r.employee_payout),
      rupeePdf(r.other_expense),
      `${rupeePdf(r.profit)}\n(${r.margin_pct}%)`,
      statusNote,
      `${r.status.toUpperCase()}${r.work_completed_at ? "\nDone: " + r.work_completed_at.slice(0, 10) : ""}`,
    ];
  });

  // Total summary footer row
  if (summary) {
    rows.push([
      "TOTAL",
      `${items.length} Duty Engagements`,
      "—",
      "—",
      rupeePdf(summary.total_billed),
      rupeePdf(summary.total_staff_payout),
      rupeePdf(summary.total_expenses),
      `${rupeePdf(summary.total_profit)}\n(${summary.overall_margin_pct}%)`,
      `Prepaid: ${rupeePdf(summary.prepaid_total)}\nPending: ${rupeePdf(summary.postpaid_pending)}`,
      "—",
    ]);
  }

  autoTable(doc, {
    startY,
    head: [
      [
        "#",
        "Dates & Shift",
        "Patient / Client Details",
        "Assigned Nurse",
        "Client Bill",
        "Nurse Pay",
        "Expense",
        "Net Profit",
        "Payment Status",
        "Duty Status",
      ],
    ],
    body: rows,
    theme: "striped",
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      overflow: "linebreak",
      valign: "middle",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 88 },
      2: { cellWidth: 145 },
      3: { cellWidth: 110 },
      4: { cellWidth: 65, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 62, halign: "right" },
      6: { cellWidth: 50, halign: "right" },
      7: { cellWidth: 75, halign: "right", fontStyle: "bold" },
      8: { cellWidth: 105 },
      9: { cellWidth: 65, halign: "center" },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      // Footer page numbering
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber}   |   Shri Krishna Nursing Care Services   |   Confidential`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: "center" }
      );
    },
  });

  doc.save(`detailed_duty_report_${start}_to_${end}.pdf`);
}

/** Build and download a full-detail Excel (.xlsx) of the duty & payment report. */
export function downloadDutyReportXlsx(input: DutyExportInput) {
  const { items, summary, start, end, branchName } = input;
  const wb = XLSX.utils.book_new();

  // 1. Detailed Duty Records
  const detailRows = items.map((r, idx) => ({
    "Sl No": idx + 1,
    "Start Date": r.start_date,
    "End Date": r.end_date || "(ongoing)",
    "Duration (Days)": r.duration_days ?? 1,
    Shift: shiftLabel(r.shift),
    "Patient (Client) Name": r.customer_name,
    "Patient Phone": r.customer_phone || "",
    "Patient Address / Posted At": r.place_name || r.address || r.place_type,
    "Assigned Nurse / Staff": r.employee_name,
    "Nurse Staff Code": r.employee_code || "",
    Branch: r.location_name,
    "Payment Model": r.payment_type === "postpaid" ? "Postpaid (In-hand Cash)" : "Prepaid (Office Advance)",
    "Payment Status": paymentLabel(r),
    "Client Billed (INR)": r.customer_rate,
    "Staff Payout (INR)": r.employee_payout,
    "Engagement Expense (INR)": r.other_expense,
    "Net Profit (INR)": r.profit,
    "Margin %": r.margin_pct,
    "Duty Status": r.status,
    "Staff Response": r.acceptance_status,
    "Work Completed At": r.work_completed_at
      ? new Date(r.work_completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "",
    "Payment Received At": r.payment_received_at
      ? new Date(r.payment_received_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "",
    "Payment Received By": r.payment_received_by || "",
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);

  // Set explicit column widths for perfect display without clipping
  detailSheet["!cols"] = [
    { wch: 6 },  // Sl
    { wch: 12 }, // Start
    { wch: 12 }, // End
    { wch: 14 }, // Duration
    { wch: 12 }, // Shift
    { wch: 22 }, // Patient
    { wch: 15 }, // Phone
    { wch: 32 }, // Address
    { wch: 22 }, // Nurse
    { wch: 14 }, // Code
    { wch: 16 }, // Branch
    { wch: 22 }, // Model
    { wch: 25 }, // Status
    { wch: 18 }, // Bill
    { wch: 18 }, // Payout
    { wch: 22 }, // Expense
    { wch: 18 }, // Profit
    { wch: 12 }, // Margin
    { wch: 14 }, // Duty status
    { wch: 14 }, // Response
    { wch: 22 }, // Completed At
    { wch: 22 }, // Paid At
    { wch: 20 }, // Paid By
  ];

  XLSX.utils.book_append_sheet(wb, detailSheet, "Detailed Duty Ledger");

  // 2. Executive Summary Sheet
  const summaryRows: (string | number)[][] = [
    ["SHRI KRISHNA NURSING CARE SERVICES — FINANCIAL & DUTY REPORT"],
    ["Reporting Period", `${start} to ${end}`],
    ["Branch", branchName],
    ["Generated At", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
    [],
    ["EXECUTIVE FINANCIAL SUMMARY", "AMOUNT (INR)"],
  ];

  if (summary) {
    summaryRows.push(
      ["Total Duty Engagements", summary.total_duties],
      ["Total Client Billing (Revenue)", summary.total_billed],
      ["Total Nurse / Staff Payout", summary.total_staff_payout],
      ["Total Engagement Expenses", summary.total_expenses],
      ["Net Company Profit", summary.total_profit],
      ["Overall Profit Margin (%)", `${summary.overall_margin_pct}%`],
      [],
      ["PAYMENT MODEL BREAKDOWN", "AMOUNT (INR)"],
      ["Prepaid Engagements (Office Advance Paid)", summary.prepaid_total],
      ["Prepaid Engagements Count", summary.prepaid_count],
      ["Postpaid Cash Collected (Received by Nurse)", summary.postpaid_collected],
      ["Postpaid Pending Cash (Awaiting Collection)", summary.postpaid_pending],
      ["Postpaid Engagements Count", summary.postpaid_count]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 42 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Executive Summary");

  XLSX.writeFile(wb, `detailed_duty_report_${start}_to_${end}.xlsx`);
}
