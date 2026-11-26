import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Payslip, PayslipDay } from "@/services/payroll.service";
import {
  formatAttendanceWindowIST,
  formatShiftWindowsIST,
  formatSlashDateIST,
  monthLabelIST,
  nowIST,
  weekdayIST,
} from "@/lib/ist-datetime";

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const ROSE: [number, number, number] = [190, 18, 60];

const rupee = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;
const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half day",
  absent: "Absent",
  leave: "Off",
  off: "Off",
  unmarked: "—",
};

function shiftText(d: PayslipDay): string {
  if (!d.shift) return "";
  if (d.status === "off" || d.status === "leave" || d.status === "absent") {
    return STATUS_LABEL[d.status] ?? "";
  }
  const shiftTitle =
    d.shift === "morning"
      ? "Morning"
      : d.shift === "day"
      ? "Day Shift"
      : d.shift === "night"
      ? "Night Shift"
      : d.shift === "full_24h"
      ? "24 Hours"
      : "Custom";

  if (d.shift_windows && d.shift_windows.length && d.date) {
    return `${shiftTitle} (${formatShiftWindowsIST(d.date, d.shift_windows, true)})`;
  }

  if ((d.start_time || d.end_time) && d.date) {
    return `${shiftTitle} (${formatAttendanceWindowIST(d.date, d.shift, d.start_time, d.end_time, d.status, true)})`;
  }

  const map: Record<string, string> = {
    morning: "Morning (07:00 AM - 03:00 PM)",
    day: "Day Shift (08:00 AM - 08:00 PM)",
    night: "Night Shift (08:00 PM - 08:00 AM)",
    full_24h: "24h (Round-the-clock)",
    custom: "Custom",
  };
  return map[d.shift] ?? d.shift;
}

/**
 * Premium monthly salary slip for one staff member: summary of worked / absent
 * days, a day-by-day breakdown with shift times, and the net pay — pay is per
 * calendar day (a two-shift day is paid once).
 */
export function downloadPayslipPdf(slip: Payslip) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
  doc.text("Salary Slip", marginX, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const fullMonth = `${slip.period.month}-01`;
  const [my, mm] = slip.period.month.split("-").map(Number);
  const lastOfMonth = new Date(my, mm, 0).getDate();
  const isWholeMonth =
    slip.period.start === fullMonth &&
    slip.period.end === `${slip.period.month}-${String(lastOfMonth).padStart(2, "0")}`;
  const periodLabel = isWholeMonth
    ? monthLabelIST(slip.period.month)
    : `${formatSlashDateIST(slip.period.start)} - ${formatSlashDateIST(slip.period.end)}`;
  doc.text(periodLabel, pageWidth - marginX, 30, { align: "right" });

  // Employee block
  let y = 78;
  doc.setFont("helvetica", "bold");
  const s = slip.summary;
  const effectiveRate =
    slip.employee.daily_rate ||
    (s.payable_days > 0 && s.gross_pay > 0 ? Math.round(s.gross_pay / s.payable_days) : null);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text(slip.employee.name, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${slip.employee.code}  ·  ${slip.employee.category}`, marginX, y + 14);
  doc.text(
    `Daily rate: ${effectiveRate ? rupee(effectiveRate) : "—"}/day`,
    pageWidth - marginX,
    y + 14,
    { align: "right" }
  );
  doc.text(
    `Generated: ${formatSlashDateIST(nowIST().toJSDate())}`,
    pageWidth - marginX,
    y,
    { align: "right" }
  );

  // Summary table
  autoTable(doc, {
    startY: y + 26,
    head: [["Days Worked", "Present (days)", "Shifts", "Half", "Absent", "Off Days", "Payable Days"]],
    body: [
      [
        String(s.worked_days),
        String(s.present_days),
        String(s.total_shifts ?? s.present_days),
        String(s.half_days),
        String(s.absent_days),
        String((s.off_days ?? 0) + (s.leave_days ?? 0)),
        String(s.payable_days),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 5, halign: "center", textColor: SLATE },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: { 4: { textColor: ROSE, fontStyle: "bold" } },
    margin: { left: marginX, right: marginX },
  });

  let startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Shift breakdown + pay details
  const bs = s.by_shift || {};
  autoTable(doc, {
    startY,
    head: [["Morning", "Day", "Night", "24h", "Custom", "Per Day Salary", "Deduction"]],
    body: [
      [
        String(bs.morning || 0),
        String(bs.day || 0),
        String(bs.night || 0),
        String(bs.full_24h || 0),
        String(bs.custom || 0),
        effectiveRate ? rupee(effectiveRate) : "—",
        rupee(s.leave_deduction),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 5, halign: "center", textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
    columnStyles: { 6: { textColor: ROSE } },
    margin: { left: marginX, right: marginX },
  });
  startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // Net payable banner
  const paidAmt = s.paid_amount ?? 0;
  const remAmt = s.remaining_amount ?? Math.max(0, s.net_payable - paidAmt);
  doc.setFillColor(236, 253, 245);
  doc.rect(marginX, startY, pageWidth - marginX * 2, paidAmt > 0 ? 44 : 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text("NET PAYABLE", marginX + 10, startY + 20);
  doc.setFontSize(16);
  doc.setTextColor(...EMERALD);
  doc.text(rupee(s.net_payable), pageWidth - marginX - 10, startY + 22, { align: "right" });
  if (paidAmt > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Paid: ${rupee(paidAmt)}   |   Balance Remaining: ${rupee(remAmt)}`,
      marginX + 10,
      startY + 36
    );
  }
  startY += 34 + 14;

  // Day-by-day breakdown
  autoTable(doc, {
    startY,
    head: [["Date", "Day", "Status", "Duty Timing & Shift", "Customer", "Daily Rate", "Payable Amount"]],
    body: slip.days.map((d) => [
      d.date,
      weekdayIST(d.date),
      STATUS_LABEL[d.status] ?? d.status,
      shiftText(d),
      d.customer_name ?? "",
      d.pay_rate ? rupee(d.pay_rate) : "—",
      d.amount ? rupee(d.amount) : "—",
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 30 },
      2: { cellWidth: 46 },
      3: { cellWidth: 160 },
      4: { cellWidth: 90 },
      5: { halign: "right", cellWidth: 54 },
      6: { halign: "right", cellWidth: 64, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const raw = slip.days[data.row.index];
        if (raw && raw.status === "absent") {
          data.cell.styles.textColor = ROSE;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber}   |   Shri Krishna Nursing Care Services   |   Confidential`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
    },
  });

  // Signature line
  const afterY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;
  if (afterY < pageHeight - 60) {
    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - marginX - 160, afterY, pageWidth - marginX, afterY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Authorised Signature", pageWidth - marginX, afterY + 12, { align: "right" });
  }

  const periodSlug = isWholeMonth ? slip.period.month : `${slip.period.start}_to_${slip.period.end}`;
  const name = `payslip_${slip.employee.name.replace(/\s+/g, "_")}_${periodSlug}.pdf`;
  doc.save(name);
}
