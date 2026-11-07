import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { resourceServices } from "@/services/resources";
import { settingsService } from "@/services/settings.service";
import { http } from "@/services/api/http";
import { endpoints } from "@/services/api/endpoints";
import { CustomerBillForm } from "@/components/documents/CustomerBillForm";
import { Button } from "@/components/ui/button";

/**
 * Printable customer bill for one engagement. Auto-allocates (and then reuses)
 * a sequential bill number from the backend, fills the agency's bill format
 * from the engagement + customer, and prints a faithful copy of the bill pad.
 */
export function CustomerBillPage() {
  const { id = "" } = useParams();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignments", "detail", id],
    queryFn: () => resourceServices.assignments.get(id),
    enabled: Boolean(id),
  });

  const customerId = assignment?.customer_id;
  const { data: customer } = useQuery({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => resourceServices.customers.get(customerId as string),
    enabled: Boolean(customerId),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
    staleTime: 300_000,
  });

  // Allocate (or reuse) the bill number — idempotent on the backend.
  const { data: billData } = useQuery({
    queryKey: ["assignment-bill-no", id],
    queryFn: () => http.post<{ bill_no: number }>(endpoints.assignments.issueBill(id)),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment || !customer) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">
          {assignment ? "Loading customer…" : "Engagement not found."}
        </p>
      </div>
    );
  }

  const branch = locations?.items.find((b) => b.id === assignment.location_id) ?? null;
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Bill — {customer.name}</title>
      </Helmet>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Bill
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-muted/40 p-3 sm:p-5">
        <div className="flex justify-center">
          <div className="print-target shadow-lg">
            <CustomerBillForm
              billNo={billData?.bill_no ?? assignment.bill_no}
              customer={customer}
              assignment={assignment}
              branch={branch}
              authorizedSignatureUrl={authorizedSignatureUrl}
            />
          </div>
        </div>
      </div>

      <p className="no-print text-center text-xs text-muted-foreground">
        Tip: in the print dialog choose <strong>Save as PDF</strong> and set margins to{" "}
        <strong>None</strong> for the cleanest result.
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/reports"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Reports
    </Link>
  );
}
