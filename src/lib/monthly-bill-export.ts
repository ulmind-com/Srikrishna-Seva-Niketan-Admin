import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
 * Premium monthly customer bills — one invoice page per (nurse + customer),
 * with per-engagement line items (date span, shift, days, daily rate, amount)
 * and a month total. Pass one bill or many.
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

    // Bill-to + nurse blocks
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("BILL TO", marginX, y);
    doc.text("NURSE / ATTENDANT", pageWidth / 2, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...SLATE);
    doc.text(bill.customer_name, marginX, y);
    doc.text(
      `${bill.employee_name}${bill.employee_code ? ` (${bill.employee_code})` : ""}`,
      pageWidth / 2,
      y
    );
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const addrLines = doc.splitTextToSize(bill.customer_address || "—", pageWidth / 2 - marginX - 10);
    doc.text(addrLines, marginX, y);
    const phoneBits = [bill.customer_phone, bill.customer_alt_phone].filter(Boolean).join("  /  ");
    doc.text(phoneBits || "—", pageWidth / 2, y);
    if (bill.location_name) {
      doc.text(bill.location_name, pageWidth / 2, y + 12);
    }

    y += Math.max(addrLines.length * 11, 22) + 8;

    // Line items
    autoTable(doc, {
      startY: y,
      head: [["From", "To", "Shift", "Days", "Rate/Day", "Amount"]],
      body: bill.line_items.map((li) => [
        li.from,
        li.to,
        li.shift_label,
        String(li.days),
        rupee(li.daily_rate),
        rupee(li.amount),
      ]),
      foot: [
        [
          { content: "TOTAL", colSpan: 3, styles: { halign: "right" as const } },
          { content: String(bill.total_days), styles: { halign: "center" as const } },
          "",
          rupee(bill.total_amount),
        ],
      ],
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 5, textColor: SLATE, valign: "middle" },
      headStyles: { fillColor: EMERALD, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: "bold", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 78 },
        1: { cellWidth: 78 },
        3: { halign: "center", cellWidth: 48 },
        4: { halign: "right", cellWidth: 80 },
        5: { halign: "right", cellWidth: 90, fontStyle: "bold" },
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
