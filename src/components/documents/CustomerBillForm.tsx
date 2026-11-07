import type { Assignment, Customer, Location } from "@/types/models";
import { ORG_LOGO, ORG_NAME, formatDate } from "./document-utils";

/** Fallback header details matching the printed bill pad. */
const FALLBACK_LINE = "ARAMBAGH ★ HOOGHLY ★ 712601";
const FALLBACK_MOB = "9239701265";

const inr = (n?: number | null) => (n != null ? n.toLocaleString("en-IN") : "");

/**
 * Customer bill — a faithful digital copy of the agency's printed bill pad:
 * BILL header with logo, auto bill number, name, address, a From/To duty row
 * with Day / Rate / Amount, a TOTAL, and the two signature lines. Generated
 * automatically from an engagement, so every duty can issue the same slip.
 */
export function CustomerBillForm({
  billNo,
  customer,
  assignment,
  branch,
  authorizedSignatureUrl,
}: {
  billNo?: number | null;
  customer: Customer;
  assignment: Assignment;
  branch?: Location | null;
  authorizedSignatureUrl?: string | null;
}) {
  const days = assignment.total_days ?? assignment.duration_days ?? null;
  // Prefer the stored per-day rate; fall back to back-computing it from the total.
  const rate =
    assignment.customer_daily_rate ??
    (assignment.customer_rate != null && days
      ? Math.round(assignment.customer_rate / days)
      : null);
  const amount =
    assignment.customer_rate ?? (rate != null && days ? rate * days : null);

  const headerLine = branch?.city
    ? `${branch.city.toUpperCase()}${branch.pincode ? ` ★ ${branch.pincode}` : ""}`
    : FALLBACK_LINE;
  const mob = branch?.phone || FALLBACK_MOB;

  return (
    <div className="bill-sheet mx-auto flex min-h-[254mm] w-[152mm] flex-col bg-white px-[10mm] py-[9mm] font-sans text-[#111]">
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
        <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight">
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

      {/* ---- Table ---- */}
      <table className="mt-3 w-full table-fixed border-collapse text-[12px]">
        <thead>
          <tr>
            <th className="w-[46%] border border-black px-2 py-1 text-left font-bold">Description</th>
            <th className="w-[14%] border border-black px-1 py-1 font-bold">Day</th>
            <th className="w-[18%] border border-black px-1 py-1 font-bold">Rate</th>
            <th className="w-[22%] border border-black px-1 py-1 font-bold">Amount(₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="h-[140mm] border border-black px-2 py-1 align-top">
              <p>Date</p>
              <p className="mt-1">
                From{" "}
                <span className="border-b border-dotted border-black">
                  {formatDate(assignment.start_date)}
                </span>
              </p>
              <p className="mt-1">
                To{" "}
                <span className="border-b border-dotted border-black">
                  {assignment.end_date ? formatDate(assignment.end_date) : "—"}
                </span>
              </p>
            </td>
            <td className="border border-black px-1 text-center align-middle text-[15px] font-semibold">
              {days ?? ""}
            </td>
            <td className="border border-black px-1 text-center align-middle font-semibold">
              {rate != null ? inr(rate) : ""}
            </td>
            <td className="border border-black px-1 text-center align-middle text-[15px] font-semibold">
              {inr(amount)}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-right font-bold" colSpan={3}>
              TOTAL
            </td>
            <td className="border border-black px-1 py-1 text-center text-[15px] font-extrabold">
              {inr(amount)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---- Signatures ---- */}
      <div className="mt-auto flex items-end justify-between pt-6 text-[12px] font-semibold">
        <p>Signature of client</p>
        <div className="text-right">
          <p>For : {ORG_NAME.toUpperCase()}</p>
          <div className="mt-6 flex h-8 justify-end">
            {authorizedSignatureUrl && (
              <img
                src={authorizedSignatureUrl}
                alt="Authorized signature"
                className="max-h-8 object-contain mix-blend-multiply"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
