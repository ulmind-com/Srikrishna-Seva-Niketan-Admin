import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { resourceServices } from "@/services/resources";
import { StaffDocuments } from "@/components/documents/StaffDocuments";
import { Badge } from "@/components/ui/badge";
import {
  VERIFICATION_LABEL,
  VERIFICATION_VARIANT,
} from "@/components/documents/document-utils";

/** Admin view of a staff member's generated ID card and application forms. */
export function EmployeeDocumentsPage() {
  const { id = "" } = useParams();

  const { data: staff, isLoading } = useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => resourceServices.employees.get(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">Staff member not found.</p>
      </div>
    );
  }

  const verified = staff.verification_status === "verified";

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{staff.name} · Documents</title>
      </Helmet>

      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink />
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{staff.name}</h1>
          <p className="text-sm text-muted-foreground">
            {staff.designation ?? staff.category} ·{" "}
            <span className="font-mono">{staff.code}</span>
          </p>
        </div>
        <Badge variant={VERIFICATION_VARIANT[staff.verification_status] ?? "muted"}>
          {VERIFICATION_LABEL[staff.verification_status] ?? staff.verification_status}
        </Badge>
      </div>

      {!verified && (
        <div className="no-print flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">This profile is not verified yet</p>
            <p className="text-sm text-muted-foreground">
              The documents below are a preview. Verify the staff member first so
              the E-HRMS code and joining date are issued.
            </p>
          </div>
        </div>
      )}

      <StaffDocuments staff={staff} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/employees"
      className="no-print inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Staff Register
    </Link>
  );
}
