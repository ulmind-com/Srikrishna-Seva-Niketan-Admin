import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DeploymentBranch, DeploymentOverview } from "@/types/models";

/** Employee contact fields joined onto each available staff row. */
export interface EmployeeContactInfo {
  code?: string | null;
  category?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
}

export interface DeploymentReportInput {
  branches: DeploymentBranch[];
  totals: DeploymentOverview["totals"];
  /** employee_id -> contact info, joined from the employees list. */
  employeeMap: Map<string, EmployeeContactInfo>;
}

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

/** Full address — employee address + city + pincode. */
function fullAddress(info?: EmployeeContactInfo): string {
  const parts = [info?.address || "", info?.city || "", info?.pincode || ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Branch-wise Available Staff report as a premium PDF: a grand-total table
 * across branches, then one section per branch listing every staff member who
 * is free (ready to assign) with their name, employee ID, category, address and
 * both phone numbers, plus a per-branch available count.
 */
export function downloadDeploymentReportPdf(input: DeploymentReportInput) {
  const { branches, totals, employeeMap } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const marginX = 24;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const footer = (pageNumber: number) => {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${pageNumber}   |   Shri Krishna Nursing Care Services   |   Confidential`,
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
  };

  // ---- Header Banner ----
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("SHRI KRISHNA NURSING CARE SERVICES", marginX, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 245, 240);
  doc.text("Branch-wise Available Staff Report", pageWidth - marginX, 26, {
    align: "right",
  });

  // ---- Sub-Header Metadata ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(
    `Total Branches: ${totals.branches}   |   Available Staff: ${totals.available_count}   |   On Duty: ${totals.assigned_count}   |   Total Staff: ${totals.total_staff}`,
    marginX,
    60
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generated On: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    pageWidth - marginX,
    60,
    { align: "right" }
  );

  // ---- Grand-Total Summary (one row per branch) ----
  autoTable(doc, {
    startY: 76,
    head: [["Branch", "City", "Total Staff", "On Duty", "Available"]],
    body: branches.map((b) => [
      `${b.location_name}\n${b.location_code}`,
      b.city || "—",
      String(b.total_staff),
      String(b.assigned_count),
      String(b.available_count),
    ]),
    foot: [
      [
        "TOTAL",
        `${branches.length} branches`,
        String(totals.total_staff),
        String(totals.assigned_count),
        String(totals.available_count),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4, textColor: SLATE, valign: "middle" },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8.5, fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 220, fontStyle: "bold", halign: "left" },
      1: { halign: "left" },
      2: { halign: "center" },
      3: { halign: "center", textColor: [217, 119, 6] },
      4: { halign: "center", textColor: [16, 149, 90] },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => footer(data.pageNumber),
  });

  let startY = (doc as AutoTableDoc).lastAutoTable.finalY + 18;

  // ---- Per-branch sections (available staff) ----
  for (const branch of branches) {
    if (startY > pageHeight - 120) {
      doc.addPage();
      startY = 48;
    }

    // Section title bar
    const barHeight = 22;
    doc.setFillColor(...EMERALD);
    doc.rect(marginX, startY, pageWidth - marginX * 2, barHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    const cityPart = branch.city ? ` · ${branch.city}` : "";
    doc.text(`${branch.location_name}  (${branch.location_code})${cityPart}`, marginX + 8, startY + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      `Available: ${branch.available_count}   ·   On Duty: ${branch.assigned_count}   ·   Total Staff: ${branch.total_staff}`,
      pageWidth - marginX - 8,
      startY + 15,
      { align: "right" }
    );

    const body =
      branch.available_staff.length > 0
        ? branch.available_staff.map((s, idx) => {
            const info = employeeMap.get(s.id);
            return [
              String(idx + 1),
              s.name,
              s.code || info?.code || "—",
              s.category || info?.category || "—",
              fullAddress(info),
              info?.phone || "—",
              info?.alt_phone || "—",
            ];
          })
        : [["—", "No staff available at this branch.", "", "", "", "", ""]];

    autoTable(doc, {
      startY: startY + barHeight,
      head: [["Sl", "Name", "Emp ID", "Category", "Address", "Phone", "Alt Phone"]],
      body,
      foot: [
        [
          {
            content: `Available Staff: ${branch.available_staff.length}`,
            colSpan: 7,
            styles: { halign: "left" as const },
          },
        ],
      ],
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3.5, overflow: "linebreak", valign: "middle", textColor: SLATE },
      headStyles: { fillColor: SLATE, textColor: 255, fontSize: 8, fontStyle: "bold" },
      footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 150, fontStyle: "bold" },
        2: { cellWidth: 90 },
        3: { cellWidth: 80 },
        4: { cellWidth: 220 },
        5: { cellWidth: 92 },
        6: { cellWidth: 92 },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: (data) => footer(data.pageNumber),
    });

    startY = (doc as AutoTableDoc).lastAutoTable.finalY + 18;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`available_staff_report_${stamp}.pdf`);
}
