import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DeploymentBranch, DeploymentOverview } from "@/types/models";

/** Customer contact fields joined onto each deployed site. */
export interface DeploymentCustomerInfo {
  phone?: string | null;
  alt_phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
}

export interface DeploymentReportInput {
  branches: DeploymentBranch[];
  totals: DeploymentOverview["totals"];
  /** customer_id -> contact info, joined from the customers list. */
  customerMap: Map<string, DeploymentCustomerInfo>;
}

const EMERALD: [number, number, number] = [15, 118, 110];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

function shiftLabel(s: string): string {
  if (s === "full_24h") return "24 Hours";
  if (s === "day") return "Day";
  if (s === "night") return "Night";
  if (s === "custom") return "Custom";
  return s;
}

/** Full address for a deployed site — posting address first, else the customer's. */
function siteAddress(
  assignmentAddress: string | null | undefined,
  placeName: string | null | undefined,
  info?: DeploymentCustomerInfo
): string {
  const parts = [
    assignmentAddress || info?.address || placeName || "",
    info?.city || "",
    info?.pincode || "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Branch-wise Staff Deployment report as a premium PDF: a grand-total table
 * across branches, then one section per branch listing every deployed site with
 * the client's name, address and both phone numbers, the nurse on duty, the
 * shift, plus a per-branch subtotal.
 */
export function downloadDeploymentReportPdf(input: DeploymentReportInput) {
  const { branches, totals, customerMap } = input;
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
  doc.text("Branch-wise Staff Deployment Report", pageWidth - marginX, 26, {
    align: "right",
  });

  // ---- Sub-Header Metadata ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(
    `Total Branches: ${totals.branches}   |   Staff Deployed: ${totals.assigned_count}   |   Available: ${totals.available_count}   |   Total Staff: ${totals.total_staff}`,
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
    head: [["Branch", "City", "Total Staff", "On Duty", "Available", "Sites"]],
    body: branches.map((b) => [
      `${b.location_name}\n${b.location_code}`,
      b.city || "—",
      String(b.total_staff),
      String(b.assigned_count),
      String(b.available_count),
      String(b.assignments.length),
    ]),
    foot: [
      [
        "TOTAL",
        `${branches.length} branches`,
        String(totals.total_staff),
        String(totals.assigned_count),
        String(totals.available_count),
        String(branches.reduce((n, b) => n + b.assignments.length, 0)),
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 4, textColor: SLATE, valign: "middle" },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 8.5, fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 200, fontStyle: "bold", halign: "left" },
      1: { halign: "left" },
      2: { halign: "center" },
      3: { halign: "center", textColor: [217, 119, 6] },
      4: { halign: "center", textColor: [16, 149, 90] },
      5: { halign: "center" },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => footer(data.pageNumber),
  });

  let startY = (doc as AutoTableDoc).lastAutoTable.finalY + 18;

  // ---- Per-branch sections ----
  for (const branch of branches) {
    // Keep a branch's title bar with at least its first rows on the same page.
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
      `On Duty: ${branch.assigned_count}   ·   Available: ${branch.available_count}   ·   Total Staff: ${branch.total_staff}`,
      pageWidth - marginX - 8,
      startY + 15,
      { align: "right" }
    );

    const body =
      branch.assignments.length > 0
        ? branch.assignments.map((a, idx) => {
            const info = customerMap.get(a.customer_id);
            return [
              String(idx + 1),
              a.customer_name,
              siteAddress(a.address, a.place_name, info),
              info?.phone || "—",
              info?.alt_phone || "—",
              a.employee_name,
              shiftLabel(a.shift),
            ];
          })
        : [["—", "No staff currently deployed at this branch.", "", "", "", "", ""]];

    autoTable(doc, {
      startY: startY + barHeight,
      head: [["Sl", "Client Name", "Address", "Phone", "Alt Phone", "Staff Deployed", "Shift"]],
      body,
      foot: [
        [
          {
            content: `Sites: ${branch.assignments.length}      Staff Deployed: ${branch.assigned_count}`,
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
        2: { cellWidth: 218 },
        3: { cellWidth: 92 },
        4: { cellWidth: 92 },
        5: { cellWidth: 150 },
        6: { cellWidth: 66, halign: "center" },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: (data) => footer(data.pageNumber),
    });

    startY = (doc as AutoTableDoc).lastAutoTable.finalY + 18;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`staff_deployment_report_${stamp}.pdf`);
}
