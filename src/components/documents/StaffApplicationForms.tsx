import type { ReactNode } from "react";
import type { Employee } from "@/types/models";
import { ORG_DEPARTMENT, ORG_LOGO, ORG_NAME, ORG_TAGLINE, formatDate } from "./document-utils";

/**
 * The single A4 employment form generated for a staff member — everything that
 * used to be split across Form I and Form II now lives on one page: personal
 * particulars, address, professional details, identification, the terms of
 * engagement (as one paragraph), the staff declaration, signatures and the
 * office-use verification record.
 *
 * Every label and the terms/declaration are bilingual — English with the
 * Bengali in parentheses. Type sizes and spacing are kept tight so the whole
 * form prints on exactly one A4 sheet (never spilling to a second page).
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
        title="APPLICATION FOR EMPLOYMENT (কর্মসংস্থানের আবেদন)"
        subtitle="Candidate Record & Undertaking (প্রার্থীর বিবরণ ও অঙ্গীকার)"
        refNo={staff.code}
      />

      <div className="mt-3 flex gap-4">
        <div className="flex-1">
          <SectionTitle>1. Personal Details (ব্যক্তিগত বিবরণ)</SectionTitle>
          <FieldGrid>
            <Field label="Full Name (পুরো নাম)" value={staff.name} wide />
            <Field label="Date of Birth (জন্ম তারিখ)" value={formatDate(staff.dob)} />
            <Field label="Gender (লিঙ্গ)" value={staff.gender} capitalize />
            <Field label="Mobile Number (মোবাইল নম্বর)" value={staff.phone} />
            <Field label="Alternate Number (বিকল্প নম্বর)" value={staff.alt_phone} />
            <Field label="Email Address (ইমেল ঠিকানা)" value={staff.email} wide />
          </FieldGrid>
        </div>

        <div className="shrink-0">
          <div className="h-[104px] w-[84px] overflow-hidden border border-[#1f2937] bg-[#f1f5f9]">
            {staff.photo?.url ? (
              <img src={staff.photo.url} alt={staff.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-[7px] text-slate-400">PHOTOGRAPH</div>
            )}
          </div>
          <p className="mt-1 text-center text-[6.5px] text-slate-500">
            Affix photo (ছবি লাগান)
          </p>
        </div>
      </div>

      <SectionTitle>2. Address (ঠিকানা)</SectionTitle>
      <FieldGrid>
        <Field label="Residential Address (বাসস্থানের ঠিকানা)" value={staff.address} wide />
        <Field label="City / Town (শহর)" value={staff.city} />
        <Field label="PIN Code (পিন কোড)" value={staff.pincode} />
      </FieldGrid>

      <SectionTitle>3. Professional Details (পেশাগত বিবরণ)</SectionTitle>
      <FieldGrid>
        <Field label="Applied for the post of (আবেদনকৃত পদ)" value={staff.designation ?? staff.category} capitalize />
        <Field label="Total Experience (মোট অভিজ্ঞতা)" value={staff.experience} />
        <Field label="Previous Employer (পূর্ববর্তী নিয়োগকর্তা)" value={staff.previous_employer} wide />
      </FieldGrid>
      <div className="mt-1.5">
        <p className="text-[7px] font-bold uppercase tracking-wide text-slate-600">
          Nature of work handled (কাজের ধরন)
        </p>
        <div className="mt-0.5 min-h-[30px] whitespace-pre-wrap rounded border border-slate-300 bg-slate-50/60 p-1.5 text-[8.5px] leading-snug">
          {staff.work_history || "—"}
        </div>
      </div>

      <SectionTitle>4. Identification (পরিচয়পত্র)</SectionTitle>
      <FieldGrid>
        <Field label="ID Proof Type (পরিচয়পত্রের ধরন)" value={staff.id_proof_type} />
        <Field label="ID Proof Number (পরিচয়পত্র নম্বর)" value={staff.id_proof_number} />
        <Field label="Branch (শাখা)" value={branchName} />
        <Field label="Staff Code (স্টাফ কোড)" value={staff.code} />
      </FieldGrid>

      <SectionTitle>5. Terms of Engagement (নিয়োগের শর্তাবলী)</SectionTitle>
      <p className="mt-1 text-[7.5px] leading-snug text-slate-700">
        I shall attend duty punctually as per the shift allotted and shall not leave the patient
        unattended during my shift; maintain strict confidentiality regarding the patient's medical
        condition and the family's personal information; conduct myself with courtesy and
        professionalism, wear the prescribed uniform and carry my identity card while on duty; not
        accept any direct payment, gift or gratuity from the patient or their family outside the
        agency's billing; report any change in my address or contact number to the branch office
        within seven days; and I understand that this engagement is subject to satisfactory conduct
        and may be reviewed by the branch manager at any time.
        <span className="mt-1 block text-slate-600">
          (আমি বরাদ্দকৃত শিফট অনুযায়ী সময়মতো ডিউটিতে উপস্থিত থাকব এবং ডিউটি চলাকালীন রোগীকে অযত্নে ফেলে
          রাখব না; রোগীর চিকিৎসাগত অবস্থা ও পরিবারের ব্যক্তিগত তথ্য সম্পূর্ণ গোপন রাখব; সৌজন্য ও পেশাদারিত্বের
          সঙ্গে আচরণ করব, নির্ধারিত ইউনিফর্ম পরব এবং ডিউটির সময় পরিচয়পত্র সঙ্গে রাখব; সংস্থার বিলিং-এর বাইরে
          রোগী বা তাঁর পরিবারের কাছ থেকে কোনো সরাসরি অর্থ, উপহার বা বকশিশ গ্রহণ করব না; আমার ঠিকানা বা
          যোগাযোগ নম্বরে পরিবর্তন সাত দিনের মধ্যে শাখা অফিসে জানাব; এবং আমি বুঝি যে এই নিয়োগ সন্তোষজনক
          আচরণের উপর নির্ভরশীল এবং শাখা ব্যবস্থাপক যেকোনো সময় তা পর্যালোচনা করতে পারেন।)
        </span>
      </p>

      <div className="mt-2 rounded border border-slate-300 bg-[#fdf6ec]/60 p-1.5">
        <p className="text-[7.5px] font-bold uppercase tracking-wide text-[#8a1538]">
          Declaration (ঘোষণা)
        </p>
        <p className="mt-0.5 text-[7.5px] leading-snug text-slate-700">
          I hereby declare that the particulars furnished above are true and correct to the best of
          my knowledge, and I undertake to abide by the terms stated above. Any information found
          false shall render my engagement liable for termination without notice.
          <span className="block text-slate-600">
            (আমি ঘোষণা করছি যে উপরে প্রদত্ত তথ্য আমার জ্ঞান অনুযায়ী সত্য ও সঠিক এবং আমি উপরোক্ত শর্তাবলী মেনে
            চলার অঙ্গীকার করছি। কোনো তথ্য মিথ্যা প্রমাণিত হলে আমার নিয়োগ বিনা নোটিশে বাতিলযোগ্য হবে।)
          </span>
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-8">
        <div className="text-[8px] text-slate-600">
          <p>
            <span className="font-semibold">Date (তারিখ):</span>{" "}
            {formatDate(staff.verified_at ?? staff.submitted_at ?? new Date().toISOString())}
          </p>
          <p className="mt-0.5">
            <span className="font-semibold">Place (স্থান):</span> {staff.city || "—"}
          </p>
        </div>
        <div className="w-52 text-center">
          <div className="flex h-10 items-end justify-center">
            {staff.signature?.url ? (
              <img src={staff.signature.url} alt="Signature" className="max-h-10 object-contain mix-blend-multiply" />
            ) : (
              <span className="font-signature text-[18px] text-[#1c3d8f]">{staff.name}</span>
            )}
          </div>
          <p className="border-t border-slate-400 pt-0.5 text-[8px] font-semibold text-slate-700">
            Signature of Applicant (আবেদনকারীর স্বাক্ষর)
          </p>
        </div>
      </div>

      {/* Office use */}
      <div className="mt-3 rounded border border-slate-300 bg-slate-50/60 p-2">
        <p className="text-[7.5px] font-bold uppercase tracking-wide text-slate-600">
          For office use only (শুধুমাত্র অফিসের ব্যবহারের জন্য)
        </p>
        <div className="mt-1.5 grid grid-cols-3 gap-3">
          <Field label="Verified On (যাচাইয়ের তারিখ)" value={formatDate(staff.verified_at)} />
          <Field label="Submitted On (জমার তারিখ)" value={formatDate(staff.submitted_at)} />
          <Field label="Status (অবস্থা)" value={staff.verification_status} capitalize />
        </div>
        <div className="mt-4 flex justify-end">
          <div className="w-52 border-t border-slate-400 pt-0.5 text-center text-[8px] font-semibold text-slate-700">
            Branch Manager / Authorized Signatory
            <span className="block font-normal text-slate-500">(শাখা ব্যবস্থাপক / অনুমোদিত স্বাক্ষরকারী)</span>
          </div>
        </div>
      </div>

      <footer className="mt-2 flex items-center justify-between border-t border-slate-300 pt-1 text-[6.5px] text-slate-400">
        <span>{ORG_NAME} · Computer-generated document — valid with office seal.</span>
        <span>{staff.code}</span>
      </footer>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                             */
/* ------------------------------------------------------------------ */

/** An A4 page surface, padded tight so all content fits one printed page. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="doc-sheet app-form-sheet mx-auto w-[210mm] bg-white px-[12mm] py-[9mm] text-[#111] shadow-soft">
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
    <header className="border-b-2 border-[#8a1538] pb-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src={ORG_LOGO} alt={`${ORG_NAME} logo`} className="h-12 w-12 shrink-0 object-contain" />
          <div>
            <h1 className="font-serif text-[17px] font-extrabold leading-tight tracking-tight">
              {ORG_NAME.toUpperCase()}
            </h1>
            <p className="font-serif text-[9px] font-bold text-[#c0121f]">{ORG_DEPARTMENT}</p>
            <p className="text-[8px] text-slate-500">{ORG_TAGLINE}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-wide text-slate-500">Ref. No. (রেফ. নং)</p>
          <p className="font-mono text-[10px] font-bold">{refNo}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="h-px flex-1 bg-[#8a1538]/30" />
        <span className="rounded border border-[#8a1538]/30 bg-[#fdf6ec] px-2.5 py-0.5 text-center font-serif text-[10px] font-extrabold tracking-wide text-[#c0121f]">
          {title}
        </span>
        <span className="h-px flex-1 bg-[#8a1538]/30" />
      </div>
      <p className="mt-0.5 text-center text-[8px] font-semibold uppercase tracking-wider text-slate-500">
        {subtitle}
      </p>
    </header>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-2.5 border-l-[3px] border-[#c0121f] pl-1.5 font-serif text-[10px] font-bold uppercase tracking-wide">
      {children}
    </h2>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>;
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
      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-[1px] border-b border-dotted border-slate-400 pb-[1px] text-[9px] font-medium ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
