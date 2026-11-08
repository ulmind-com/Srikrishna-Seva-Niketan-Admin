import type { ReactNode } from "react";
import type { Assignment, Customer } from "@/types/models";
import { ORG_DEPARTMENT, ORG_LOGO, ORG_NAME, ORG_TAGLINE, formatDate } from "./document-utils";

const CARE_LABEL: Record<string, string> = {
  home: "Home Care",
  nursing_home: "Nursing Home",
  hospital: "Hospital",
};
const SHIFT_LABEL: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  night: "Night",
  full_24h: "24 Hours",
  custom: "Custom",
};
const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};

const inr = (n?: number | null) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "—");
const inWords = (n?: number | null) => (n != null ? `Rupees ${n.toLocaleString("en-IN")} only` : "—");

/**
 * The single A4 service agreement generated for a customer — a plain, signable
 * contract (no long terms & conditions): who the service is for, what is
 * provided, the agreed amount, and two signatures. Printed in duplicate: one
 * copy for the office and one for the customer.
 *
 * ``assignment`` (the customer's current engagement, when one exists) fills in
 * the staff member, shift, posting and dates; otherwise those read from the
 * customer record alone.
 */
export function CustomerAgreementForm({
  customer,
  assignment,
  branchName,
  authorizedSignatureUrl,
}: {
  customer: Customer;
  assignment?: Assignment | null;
  branchName?: string;
  authorizedSignatureUrl?: string | null;
}) {
  const amount = assignment?.customer_rate ?? customer.billing_rate ?? null;
  const duration = assignment?.total_days ?? customer.duration_days ?? null;
  const service = customer.service_label || CARE_LABEL[customer.care_type] || "Home Health Care";
  const today = new Date().toISOString();

  return (
    <div className="doc-sheet mx-auto w-[210mm] bg-white p-[14mm] text-[#111] shadow-soft">
      <Letterhead refNo={customer.code} />

      <SectionTitle>1. Parties</SectionTitle>
      <FieldGrid>
        <Field label="Service Provider" value={ORG_NAME} wide />
        <Field label="Branch / Office" value={branchName} />
        <Field label="Agreement Date" value={formatDate(today)} />
      </FieldGrid>

      <SectionTitle>2. Customer Details</SectionTitle>
      <FieldGrid>
        <Field label="Customer Name" value={customer.name} wide />
        <Field label="Customer ID" value={customer.code} />
        <Field label="Phone" value={customer.phone} />
        <Field label="Alternate Phone" value={customer.alt_phone} />
        <Field label="ID Proof" value={customer.id_proof_type} />
        <Field label="Address" value={customer.address} wide />
        <Field label="City" value={customer.city} />
        <Field label="PIN Code" value={customer.pincode} />
      </FieldGrid>

      <SectionTitle>3. Service & Charges</SectionTitle>
      <FieldGrid>
        <Field label="Service Provided" value={service} wide />
        <Field label="Care Type" value={CARE_LABEL[customer.care_type] ?? customer.care_type} />
        <Field label="Posting" value={assignment ? PLACE_LABEL[assignment.place_type] ?? assignment.place_type : CARE_LABEL[customer.care_type]} />
        <Field label="Staff Assigned" value={assignment?.employee_name} />
        <Field label="Shift" value={assignment ? SHIFT_LABEL[assignment.shift] ?? assignment.shift : "—"} />
        <Field label="Start Date" value={assignment ? formatDate(assignment.start_date) : "—"} />
        <Field label="Duration" value={duration != null ? `${duration} day${duration === 1 ? "" : "s"}` : "—"} />
        <Field label="Contract Amount" value={inr(amount)} />
        <Field label="Amount in Words" value={inWords(amount)} wide />
      </FieldGrid>

      <div className="mt-4 rounded border border-slate-300 bg-[#fdf6ec]/60 p-3">
        <p className="text-[8.5px] font-bold uppercase tracking-wide text-[#8a1538]">Agreement</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-700">
          {ORG_NAME} agrees to provide the service described above to the customer
          named herein, for the agreed amount of <span className="font-semibold">{inr(amount)}</span>.
          The customer confirms that the above particulars are correct and agrees
          to the service and charges stated. This document is a record of the
          engagement between both parties and is issued in duplicate — one copy
          retained by the office and one handed to the customer.
        </p>
      </div>

      {/* Signatures */}
      <div className="mt-8 flex items-end justify-between gap-8">
        <div className="w-56 text-center">
          <div className="h-12" />
          <p className="border-t border-slate-400 pt-1 text-[8.5px] font-semibold text-slate-700">
            Signature of Customer
          </p>
          <p className="mt-0.5 text-[7.5px] text-slate-500">{customer.name}</p>
        </div>

        <div className="w-56 text-center">
          <div className="flex h-12 items-end justify-center">
            {authorizedSignatureUrl ? (
              <img
                src={authorizedSignatureUrl}
                alt="Authorized signature"
                className="max-h-12 object-contain mix-blend-multiply"
              />
            ) : null}
          </div>
          <p className="border-t border-slate-400 pt-1 text-[8.5px] font-semibold text-slate-700">
            For {ORG_NAME}
          </p>
          <p className="mt-0.5 text-[7.5px] text-slate-500">Authorized Signatory</p>
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-between border-t border-slate-300 pt-2 text-[7.5px] text-slate-400">
        <span>{ORG_NAME} · Computer-generated agreement — valid with office seal.</span>
        <span>Office Copy / Customer Copy</span>
      </footer>
    </div>
  );
}

/* ---- shared building blocks (mirrors StaffApplicationForms) ---- */

function Letterhead({ refNo }: { refNo: string }) {
  return (
    <header className="border-b-2 border-[#8a1538] pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={ORG_LOGO} alt={`${ORG_NAME} logo`} className="h-14 w-14 shrink-0 object-contain" />
          <div>
            <h1 className="font-serif text-[19px] font-extrabold leading-tight tracking-tight">
              {ORG_NAME.toUpperCase()}
            </h1>
            <p className="font-serif text-[10px] font-bold text-[#c0121f]">{ORG_DEPARTMENT}</p>
            <p className="text-[9px] text-slate-500">{ORG_TAGLINE}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8.5px] uppercase tracking-wide text-slate-500">Ref. No.</p>
          <p className="font-mono text-[11px] font-bold">{refNo}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-[#8a1538]/30" />
        <span className="rounded border border-[#8a1538]/30 bg-[#fdf6ec] px-3 py-1 font-serif text-[11px] font-extrabold tracking-wide text-[#c0121f]">
          SERVICE AGREEMENT
        </span>
        <span className="h-px flex-1 bg-[#8a1538]/30" />
      </div>
      <p className="mt-1 text-center text-[8.5px] font-semibold uppercase tracking-wider text-slate-500">
        Customer Care Service Contract
      </p>
    </header>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-4 border-l-[3px] border-[#c0121f] pl-2 font-serif text-[11px] font-bold uppercase tracking-wide">
      {children}
    </h2>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2">{children}</div>;
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[7.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-[1px] border-b border-dotted border-slate-400 pb-[2px] text-[10px] font-medium">
        {value || "—"}
      </p>
    </div>
  );
}
