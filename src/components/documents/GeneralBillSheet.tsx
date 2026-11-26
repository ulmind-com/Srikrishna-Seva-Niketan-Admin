import React from "react";
import type { MonthlyBillGroup, MonthlyBillLineItem } from "@/services/billing.service";
import { ORG_LOGO, ORG_NAME, formatDate, formatDateWithTime, formatTime12h } from "./document-utils";

const FALLBACK_LINE = "ARAMBAGH ★ 712601";
const FALLBACK_MOB = "9239701265";

const inr = (n?: number | null) => (n != null ? n.toLocaleString("en-IN") : "");

const SHIFT_TITLE: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};

function lineItemTiming(li: MonthlyBillLineItem): string {
  if (li.shift === "custom" && li.shift_label) return li.shift_label;
  if (li.start_time && li.end_time) {
    return `${formatTime12h(li.start_time)} – ${formatTime12h(li.end_time)}`;
  }
  if (li.start_time) {
    return `From ${formatTime12h(li.start_time)}`;
  }
  if (li.shift_label) return li.shift_label;
  if (li.shift === "full_24h") return "Round-the-clock (24 Hours)";
  if (li.shift === "day") return "08:00 AM – 08:00 PM (12 Hours)";
  if (li.shift === "night") return "08:00 PM – 08:00 AM (12 Hours)";
  if (li.shift === "morning") return "06:00 AM – 02:00 PM (8 Hours)";
  return "Standard Hours";
}

function lineItemRole(li: MonthlyBillLineItem): string {
  if (li.employee_category) {
    const c = li.employee_category.toLowerCase();
    if (c === "aaya") return "Aaya";
    if (c === "nurse") return "Nurse";
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return li.shift === "full_24h" ? "Aaya / Attendant" : "Care Staff";
}

interface GeneralBillSheetProps {
  bill: MonthlyBillGroup;
  billDate?: string;
  authorizedSignatureUrl?: string | null;
}

export const GeneralBillSheet = React.forwardRef<HTMLDivElement, GeneralBillSheetProps>(
  ({ bill, billDate, authorizedSignatureUrl }, ref) => {
    const headerLine = bill.branch_city
      ? `${bill.branch_city.toUpperCase()} ★ ${bill.branch_pincode || "712601"}`
      : FALLBACK_LINE;
    const mob = bill.branch_phone || FALLBACK_MOB;

    const minRows = 3;
    const emptyRowsCount = Math.max(0, minRows - bill.line_items.length);

    return (
      <div
        ref={ref}
        className="bill-sheet mx-auto flex min-h-[254mm] w-[152mm] flex-col bg-white px-[9mm] py-[8mm] font-sans text-[#111] shadow-lg print:shadow-none print:w-full print:min-h-0"
      >
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
            No. – <span className="ml-1 font-bold">{bill.bill_no ?? "—"}</span>
          </p>
          <p>
            Date{" "}
            <span className="ml-1 border-b border-dotted border-black px-1 font-semibold">
              {formatDate(billDate || new Date().toISOString())}
            </span>
          </p>
        </div>

        <p className="mt-2 text-[13px]">
          Name{" "}
          <span className="border-b border-dotted border-black px-1 font-semibold">
            {bill.customer_name}
          </span>
        </p>
        <p className="mt-1.5 text-[13px]">
          Address{" "}
          <span className="border-b border-dotted border-black px-1 font-semibold">
            {bill.customer_address || "—"}
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
            {bill.line_items.map((item, idx) => {
              const timing = lineItemTiming(item);
              const role = lineItemRole(item);
              const shiftName = SHIFT_TITLE[item.shift] || item.shift_label;
              const fromTime = item.from_time ?? item.start_time;
              const toTime = item.to_time ?? (item.is_ongoing ? null : item.end_time);
              const dateRangeStr = `${formatDateWithTime(item.from, fromTime)} → ${formatDateWithTime(
                item.to,
                toTime
              )}${item.is_ongoing ? " (Till Date)" : ""}`;

              let note: string | null = null;
              if (item.is_replacement) {
                const prev = item.replacement_for_employee_name || "previous staff";
                const reason = item.replacement_reason ? ` — Reason: ${item.replacement_reason}` : "";
                note = `Substitute / Replacement for ${prev}${reason}`;
              } else if (item.replaced_by_employee_name) {
                const next = item.replaced_by_employee_name;
                const reason = item.replacement_reason ? ` — Reason: ${item.replacement_reason}` : "";
                note = `Replaced by ${next}${reason}`;
              }

              return (
                <tr key={item.assignment_id || idx} className="border-b border-black">
                  <td className="border border-black px-2 py-2 align-top">
                    <p className="font-bold text-[12.5px] leading-tight text-gray-900">
                      {bill.line_items.length > 1 ? `${idx + 1}. ` : ""}
                      {item.employee_name || bill.employee_name}{" "}
                      <span className="text-[11px] font-semibold text-gray-600">
                        ({role})
                      </span>
                    </p>
                    <div className="mt-1 space-y-0.5 text-[11px] text-gray-800">
                      <p>
                        <span className="font-bold text-gray-900">Dates:</span> {dateRangeStr}
                      </p>
                      <p>
                        <span className="font-bold text-gray-900">Timing:</span> {timing}{" "}
                        {shiftName && (
                          <span className="text-gray-500 font-medium">({shiftName})</span>
                        )}
                      </p>
                    </div>
                    {note && (
                      <p className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-900 border border-amber-200">
                        ⚡ {note}
                      </p>
                    )}
                  </td>
                  <td className="border border-black px-1 py-2 text-center align-middle font-bold text-[13px]">
                    {item.days}
                  </td>
                  <td className="border border-black px-1 py-2 text-center align-middle font-bold text-[13px]">
                    {item.daily_rate > 0 ? inr(item.daily_rate) : "—"}
                  </td>
                  <td className="border border-black px-1 py-2 text-center align-middle font-extrabold text-[13.5px]">
                    {inr(item.amount)}
                  </td>
                </tr>
              );
            })}

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
                {bill.total_days}
              </td>
              <td className="border border-black px-1 py-2 text-center font-semibold text-[11px] text-gray-500">
                —
              </td>
              <td className="border border-black px-1 py-2 text-center font-extrabold text-[15px]">
                {inr(bill.total_amount)}
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
);

GeneralBillSheet.displayName = "GeneralBillSheet";
