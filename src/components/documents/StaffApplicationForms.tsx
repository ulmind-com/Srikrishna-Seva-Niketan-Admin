import type { ReactNode } from "react";
import type { Employee } from "@/types/models";
import { ORG_DEPARTMENT, ORG_LOGO, ORG_NAME, ORG_TAGLINE, formatDate } from "./document-utils";

/**
 * The two A4 forms generated for a verified staff member.
 *
 * Form I  — Application for Employment (the staff member's own particulars,
 *           experience and declaration).
 * Form II — Enrolment & Undertaking (branch posting, terms accepted, and the
 *           office's verification record).
 *
 * Both reuse the uploaded photo and the drawn signature so they print as a
 * finished, signed document with nothing left to fill in by hand.
 */

export function ApplicationFormI({
  staff,
  branchName,
}: {
  staff: Employee;
  branchName?: string;
}) {
  return (
    <Sheet>
      <Letterhead
        title="APPLICATION FOR EMPLOYMENT"
        subtitle="Form I — Candidate Particulars"
        refNo={staff.code}
      />

      <div className="mt-5 flex gap-5">
        <div className="flex-1">
          <SectionTitle>1. Personal Details</SectionTitle>
          <FieldGrid>
            <Field label="Full Name" value={staff.name} wide />
            <Field label="Date of Birth" value={formatDate(staff.dob)} />
            <Field label="Gender" value={staff.gender} capitalize />
            <Field label="Mobile Number" value={staff.phone} />
            <Field label="Alternate Number" value={staff.alt_phone} />
            <Field label="Email Address" value={staff.email} wide />
          </FieldGrid>
        </div>

        {/* Affixed photograph */}
        <div className="shrink-0">
          <div className="h-[112px] w-[90px] overflow-hidden border border-[#1f2937] bg-[#f1f5f9]">
            {staff.photo?.url ? (
              <img
                src={staff.photo.url}
                alt={staff.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-[8px] text-slate-400">
                PHOTOGRAPH
              </div>
            )}
          </div>
          <p className="mt-1 text-center text-[7.5px] text-slate-500">
            Affix recent photograph
          </p>
        </div>
      </div>

      <SectionTitle>2. Address</SectionTitle>
      <FieldGrid>
        <Field label="Residential Address" value={staff.address} wide />
        <Field label="City / Town" value={staff.city} />
        <Field label="PIN Code" value={staff.pincode} />
      </FieldGrid>

      <SectionTitle>3. Professional Details</SectionTitle>
      <FieldGrid>
        <Field label="Applied for the post of" value={staff.designation ?? staff.category} capitalize />
        <Field label="Total Experience" value={staff.experience} />
        <Field label="Previous Employer" value={staff.previous_employer} wide />
      </FieldGrid>
      <div className="mt-2">
        <p className="text-[8.5px] font-bold uppercase tracking-wide text-slate-600">
          Nature of work handled
        </p>
        <div className="mt-1 min-h-[52px] whitespace-pre-wrap rounded border border-slate-300 bg-slate-50/60 p-2 text-[9.5px] leading-relaxed">
          {staff.work_history || "—"}
        </div>
      </div>

      <SectionTitle>4. Identification</SectionTitle>
      <FieldGrid>
        <Field label="ID Proof Type" value={staff.id_proof_type} />
        <Field label="ID Proof Number" value={staff.id_proof_number} />
        <Field label="Branch Applied To" value={branchName} />
        <Field label="Staff Code" value={staff.code} />
      </FieldGrid>

      <Declaration>
        I hereby declare that the particulars furnished above are true and correct
        to the best of my knowledge and belief. I understand that any information
        found false at a later stage shall render my engagement liable for
        termination without notice.
      </Declaration>

      <SignatureRow staff={staff} rightLabel="Signature of Applicant" />
      <FormFooter page="Form I of II" />
    </Sheet>
  );
}

export function ApplicationFormII({
  staff,
  branchName,
}: {
  staff: Employee;
  branchName?: string;
}) {
  return (
    <Sheet>
      <Letterhead
        title="ENROLMENT & UNDERTAKING"
        subtitle="Form II — Service Record"
        refNo={staff.code}
      />

      <SectionTitle>1. Posting Details</SectionTitle>
      <FieldGrid>
        <Field label="Staff Name" value={staff.name} wide />
        <Field label="Staff Code" value={staff.code} />
        <Field label="E-HRMS Code" value={staff.hrms_code} />
        <Field label="Designation" value={staff.designation ?? staff.category} capitalize />
        <Field label="Category" value={staff.category} capitalize />
        <Field label="Branch / Location" value={branchName} />
        <Field label="Date of Joining" value={formatDate(staff.join_date)} />
      </FieldGrid>

      <SectionTitle>2. Terms of Engagement</SectionTitle>
      <ol className="mt-1 list-decimal space-y-[3px] pl-4 text-[9px] leading-relaxed text-slate-700">
        <li>
          I shall attend duty punctually as per the shift allotted and shall not
          leave the patient unattended at any time during my shift.
        </li>
        <li>
          I shall maintain strict confidentiality regarding the patient's medical
          condition and the family's personal information.
        </li>
        <li>
          I shall conduct myself with courtesy and professionalism, and shall wear
          the prescribed uniform and carry this identity card while on duty.
        </li>
        <li>
          I shall not accept any direct payment, gift or gratuity from the patient
          or their family outside the agency's billing.
        </li>
        <li>
          I shall report any change in my address or contact number to the branch
          office within seven days.
        </li>
        <li>
          I understand that this engagement is subject to satisfactory conduct and
          may be reviewed by the branch manager at any time.
        </li>
      </ol>

      <Declaration>
        I have read and understood the terms stated above and I undertake to abide
        by them during the entire period of my engagement with {ORG_NAME}.
      </Declaration>

      <SignatureRow staff={staff} rightLabel="Signature of Staff Member" />

      {/* Office use */}
      <div className="mt-5 rounded border border-slate-300 bg-slate-50/60 p-3">
        <p className="text-[8.5px] font-bold uppercase tracking-wide text-slate-600">
          For office use only
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Field label="Verified On" value={formatDate(staff.verified_at)} />
          <Field label="Submitted On" value={formatDate(staff.submitted_at)} />
          <Field label="Status" value={staff.verification_status} capitalize />
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-48 border-t border-slate-400 pt-1 text-center text-[8.5px] font-semibold text-slate-700">
            Branch Manager / Authorized Signatory
          </div>
        </div>
      </div>

      <FormFooter page="Form II of II" />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

/** An A4 page surface. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="doc-sheet mx-auto w-[210mm] max-w-full bg-white p-[14mm] text-[#111] shadow-soft">
      {children}
    </div>
  );
}

function Letterhead({
  title,
  subtitle,
  refNo,
}: {
  title: string;
  subtitle: string;
  refNo: string;
}) {
  return (
    <header className="border-b-2 border-[#8a1538] pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={ORG_LOGO}
            alt={`${ORG_NAME} logo`}
            className="h-14 w-14 shrink-0 object-contain"
          />
          <div>
            <h1 className="font-serif text-[19px] font-extrabold leading-tight tracking-tight">
              {ORG_NAME.toUpperCase()}
            </h1>
            <p className="font-serif text-[10px] font-bold text-[#c0121f]">
              {ORG_DEPARTMENT}
            </p>
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
          {title}
        </span>
        <span className="h-px flex-1 bg-[#8a1538]/30" />
      </div>
      <p className="mt-1 text-center text-[8.5px] font-semibold uppercase tracking-wider text-slate-500">
        {subtitle}
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
  capitalize = false,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[7.5px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-[1px] border-b border-dotted border-slate-400 pb-[2px] text-[10px] font-medium ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Declaration({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded border border-slate-300 bg-[#fdf6ec]/60 p-3">
      <p className="text-[8.5px] font-bold uppercase tracking-wide text-[#8a1538]">
        Declaration
      </p>
      <p className="mt-1 text-[9px] leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}

function SignatureRow({
  staff,
  rightLabel,
}: {
  staff: Employee;
  rightLabel: string;
}) {
  return (
    <div className="mt-6 flex items-end justify-between gap-8">
      <div className="text-[9px] text-slate-600">
        <p>
          <span className="font-semibold">Date:</span>{" "}
          {formatDate(staff.verified_at ?? staff.submitted_at ?? new Date().toISOString())}
        </p>
        <p className="mt-1">
          <span className="font-semibold">Place:</span> {staff.city || "—"}
        </p>
      </div>

      <div className="w-56 text-center">
        <div className="flex h-12 items-end justify-center">
          {staff.signature?.url ? (
            <img
              src={staff.signature.url}
              alt="Signature"
              className="max-h-12 object-contain mix-blend-multiply"
            />
          ) : (
            <span className="font-signature text-[20px] text-[#1c3d8f]">
              {staff.name}
            </span>
          )}
        </div>
        <p className="border-t border-slate-400 pt-1 text-[8.5px] font-semibold text-slate-700">
          {rightLabel}
        </p>
      </div>
    </div>
  );
}

function FormFooter({ page }: { page: string }) {
  return (
    <footer className="mt-6 flex items-center justify-between border-t border-slate-300 pt-2 text-[7.5px] text-slate-400">
      <span>
        {ORG_NAME} · Computer-generated document — valid with office seal.
      </span>
      <span>{page}</span>
    </footer>
  );
}
