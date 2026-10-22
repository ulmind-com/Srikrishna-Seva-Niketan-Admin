import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { resourceServices } from "@/services/resources";
import { Button } from "@/components/ui/button";
import { BranchName } from "@/components/common/BranchName";
import { Loader2 } from "lucide-react";

const ORG_NAME = "Srikrishna Seva Niketan";
const ORG_TAGLINE = "Nursing · Aaya · Attendant Services";

export function EmployeeIdCardPage() {
  const { id = "" } = useParams();
  const { data: employee, isLoading } = useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => resourceServices.employees.get(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Staff Register
        </Link>
        <p className="text-muted-foreground">Employee not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print isolation: only #id-card-print is visible on paper. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print, #id-card-print * { visibility: visible !important; }
          #id-card-print { position: absolute; left: 0; top: 0; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Staff Register
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print ID Card
        </Button>
      </div>

      <div className="flex justify-center">
        <div
          id="id-card-print"
          className="w-[340px] overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-lg"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-700 to-sky-500 px-4 py-3 text-center text-white">
            <h2 className="text-base font-bold leading-tight">{ORG_NAME}</h2>
            <p className="text-[10px] opacity-90">{ORG_TAGLINE}</p>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center gap-2 px-5 py-4">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-sky-100 bg-slate-100">
              {employee.photo?.url ? (
                <img src={employee.photo.url} alt={employee.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                  {employee.name.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold leading-tight">{employee.name}</h3>
            <span className="rounded-full bg-sky-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
              {employee.category}
            </span>

            <div className="mt-2 w-full space-y-1 text-xs">
              <Row label="Staff ID" value={employee.code} mono />
              <Row label="Phone" value={employee.phone} />
              <Row label="Branch" value={<BranchName id={employee.location_id} />} />
              {employee.experience && <Row label="Experience" value={employee.experience} />}
              {employee.id_proof_type && (
                <Row label="ID Proof" value={`${employee.id_proof_type}${employee.id_proof_number ? " · " + employee.id_proof_number : ""}`} />
              )}
            </div>

            {/* Signature */}
            <div className="mt-3 flex w-full items-end justify-between">
              <div className="text-center">
                <div className="h-10 w-28">
                  {employee.signature?.url && (
                    <img src={employee.signature.url} alt="signature" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="border-t border-slate-300 pt-0.5 text-[9px] text-slate-500">Staff Signature</div>
              </div>
              <div className="text-center">
                <div className="h-10 w-28" />
                <div className="border-t border-slate-300 pt-0.5 text-[9px] text-slate-500">Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-4 py-2 text-center text-[9px] text-slate-500">
            This card is the property of {ORG_NAME}. If found, please return.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
