import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { resourceServices } from "@/services/resources";
import { settingsService } from "@/services/settings.service";
import { CustomerAgreementForm } from "@/components/documents/CustomerAgreementForm";
import { Button } from "@/components/ui/button";
import type { Assignment } from "@/types/models";

/** Occupying statuses — the engagement that is current for this customer. */
const ACTIVE = new Set(["scheduled", "active"]);

/**
 * Admin view that generates a printable service agreement for one customer.
 * Fills the staff / shift / dates from the customer's current engagement when
 * one exists. Print produces the contract in duplicate (office + customer copy).
 */
export function CustomerAgreementPage() {
  const { id = "" } = useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => resourceServices.customers.get(id),
    enabled: Boolean(id),
  });

  const { data: assignments } = useQuery({
    queryKey: ["customers", id, "assignments"],
    queryFn: () => resourceServices.assignments.list({ customer_id: id, page_size: 20 }),
    enabled: Boolean(id),
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

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  const rows: Assignment[] = assignments?.items ?? [];
  // Prefer the current engagement; fall back to the most recent one.
  const current =
    rows.find((a) => ACTIVE.has(a.status)) ??
    [...rows].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))[0] ??
    null;

  const branchName = locations?.items.find((b) => b.id === customer.location_id)?.name;
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Service Agreement — {customer.name}</title>
      </Helmet>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Agreement
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-muted/40 p-3 sm:p-5">
        <div className="flex justify-center">
          <div className="print-target">
            <CustomerAgreementForm
              customer={customer}
              assignment={current}
              branchName={branchName}
              authorizedSignatureUrl={authorizedSignatureUrl}
            />
          </div>
        </div>
      </div>

      <p className="no-print text-center text-xs text-muted-foreground">
        Tip: in the print dialog choose <strong>Save as PDF</strong> and set margins to{" "}
        <strong>None</strong>. Print two copies — one for the office, one for the customer.
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/customers"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Customers
    </Link>
  );
}
