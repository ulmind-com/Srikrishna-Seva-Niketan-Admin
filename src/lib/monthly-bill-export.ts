import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { MonthlyBillGroup } from "@/services/billing.service";

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

const rupee = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Premium monthly customer bills — one consolidated invoice per customer for a calendar month.
 * Supports duty handover & multiple attendants (e.g. Arnab 1-10, Rupa 11-30).
 * Displays full itemized breakdown of each nurse, period, shift, rate, and amount.
 */
export function downloadMonthlyBillsPdf(month: string, bills: MonthlyBillGroup[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const label = monthLabel(month);

  bills.forEach((bill, idx) => {
    if (idx > 0) doc.addPage();

    // Header banner
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, pageWidth, 54, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("SRIKRISHNA SEVA NIKETAN", marginX, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 245, 240);
    doc.text("Nursing · Aaya · Attendant Services", marginX, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("MONTHLY BILL", pageWidth - marginX, 28, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 245, 240);
    doc.text(label, pageWidth - marginX, 42, { align: "right" });

    // Meta row
    let y = 78;
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "bold");
    doc.text(`Bill No: ${bill.bill_no ?? "—"}`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      pageWidth - marginX,
      y,
      { align: "right" }
    );

    // Bill-to + Attendant(s) blocks
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("BILL TO (PATIENT / CLIENT)", marginX, y);
    doc.text("ATTENDANT(S) / CARE TEAM", pageWidth / 2, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...SLATE);
    doc.text(bill.customer_name, marginX, y);

    const empLabel = bill.employee_name || "Assigned Care Staff";
    const empLines = doc.splitTextToSize(empLabel, pageWidth / 2 - marginX);
    doc.text(empLines, pageWidth / 2, y);

    y += Math.max(empLines.length * 12, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const addrLines = doc.splitTextToSize(
      bill.customer_address || "—",
      pageWidth / 2 - marginX - 10
    );
    doc.text(addrLines, marginX, y);
    const phoneBits = [bill.customer_phone, bill.customer_alt_phone]
      .filter(Boolean)
      .join("  /  ");
    doc.text(phoneBits || "—", pageWidth / 2, y);
    if (bill.location_name) {
      doc.text(bill.location_name, pageWidth / 2, y + 12);
    }

    y += Math.max(addrLines.length * 11, 24) + 10;

    // Line items table
    autoTable(doc, {
      startY: y,
      head: [["Staff / Attendant", "From", "To", "Shift", "Days", "Rate/Day", "Amount"]],
      body: bill.line_items.map((li) => [
        li.employee_name
          ? `${li.employee_name}${li.employee_code ? ` (${li.employee_code})` : ""}`
          : bill.employee_name || "Staff",
        li.from,
        li.to,
        li.shift_label,
        String(li.days),
        rupee(li.daily_rate),
        rupee(li.amount),
      ]),
      foot: [
        [
          { content: "TOTAL", colSpan: 4, styles: { halign: "right" as const } },
          { content: String(bill.total_days), styles: { halign: "center" as const } },
          "",
          rupee(bill.total_amount),
        ],
      ],
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 5, textColor: SLATE, valign: "middle" },
      headStyles: { fillColor: EMERALD, textColor: 255, fontStyle: "bold" },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: SLATE,
        fontStyle: "bold",
        fontSize: 9.5,
      },
      columnStyles: {
        0: { cellWidth: 125 },
        1: { cellWidth: 64 },
        2: { cellWidth: 64 },
        3: { cellWidth: 74 },
        4: { halign: "center", cellWidth: 42 },
        5: { halign: "right", cellWidth: 70 },
        6: { halign: "right", cellWidth: 84, fontStyle: "bold" },
      },
      margin: { left: marginX, right: marginX },
    });

    const afterY = (doc as AutoTableDoc).lastAutoTable.finalY + 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text("For: SRIKRISHNA SEVA NIKETAN", pageWidth - marginX, afterY, { align: "right" });
    doc.setDrawColor(148, 163, 184);
    doc.line(marginX, afterY, marginX + 160, afterY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Signature of client", marginX, afterY + 12);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Shri Krishna Nursing Care Services   |   Confidential",
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" }
    );
  });

  const single = bills.length === 1;
  const name = single
    ? `monthly_bill_${bills[0].customer_name.replace(/\s+/g, "_")}_${month}.pdf`
    : `monthly_bills_${month}.pdf`;
  doc.save(name);
}

/**
 * Export full monthly billing ledger to Excel (.xlsx) with 2 sheets:
 * Sheet 1: Customer Invoice Summary
 * Sheet 2: Itemized Staff Breakdown
 */
export function downloadMonthlyBillsXlsx(month: string, bills: MonthlyBillGroup[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customer Summary
  const summaryRows = bills.map((b, idx) => ({
    "Sl No": idx + 1,
    "Bill No": b.bill_no ?? "(unissued)",
    Month: month,
    "Customer / Patient Name": b.customer_name,
    "Customer Phone": [b.customer_phone, b.customer_alt_phone].filter(Boolean).join(" / "),
    "Customer Address": b.customer_address || "",
    Branch: b.location_name || "",
    "Assigned Attendant(s)": b.employee_name,
    "Total Days": b.total_days,
    "Total Bill (INR)": b.total_amount,
    "Status": b.bill_no != null ? "Billed" : "Draft",
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 18 },
    { wch: 32 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Customer Bills Summary");

  // Sheet 2: Itemized Staff Duty Breakdown
  const breakdownRows: Record<string, unknown>[] = [];
  let rowIdx = 1;
  bills.forEach((b) => {
    b.line_items.forEach((li) => {
      breakdownRows.push({
        "Sl No": rowIdx++,
        "Bill No": b.bill_no ?? "(unissued)",
        Month: month,
        "Customer Name": b.customer_name,
        "Attendant / Staff Name": li.employee_name || b.employee_name,
        "Staff Code": li.employee_code || "",
        Shift: li.shift_label,
        "Duty From": li.from,
        "Duty To": li.to,
        "Days Worked": li.days,
        "Daily Rate (INR)": li.daily_rate,
        "Amount (INR)": li.amount,
        "Customer Month Total (INR)": b.total_amount,
        Branch: b.location_name || "",
      });
    });
  });

  const breakdownSheet = XLSX.utils.json_to_sheet(breakdownRows);
  breakdownSheet["!cols"] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, breakdownSheet, "Staff Duty Breakdown");

  XLSX.writeFile(wb, `monthly_bills_${month}.xlsx`);
}
