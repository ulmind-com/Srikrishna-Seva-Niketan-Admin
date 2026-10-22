import type { Employee } from "@/types/models";
import { ORG_DEPARTMENT, ORG_NAME, formatDate } from "./document-utils";

/**
 * Printable staff identity card.
 *
 * Laid out to match the agency's approved design: crest and org block up top,
 * a bordered portrait, a colon-aligned field list, and two signature wells —
 * the right one carrying the signature the staff member drew during onboarding.
 *
 * Sized in millimetres so the printed card comes out at a true CR80-ish
 * portrait (54 × 86mm scaled up to a comfortable 60 × 95mm).
 */
export function StaffIdCard({
  staff,
  branchName,
}: {
  staff: Employee;
  branchName?: string;
}) {
  return (
    <div className="id-card relative overflow-hidden rounded-[14px] bg-white text-[#111]">
      {/* Decorative corner pattern (top-left) */}
      <svg
        className="pointer-events-none absolute -left-2 -top-2 h-28 w-28 opacity-[0.18]"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <g fill="none" stroke="#8a1538" strokeWidth="0.7">
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <polygon
                key={`${r}-${c}`}
                points="10,0 20,5 20,15 10,20 0,15 0,5"
                transform={`translate(${c * 17 + (r % 2) * 8.5}, ${r * 15})`}
              />
            )),
          )}
        </g>
      </svg>

      {/* Faint cross-hatch on the right */}
      <svg
        className="pointer-events-none absolute right-0 top-20 h-56 w-24 opacity-[0.12]"
        viewBox="0 0 60 140"
        aria-hidden="true"
      >
        <g stroke="#8a1538" strokeWidth="0.5" fill="none">
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d={`M0 ${i * 12} Q 30 ${i * 12 + 6} 60 ${i * 12}`} />
          ))}
        </g>
      </svg>

      <div className="relative px-5 pb-5 pt-6">
        {/* ---- Crest + organisation ---- */}
        <div className="flex flex-col items-center text-center">
          <Crest />
          <h1 className="mt-2 font-serif text-[15px] font-extrabold leading-tight tracking-tight text-[#0b0b0b]">
            {ORG_NAME.toUpperCase()}
          </h1>
          <p className="font-serif text-[11px] font-bold leading-tight text-[#c0121f]">
            {ORG_DEPARTMENT}
          </p>
          <p className="font-serif text-[9px] font-semibold leading-tight text-[#111]">
            {(branchName ?? "Head Office").toUpperCase()}
          </p>
        </div>

        {/* ---- "IDENTITY CARD" banner ---- */}
        <div className="mt-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-[#8a1538]/40" />
          <span className="rounded-md border border-[#8a1538]/30 bg-[#fdf6ec] px-3 py-1 font-serif text-[11px] font-extrabold tracking-wide text-[#c0121f]">
            IDENTITY CARD
          </span>
          <span className="h-px flex-1 bg-[#8a1538]/40" />
        </div>

        {/* ---- Portrait ---- */}
        <div className="mt-4 flex justify-center">
          <div className="h-[118px] w-[96px] overflow-hidden border-[2.5px] border-[#c0121f] bg-[#eef2f7]">
            {staff.photo?.url ? (
              <img
                src={staff.photo.url}
                alt={staff.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-[10px] text-slate-400">
                PHOTO
              </div>
            )}
          </div>
        </div>

        {/* ---- Field list ---- */}
        <dl className="mt-4 space-y-[5px] pl-1">
          <Row label="NAME" value={staff.name} />
          <Row label="D.O.B." value={formatDate(staff.dob)} />
          <Row label="GENDER" value={staff.gender ?? "—"} capitalize />
          <Row label="E-HRMS Code" value={staff.hrms_code ?? staff.code} />
          <Row label="DESIGNATION" value={staff.designation ?? staff.category} capitalize />
        </dl>

        {/* ---- Signatures ---- */}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="flex-1 text-center">
            <div className="mx-auto mb-0.5 h-9">
              <span className="font-signature text-[17px] leading-9 text-[#1c3d8f]">
                Signature
              </span>
            </div>
            <p className="border-t border-[#111]/20 pt-1 font-serif text-[8.5px] font-bold text-[#c0121f]">
              Authorized Signatory
            </p>
          </div>

          <div className="flex-1 text-center">
            <div className="mx-auto mb-0.5 flex h-9 items-end justify-center">
              {staff.signature?.url ? (
                <img
                  src={staff.signature.url}
                  alt="Signature"
                  className="max-h-9 object-contain mix-blend-multiply"
                />
              ) : (
                <span className="font-signature text-[17px] text-[#1c3d8f]">
                  {staff.name.split(" ")[0]}
                </span>
              )}
            </div>
            <p className="border-t border-[#111]/20 pt-1 font-serif text-[8.5px] font-bold text-[#c0121f]">
              Signature of Card Holder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One colon-aligned `LABEL : value` row. */
function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value?: string | null;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="w-[86px] shrink-0 font-serif text-[10px] font-bold tracking-tight text-[#111]">
        {label}
      </dt>
      <dd
        className={`flex-1 font-serif text-[10px] text-[#111] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        <span className="mr-1">:</span>
        {value || "—"}
      </dd>
    </div>
  );
}

/** Simple medical crest standing in for the printed logo. */
function Crest() {
  return (
    <svg viewBox="0 0 64 44" className="h-11 w-16" aria-hidden="true">
      <defs>
        <linearGradient id="crest-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c0121f" />
          <stop offset="100%" stopColor="#8a1538" />
        </linearGradient>
      </defs>
      {/* caring figure */}
      <circle cx="26" cy="9" r="5" fill="url(#crest-g)" />
      <path
        d="M14 36c0-8 5.4-14 12-14s12 6 12 14c0 1.2-1 2-2.2 2H16.2C15 38 14 37.2 14 36Z"
        fill="url(#crest-g)"
      />
      {/* cross */}
      <rect x="42" y="12" width="16" height="5.5" rx="1.2" fill="#1c3d8f" />
      <rect x="47.2" y="6.8" width="5.6" height="16" rx="1.2" fill="#1c3d8f" />
    </svg>
  );
}
