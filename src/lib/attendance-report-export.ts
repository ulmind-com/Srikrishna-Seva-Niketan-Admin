import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Payslip } from "@/services/payroll.service";
import {
  formatAttendanceWindowIST,
  formatShiftWindowsIST,
  formatSlashDateIST,
  formatTime12hIST,
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

function shiftText(d: Payslip["days"][number]): string {
  if (!d.shift) return "";
  if (d.shift === "custom") {
    if (d.shift_windows && d.shift_windows.length && d.date) {
      return formatShiftWindowsIST(d.date, d.shift_windows, true);
    }
    if (d.start_time || d.end_time) {
      return `${formatTime12hIST(d.start_time)}-${formatTime12hIST(d.end_time)}`;
    }
  }
  const map: Record<string, string> = { morning: "Morning", day: "Day", night: "Night", full_24h: "24h", custom: "Custom" };
  return map[d.shift] ?? d.shift;
}

/**
 * Premium monthly attendance report for one staff member: a day-by-day table
 * (present / absent / leave / off, with shift times), absences highlighted, and
 * a summary of days worked, absent and pay.
 */
export function downloadAttendanceReportPdf(slip: Payslip) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const marginX = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const dateRangeLabel =
    slip.period.start && slip.period.end
      ? `${slip.period.start} to ${slip.period.end}`
      : monthLabelIST(slip.period.month);

  // Header banner
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 54, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SRIKRISHNA SEVA NIKETAN", marginX, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 245, 240);
  doc.text("Staff Duty & Attendance Statement Report  ·  Helpdesk: 9239701265", marginX, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(dateRangeLabel, pageWidth - marginX, 32, { align: "right" });

  // Staff block
  let y = 74;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text(slip.employee.name, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Staff ID: ${slip.employee.code}  ·  Designation: ${slip.employee.category || "Staff"}  ·  Daily Rate: ${rupee(slip.employee.daily_rate)}/day`,
    marginX,
    y + 14
  );
  doc.text(
    `Statement Generated: ${formatSlashDateIST(nowIST().toJSDate())}`,
    pageWidth - marginX,
    y + 14,
    { align: "right" }
  );

  // Summary table
  const s = slip.summary;
  autoTable(doc, {
    startY: y + 26,
    head: [["Payable Days", "Total Shifts", "Present", "Half Days", "Off / Leave", "Gross Pay"]],
    body: [
      [
        String(s.payable_days ?? s.worked_days),
        String(s.total_shifts ?? s.present_days),
        String(s.present_days),
        String(s.half_days),
        String((s.off_days ?? 0) + (s.leave_days ?? 0)),
        rupee(s.gross_pay),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 5, halign: "center", textColor: SLATE },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: {
      0: { fontStyle: "bold", textColor: EMERALD },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX },
  });

  let startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (s.absent_dates.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...ROSE);
    const text = `Absent on: ${s.absent_dates.join(", ")}`;
    const lines = doc.splitTextToSize(text, pageWidth - marginX * 2);
    doc.text(lines, marginX, startY + 4);
    startY += lines.length * 11 + 6;
  }

  // Day-by-day table
  autoTable(doc, {
    startY,
    head: [["Date", "Day", "Duty Hours / Window", "Duration", "Shift", "Customer / Patient", "Status", "Amount"]],
    body: slip.days.map((d) => {
      const wd = weekdayIST(d.date);
      const isInactive =
        d.status === "off" ||
        d.status === "leave" ||
        d.status === "absent" ||
        d.status === "unmarked";
      const timing = isInactive
        ? "-"
        : d.shift_windows && d.shift_windows.length
          ? formatShiftWindowsIST(d.date, d.shift_windows, true)
          : formatAttendanceWindowIST(d.date, d.shift, d.start_time, d.end_time, d.status, true);
      const dur = isInactive
        ? "-"
        : d.duration ||
          (d.status === "half_day"
            ? "12 hrs"
            : d.shift === "full_24h"
              ? "24 hrs"
              : d.shift
                ? "12 hrs"
                : "—");
      return [
        d.date,
        wd,
        timing,
        dur,
        shiftText(d),
        d.customer_name ?? "—",
        STATUS_LABEL[d.status] ?? d.status,
        d.amount ? rupee(d.amount) : "—",
      ];
    }),
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 3.5, textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 90 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50 },
      6: { cellWidth: 60 },
      7: { halign: "right", cellWidth: 60 },
    },
    // Paint half_day amber and absent rows red
    didParseCell: (data) => {
      if (data.section === "body") {
        const raw = slip.days[data.row.index];
        if (raw && raw.status === "absent") {
          data.cell.styles.textColor = ROSE;
          data.cell.styles.fontStyle = "bold";
        } else if (raw && raw.status === "half_day") {
          data.cell.styles.textColor = [180, 83, 9];
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
        `Page ${data.pageNumber}   |   Shri Krishna Nursing Care Services (Helpline: 9239701265)   |   Confidential`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
    },
  });

  const name = `statement_${slip.employee.name.replace(/\s+/g, "_")}_${slip.period.start}_${slip.period.end}.pdf`;
  doc.save(name);
}
