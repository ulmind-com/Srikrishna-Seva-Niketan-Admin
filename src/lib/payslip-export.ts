import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Payslip, PayslipDay } from "@/services/payroll.service";

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const ROSE: [number, number, number] = [190, 18, 60];

const rupee = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half day",
  absent: "Absent",
  leave: "Leave",
  off: "Off",
  unmarked: "—",
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function fmtTime(t?: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  return `${hi % 12 || 12}:${String(mi).padStart(2, "0")} ${hi < 12 ? "AM" : "PM"}`;
}

function shiftText(d: PayslipDay): string {
  if (!d.shift) return "";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length) {
      return d.shift_windows.map((w) => `${fmtTime(w.start)}-${fmtTime(w.end)}`).join(", ");
    }
    if (d.start_time || d.end_time) return `${fmtTime(d.start_time)}-${fmtTime(d.end_time)}`;
  }
  const map: Record<string, string> = { morning: "Morning", day: "Day", night: "Night", full_24h: "24h", custom: "Custom" };
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
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(monthLabel(slip.period.month), pageWidth - marginX, 30, { align: "right" });

  // Employee block
  let y = 78;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text(slip.employee.name, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${slip.employee.code}  ·  ${slip.employee.category}`, marginX, y + 14);
  doc.text(
    `Daily rate: ${slip.employee.daily_rate ? rupee(slip.employee.daily_rate) : "—"}/day`,
    pageWidth - marginX,
    y + 14,
    { align: "right" }
  );
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    pageWidth - marginX,
    y,
    { align: "right" }
  );

  // Summary table
  const s = slip.summary;
  autoTable(doc, {
    startY: y + 26,
    head: [["Days Worked", "Present (shifts)", "Half", "Absent", "Leave", "Off", "Payable Days"]],
    body: [
      [
        String(s.worked_days),
        String(s.present_days),
        String(s.half_days),
        String(s.absent_days),
        String(s.leave_days),
        String(s.off_days),
        String(s.payable_days),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, halign: "center", textColor: SLATE },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: { 3: { textColor: ROSE, fontStyle: "bold" } },
    margin: { left: marginX, right: marginX },
  });

  let startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Shift breakdown + pay details
  const bs = s.by_shift || {};
  autoTable(doc, {
    startY,
    head: [["Morning", "Day", "Night", "24h", "Custom", "Per Day Salary", "Leave Deduction"]],
    body: [
      [
        String(bs.morning || 0),
        String(bs.day || 0),
        String(bs.night || 0),
        String(bs.full_24h || 0),
        String(bs.custom || 0),
        slip.employee.daily_rate ? rupee(slip.employee.daily_rate) : "—",
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
  doc.setFillColor(236, 253, 245);
  doc.rect(marginX, startY, pageWidth - marginX * 2, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text("NET PAYABLE", marginX + 10, startY + 21);
  doc.setFontSize(16);
  doc.setTextColor(...EMERALD);
  doc.text(rupee(s.net_payable), pageWidth - marginX - 10, startY + 22, { align: "right" });
  startY += 34 + 14;

  // Day-by-day breakdown
  autoTable(doc, {
    startY,
    head: [["Date", "Day", "Status", "Shift", "Customer", "Amount"]],
    body: slip.days.map((d) => [
      d.date,
      WEEKDAY[new Date(d.date).getDay()],
      STATUS_LABEL[d.status] ?? d.status,
      shiftText(d),
      d.customer_name ?? "",
      d.amount ? rupee(d.amount) : "",
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 64 },
      5: { halign: "right", cellWidth: 72, fontStyle: "bold" },
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

  const name = `payslip_${slip.employee.name.replace(/\s+/g, "_")}_${slip.period.month}.pdf`;
  doc.save(name);
}
