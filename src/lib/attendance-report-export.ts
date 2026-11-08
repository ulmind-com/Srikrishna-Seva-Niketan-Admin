import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Payslip } from "@/services/payroll.service";

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const ROSE: [number, number, number] = [190, 18, 60];

const rupee = (n?: number | null) => `Rs ${(n ?? 0).toLocaleString("en-IN")}`;

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
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function fmtTime(t?: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  const suffix = hi < 12 ? "AM" : "PM";
  return `${hi % 12 || 12}:${String(mi).padStart(2, "0")} ${suffix}`;
}

function shiftText(d: Payslip["days"][number]): string {
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

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const label = monthLabel(slip.period.month);

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
  doc.text("Monthly Attendance Report", marginX, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(label, pageWidth - marginX, 30, { align: "right" });

  // Staff block
  let y = 78;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...SLATE);
  doc.text(slip.employee.name, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `${slip.employee.code}  ·  ${slip.employee.category}`,
    marginX,
    y + 14
  );
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    pageWidth - marginX,
    y + 14,
    { align: "right" }
  );

  // Summary table
  const s = slip.summary;
  autoTable(doc, {
    startY: y + 26,
    head: [["Days Worked", "Present (shifts)", "Absent", "Half", "Leave", "Off", "Gross Pay"]],
    body: [
      [
        String(s.worked_days),
        String(s.present_days),
        String(s.absent_days),
        String(s.half_days),
        String(s.leave_days),
        String(s.off_days),
        rupee(s.gross_pay),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, halign: "center", textColor: SLATE },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8.5, fontStyle: "bold" },
    columnStyles: {
      2: { textColor: ROSE, fontStyle: "bold" },
      6: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX },
  });

  let startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (s.absent_dates.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ROSE);
    const text = `Absent on: ${s.absent_dates.join(", ")}`;
    const lines = doc.splitTextToSize(text, pageWidth - marginX * 2);
    doc.text(lines, marginX, startY + 4);
    startY += lines.length * 11 + 8;
  }

  // Day-by-day table
  autoTable(doc, {
    startY,
    head: [["Date", "Day", "Status", "Shift", "Customer", "Amount"]],
    body: slip.days.map((d) => {
      const wd = WEEKDAY[new Date(d.date).getDay()];
      return [
        d.date,
        wd,
        STATUS_LABEL[d.status] ?? d.status,
        shiftText(d),
        d.customer_name ?? "",
        d.amount ? rupee(d.amount) : "",
      ];
    }),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, textColor: SLATE },
    headStyles: { fillColor: SLATE, textColor: 255, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 44 },
      2: { cellWidth: 70 },
      5: { halign: "right", cellWidth: 70 },
    },
    // Paint absent rows red for instant scanning.
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

  const name = `attendance_${slip.employee.name.replace(/\s+/g, "_")}_${slip.period.month}.pdf`;
  doc.save(name);
}
