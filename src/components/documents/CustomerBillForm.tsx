import type { Assignment, Customer, Location } from "@/types/models";
import { ORG_LOGO, ORG_NAME, formatDate } from "./document-utils";

/** Fallback header details matching the printed bill pad. */
const FALLBACK_LINE = "ARAMBAGH ★ HOOGHLY ★ 712601";
const FALLBACK_MOB = "9239701265";

const inr = (n?: number | null) => (n != null ? n.toLocaleString("en-IN") : "");

const SHIFT_NAME: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

/** "18:00" -> "6:00 PM", "06:00" -> "6:00 AM". */
function fmtTime(t?: string | null): string {
  if (!t) return "?";
  const [h, m] = t.split(":");
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return t;
  const suffix = hi < 12 ? "AM" : "PM";
  return `${hi % 12 || 12}:${String(mi).padStart(2, "0")} ${suffix}`;
}

export interface BillDutyItem {
  id: string;
  staffName: string;
  role: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  dateStr: string;
  shiftLabel: string;
  timeStr: string;
  days: number;
  rate: number;
  amount: number;
  replacementNote?: string | null;
}

/**
 * Turns raw assignments into clean, itemized bill lines with exact dates,
 * exact shift timings, days worked, daily rates, and calculated amounts.
 */
function buildDutyItems(
  assignments: Assignment[],
  employeeMap?: Record<string, { name: string; category?: string; code?: string }>,
  billDate: Date = new Date()
): BillDutyItem[] {
  return assignments.map((a, idx) => {
    const empInfo = a.employee_id && employeeMap ? employeeMap[a.employee_id] : null;
    const cat = empInfo?.category?.toLowerCase() || "";
    const role = cat
      ? cat.charAt(0).toUpperCase() + cat.slice(1)
      : a.shift === "full_24h"
        ? "Attendant / Nurse"
        : "Care Staff";
    const staffName = a.employee_name || empInfo?.name || "Care Staff";

    // Timing calculation
    let shiftLabel = SHIFT_NAME[a.shift] ?? (a.shift === "full_24h" ? "24 Hours" : a.shift || "Regular");
    let timeStr = "";

    if (a.shift_windows && a.shift_windows.length > 0) {
      timeStr = a.shift_windows
        .filter((w) => w.start || w.end)
        .map((w) => `${fmtTime(w.start)} – ${fmtTime(w.end)}`)
        .join(", ");
      shiftLabel = "Custom";
    } else if (a.start_time && a.end_time) {
      timeStr = `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`;
    } else if (a.start_time) {
      timeStr = `${fmtTime(a.start_time)} onwards`;
    } else {
      switch (a.shift as string) {
        case "morning":
          timeStr = "06:00 AM – 02:00 PM (8 hrs)";
          break;
        case "day":
          timeStr = "08:00 AM – 08:00 PM (12 hrs)";
          break;
        case "night":
          timeStr = "08:00 PM – 08:00 AM (12 hrs)";
          break;
        case "full_24h":
          timeStr = "Round-the-clock (24 hrs)";
          break;
        default:
          timeStr = "Standard Shift Hours";
          break;
      }
    }

    // Days calculation
    let days = 0;
    let isOngoing = false;
    let endDateStr = "";

    if (a.days_worked != null && a.days_worked > 0) {
      days = a.days_worked;
      isOngoing = !a.end_date;
      endDateStr = a.end_date
        ? formatDate(a.end_date)
        : `${formatDate(billDate.toISOString())} (Till Date)`;
    } else {
      const s = new Date(a.start_date);
      const targetEnd = a.end_date ? new Date(a.end_date) : billDate;
      isOngoing = !a.end_date;
      endDateStr = a.end_date
        ? formatDate(a.end_date)
        : `${formatDate(targetEnd.toISOString())} (Till Date)`;

      let grossDays = 0;
      if (a.start_time && a.end_time) {
        try {
          const [sh, sm] = a.start_time.split(":").map(Number);
          const [eh, em] = a.end_time.split(":").map(Number);
          const stDt = new Date(s.getFullYear(), s.getMonth(), s.getDate(), sh, sm);
          const etDt = new Date(targetEnd.getFullYear(), targetEnd.getMonth(), targetEnd.getDate(), eh, em);
          const diffHrs = (etDt.getTime() - stDt.getTime()) / (1000 * 60 * 60);
          if (diffHrs > 0) {
            if (a.shift === "full_24h") {
              grossDays = Math.round((diffHrs / 24) * 2) / 2;
            } else if (a.shift === "day" || a.shift === "night" || a.shift === "morning") {
              grossDays = Math.round((diffHrs / 12) * 2) / 2;
            } else {
              grossDays = Math.round((diffHrs / 24) * 2) / 2;
            }
          }
        } catch {
          // ignore
        }
      }

      if (grossDays <= 0) {
        const sCal = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const eCal = new Date(targetEnd.getFullYear(), targetEnd.getMonth(), targetEnd.getDate());
        const calDays = Math.round((eCal.getTime() - sCal.getTime()) / (1000 * 60 * 60 * 24));
        grossDays = isOngoing ? Math.max(calDays, 1) : Math.max(calDays + 1, 1);
      }

      // Deduct duty breaks dynamically if any
      let breakDays = 0;
      if (a.duty_breaks && a.duty_breaks.length > 0) {
        for (const b of a.duty_breaks) {
          if (!b.start_date || !b.end_date) continue;
          const bStart = new Date(b.start_date);
          const bEnd = new Date(b.end_date);
          const cStart = bStart > s ? bStart : s;
          const cEnd = bEnd < targetEnd ? bEnd : targetEnd;
          if (cEnd >= cStart) {
            breakDays += Math.round((cEnd.getTime() - cStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
        }
      }

      days = Math.max(0.5, Math.round((grossDays - breakDays) * 2) / 2);
    }

    // Financials calculation (Rate & Amount)
    let rate = 0;
    let amount = 0;

    if (a.customer_daily_rate != null && a.customer_daily_rate > 0) {
      rate = a.customer_daily_rate;
      amount = a.customer_rate != null && a.customer_rate > 0 ? a.customer_rate : rate * days;
    } else if (a.customer_rate != null && a.customer_rate > 0) {
      amount = a.customer_rate;
      rate = days > 0 ? Math.round(amount / days) : amount;
    } else {
      rate = 0;
      amount = 0;
    }

    // Replacement & handover notes
    let replacementNote: string | null = null;
    if (a.is_replacement) {
      const prev = a.replacement_for_employee_name || "previous staff";
      const reason = a.replacement_reason ? ` — Reason: ${a.replacement_reason}` : "";
      replacementNote = `Substitute / Replacement for ${prev}${reason}`;
    } else if (a.replaced_by_employee_name) {
      const next = a.replaced_by_employee_name;
      const reason = a.replacement_reason ? ` — Reason: ${a.replacement_reason}` : "";
      replacementNote = `Replaced by ${next}${reason}`;
    }

    return {
      id: a.id || String(idx),
      staffName,
      role,
      startDate: a.start_date,
      endDate: a.end_date || billDate.toISOString(),
      isOngoing,
      dateStr: `${formatDate(a.start_date)} → ${endDateStr}`,
      shiftLabel,
      timeStr,
      days,
      rate,
      amount,
      replacementNote,
    };
  });
}

/**
 * Customer bill — a faithful digital copy of the agency's printed bill pad:
 * BILL header with logo, auto bill number, name, address, an itemized duty table
 * with Day / Rate / Amount per staff/shift, a TOTAL, and the two signature lines.
 * Supports multiple attendants, handover/replacements, and multi-shift tracking.
 */
export function CustomerBillForm({
  billNo,
  customer,
  assignment,
  assignments,
  branch,
  authorizedSignatureUrl,
  employeeMap,
}: {
  billNo?: number | null;
  customer: Customer;
  assignment: Assignment;
  assignments?: Assignment[];
  branch?: Location | null;
  authorizedSignatureUrl?: string | null;
  employeeMap?: Record<string, { name: string; category?: string; code?: string }>;
}) {
  const allAssignments = assignments && assignments.length > 0 ? assignments : [assignment];
  const dutyItems = buildDutyItems(allAssignments, employeeMap);

  const totalDays = dutyItems.reduce((acc, item) => acc + item.days, 0);
  const totalAmount = dutyItems.reduce((acc, item) => acc + item.amount, 0);

  const headerLine = branch?.city
    ? `${branch.city.toUpperCase()}${branch.pincode ? ` ★ ${branch.pincode}` : ""}`
    : FALLBACK_LINE;
  const mob = branch?.phone || FALLBACK_MOB;

  // Approximate filler rows to maintain traditional printed pad proportion when few items
  const minRows = 3;
  const emptyRowsCount = Math.max(0, minRows - dutyItems.length);

  return (
    <div className="bill-sheet mx-auto flex min-h-[254mm] w-[152mm] flex-col bg-white px-[9mm] py-[8mm] font-sans text-[#111]">
      {/* ---- Header ---- */}
      <div className="relative text-center">
        <img
          src={ORG_LOGO}
          alt={`${ORG_NAME} logo`}
          className="absolute left-0 top-0 h-12 w-12 object-contain"
        />
        <p className="inline-block border-b-2 border-black text-[15px] font-bold tracking-wide">
          BILL
        </p>
        <h1 className="mt-1 text-[21px] font-extrabold leading-tight tracking-tight">
          {ORG_NAME.toUpperCase()}
        </h1>
        <p className="text-[12px] font-bold tracking-wide">{headerLine}</p>
        <p className="text-[12px] font-semibold">Mob.: {mob}</p>
      </div>

      {/* ---- No. / Date ---- */}
      <div className="mt-4 flex items-end justify-between text-[13px]">
        <p>
          No. – <span className="ml-1 font-bold">{billNo ?? "—"}</span>
        </p>
        <p>
          Date{" "}
          <span className="ml-1 border-b border-dotted border-black px-1 font-semibold">
            {formatDate(new Date().toISOString())}
          </span>
        </p>
      </div>

      <p className="mt-2 text-[13px]">
        Name{" "}
        <span className="border-b border-dotted border-black px-1 font-semibold">
          {customer.name}
        </span>
      </p>
      <p className="mt-1.5 text-[13px]">
        Address{" "}
        <span className="border-b border-dotted border-black px-1 font-semibold">
          {customer.address || "—"}
        </span>
      </p>

      {/* ---- Itemized Bill Table ---- */}
      <table className="mt-3.5 w-full table-fixed border-collapse text-[12px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="w-[48%] border border-black px-2 py-1.5 text-left font-bold">
              Description / Care Duty Details
            </th>
            <th className="w-[12%] border border-black px-1 py-1.5 text-center font-bold">
              Day
            </th>
            <th className="w-[18%] border border-black px-1 py-1.5 text-center font-bold">
              Rate (₹/day)
            </th>
            <th className="w-[22%] border border-black px-1 py-1.5 text-center font-bold">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {dutyItems.map((item, idx) => (
            <tr key={item.id || idx} className="border-b border-black">
              <td className="border border-black px-2 py-2 align-top">
                <p className="font-bold text-[12.5px] leading-tight text-gray-900">
                  {dutyItems.length > 1 ? `${idx + 1}. ` : ""}
                  {item.staffName}{" "}
                  <span className="text-[11px] font-semibold text-gray-600">
                    ({item.role})
                  </span>
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] text-gray-800">
                  <p>
                    <span className="font-bold text-gray-900">Dates:</span> {item.dateStr}
                  </p>
                  <p>
                    <span className="font-bold text-gray-900">Timing:</span> {item.timeStr}{" "}
                    <span className="text-gray-500 font-medium">({item.shiftLabel})</span>
                  </p>
                </div>
                {item.replacementNote && (
                  <p className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-900 border border-amber-200">
                    ⚡ {item.replacementNote}
                  </p>
                )}
              </td>
              <td className="border border-black px-1 py-2 text-center align-middle font-bold text-[13px]">
                {item.days}
              </td>
              <td className="border border-black px-1 py-2 text-center align-middle font-bold text-[13px]">
                {item.rate > 0 ? inr(item.rate) : "—"}
              </td>
              <td className="border border-black px-1 py-2 text-center align-middle font-extrabold text-[13.5px]">
                {inr(item.amount)}
              </td>
            </tr>
          ))}

          {/* Spacer row to preserve authentic pad look if few items */}
          {emptyRowsCount > 0 &&
            Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="h-10 border border-black px-2 py-1"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}

          {/* TOTAL Row */}
          <tr className="bg-gray-100 font-extrabold">
            <td className="border border-black px-2 py-2 text-right font-extrabold text-[13px]">
              TOTAL
            </td>
            <td className="border border-black px-1 py-2 text-center font-extrabold text-[14px]">
              {totalDays}
            </td>
            <td className="border border-black px-1 py-2 text-center font-semibold text-[11px] text-gray-500">
              —
            </td>
            <td className="border border-black px-1 py-2 text-center font-extrabold text-[15px]">
              {inr(totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---- Signatures ---- */}
      <div className="mt-auto flex items-end justify-between pt-8 text-[12px] font-semibold">
        <p>Signature of client</p>
        <div className="text-right">
          <p>For : {ORG_NAME.toUpperCase()}</p>
          <div className="mt-5 flex h-9 justify-end">
            {authorizedSignatureUrl && (
              <img
                src={authorizedSignatureUrl}
                alt="Authorized signature"
                className="max-h-9 object-contain mix-blend-multiply"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
