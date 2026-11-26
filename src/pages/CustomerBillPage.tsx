import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const printedRef = useRef(false);

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

  const { data: allCustAssignments } = useQuery({
    queryKey: ["assignments", "by-customer", customerId],
    queryFn: () =>
      resourceServices.assignments.list({
        customer_id: customerId as string,
        page_size: 50,
      }),
    enabled: Boolean(customerId),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => resourceServices.employees.list({ page_size: 100 }),
    staleTime: 60_000,
  });

  const employeeMap = (employees?.items ?? []).reduce<
    Record<string, { name: string; category?: string; code?: string }>
  >((acc, emp) => {
    acc[emp.id] = { name: emp.name, category: emp.category, code: emp.code };
    return acc;
  }, {});

  const { data: settings } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
    staleTime: 300_000,
  });

  const canGenerateBill = Boolean(
    assignment &&
      (assignment.end_date ||
        assignment.status === "completed" ||
        assignment.status === "replaced")
  );

  // Allocate (or reuse) the bill number — idempotent on the backend.
  const { data: billData } = useQuery({
    queryKey: ["assignment-bill-no", id],
    queryFn: () => http.post<{ bill_no: number }>(endpoints.assignments.issueBill(id)),
    enabled: Boolean(id) && canGenerateBill,
  });

  // When reached via the "Bill" link in Reports (?print=1), open the print
  // dialog automatically once the bill content + number are ready.
  useEffect(() => {
    if (!autoPrint || printedRef.current || !canGenerateBill) return;
    if (!assignment || !customer || !billData) return;
    printedRef.current = true;
    // Small delay so the signature image / layout settle before printing.
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoPrint, canGenerateBill, assignment, customer, billData]);

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

  if (!canGenerateBill) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <p className="font-semibold text-amber-300">
            Work is still ongoing — bill not generated yet (কাজ এখনও শেষ হয়নি)
          </p>
          <p className="mt-1 text-muted-foreground">
            A bill can only be generated once an End Date is set or the assignment is marked Completed / Replaced.
          </p>
        </div>
      </div>
    );
  }

  const branch = locations?.items.find((b) => b.id === assignment.location_id) ?? null;
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;

  const targetMonth = String(assignment.start_date).slice(0, 7);
  const matchingAssignments = (allCustAssignments?.items ?? []).filter(
    (a) =>
      a.customer_id === assignment.customer_id &&
      a.status !== "cancelled" &&
      (Boolean(a.end_date) || a.status === "completed" || a.status === "replaced") &&
      (String(a.start_date).slice(0, 7) === targetMonth ||
        (a.end_date && String(a.end_date).slice(0, 7) === targetMonth))
  );
  matchingAssignments.sort((a, b) => (a.start_date > b.start_date ? 1 : -1));

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
              assignments={matchingAssignments.length > 0 ? matchingAssignments : [assignment]}
              branch={branch}
              authorizedSignatureUrl={authorizedSignatureUrl}
              employeeMap={employeeMap}
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
