import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { resourceServices } from "@/services/resources";
import { StaffDocuments } from "@/components/documents/StaffDocuments";
import { Badge } from "@/components/ui/badge";
import {
  VERIFICATION_LABEL,
  VERIFICATION_VARIANT,
} from "@/components/documents/document-utils";

/**
 * Official Sri Krishna Seva Niketan ID Card view.
 *
 * Uses the exact same unified StaffDocuments component as the Staff Verification
 * page, ensuring 100% visual consistency and native print fidelity across the platform.
 */
export function EmployeeIdCardPage() {
  const { id = "" } = useParams();
  const { data: staff, isLoading } = useQuery({
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

  if (!staff) {
    return (
      <div className="space-y-4">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Staff Register
        </Link>
        <p className="text-muted-foreground">Employee record not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{staff.name} · Official ID Card</title>
      </Helmet>

      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/employees"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Staff Register
          </Link>
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

      <StaffDocuments staff={staff} />
    </div>
  );
}
