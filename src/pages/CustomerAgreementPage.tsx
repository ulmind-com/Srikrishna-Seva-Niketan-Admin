import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Loader2, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { resourceServices } from "@/services/resources";
import { settingsService } from "@/services/settings.service";
import { CustomerAgreementForm } from "@/components/documents/CustomerAgreementForm";
import { IdentityDocumentsField } from "@/components/resource/fields/IdentityDocumentsField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Assignment, IdentityDocument } from "@/types/models";

/** Occupying statuses — the engagement that is current for this customer. */
const ACTIVE = new Set(["scheduled", "active"]);

/**
 * Admin view that generates a printable service agreement for one customer.
 * Fills the staff / shift / dates from the customer's current engagement when
 * one exists. Print produces the contract in duplicate (office + customer copy).
 */
export function CustomerAgreementPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();

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

  const rows: Assignment[] = assignments?.items ?? [];
  // Prefer the current engagement; fall back to the most recent one.
  const current =
    rows.find((a) => ACTIVE.has(a.status)) ??
    [...rows].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))[0] ??
    null;

  const [agreementDate, setAgreementDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [hasUserEditedDate, setHasUserEditedDate] = useState(false);
  const [purposeStr, setPurposeStr] = useState<string>("");
  const [hasUserEditedPurpose, setHasUserEditedPurpose] = useState(false);
  const [amountStr, setAmountStr] = useState<string>("");
  const [hasUserEditedAmount, setHasUserEditedAmount] = useState(false);
  const [docsOpen, setDocsOpen] = useState(true);
  const [docs, setDocs] = useState<IdentityDocument[]>([]);
  const [hasEditedDocs, setHasEditedDocs] = useState(false);

  // Sync saved agreementDate and purpose once customer loads
  useEffect(() => {
    if (customer) {
      if (!hasUserEditedDate) {
        const savedDate = customer.agreement_date || customer.created_at?.slice(0, 10);
        if (savedDate) setAgreementDate(String(savedDate).slice(0, 10));
      }
      if (!hasUserEditedPurpose) {
        setPurposeStr(customer.purpose ?? "");
      }
    }
  }, [customer, hasUserEditedDate, hasUserEditedPurpose]);

  // Sync customer documents when loaded
  useEffect(() => {
    if (!hasEditedDocs && customer) {
      if (customer.documents && customer.documents.length > 0) {
        setDocs(customer.documents);
      } else if (customer.id_proof_type || customer.id_proof_number || customer.id_proof) {
        setDocs([
          {
            doc_type: customer.id_proof_type || "Aadhaar",
            doc_number: customer.id_proof_number || "",
            file: customer.id_proof ?? null,
          },
        ]);
      } else {
        setDocs([{ doc_type: "Aadhaar", doc_number: "", file: null }]);
      }
    }
  }, [customer, hasEditedDocs]);

  const saveDocsMutation = useMutation({
    mutationFn: async (nextDocs: IdentityDocument[]) => {
      await resourceServices.customers.update(id, { documents: nextDocs });
    },
    onSuccess: () => {
      setHasEditedDocs(false);
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer documents saved");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save documents";
      toast.error(msg);
    },
  });

  // Sync initial amount once customer/assignment loads if user hasn't typed their own
  useEffect(() => {
    if (!hasUserEditedAmount && customer) {
      const derived =
        (current?.customer_rate && current.customer_rate > 0 ? current.customer_rate : null) ??
        (customer.billing_rate && customer.billing_rate > 0 ? customer.billing_rate : null) ??
        (current?.customer_daily_rate
          ? (current.total_days || customer.duration_days
              ? current.customer_daily_rate * (current.total_days || customer.duration_days!)
              : current.customer_daily_rate)
          : null);
      if (derived != null) {
        setAmountStr(String(derived));
      }
    }
  }, [customer, current, hasUserEditedAmount]);

  const saveDetailsMutation = useMutation({
    mutationFn: async (payload: {
      billing_rate?: number | null;
      agreement_date?: string | null;
      purpose?: string | null;
    }) => {
      await resourceServices.customers.update(id, payload);
    },
    onSuccess: () => {
      setHasUserEditedDate(false);
      setHasUserEditedPurpose(false);
      setHasUserEditedAmount(false);
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Agreement details saved to customer record");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save agreement details";
      toast.error(msg);
    },
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

  const branchName = locations?.items.find((b) => b.id === customer.location_id)?.name;
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;
  const parsedAmount = amountStr.trim() !== "" ? Number(amountStr) : null;
  const trimmedPurpose = purposeStr.trim();
  const savedDate = (customer.agreement_date || customer.created_at?.slice(0, 10) || "").slice(0, 10);
  const detailsDirty =
    agreementDate !== savedDate ||
    trimmedPurpose !== (customer.purpose ?? "").trim() ||
    (parsedAmount != null && parsedAmount !== customer.billing_rate);

  return (
    <div className="space-y-5">
      <Helmet>
        <title>Service Agreement — {customer.name}</title>
      </Helmet>

      {/* Top action toolbar (hidden during print) */}
      <div className="no-print rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="agreement-date" className="text-xs text-muted-foreground whitespace-nowrap">
                Agreement Date:
              </Label>
              <Input
                id="agreement-date"
                type="date"
                value={agreementDate}
                onChange={(e) => {
                  setHasUserEditedDate(true);
                  setAgreementDate(e.target.value);
                }}
                className="h-8 w-36 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="agreement-purpose" className="text-xs text-muted-foreground whitespace-nowrap">
                Purpose:
              </Label>
              <Input
                id="agreement-purpose"
                type="text"
                placeholder="e.g. Post-surgery recovery"
                value={purposeStr}
                onChange={(e) => {
                  setHasUserEditedPurpose(true);
                  setPurposeStr(e.target.value);
                }}
                className="h-8 w-44 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="contract-amount" className="text-xs text-muted-foreground whitespace-nowrap">
                Contract Amount (₹):
              </Label>
              <Input
                id="contract-amount"
                type="number"
                placeholder="e.g. 13500"
                value={amountStr}
                onChange={(e) => {
                  setHasUserEditedAmount(true);
                  setAmountStr(e.target.value);
                }}
                className="h-8 w-28 text-xs font-semibold"
              />
            </div>

            {detailsDirty && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-medium"
                disabled={saveDetailsMutation.isPending}
                onClick={() =>
                  saveDetailsMutation.mutate({
                    agreement_date: agreementDate || null,
                    purpose: trimmedPurpose || null,
                    ...(parsedAmount != null ? { billing_rate: parsedAmount } : {}),
                  })
                }
                title="Save agreement date, purpose, and contract amount to customer record"
              >
                {saveDetailsMutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Save Details
              </Button>
            )}

            <Button onClick={() => window.print()} className="h-8">
              <Printer className="mr-2 h-4 w-4" />
              Print Agreement
            </Button>
          </div>
        </div>
      </div>

      {/* Multi-document KYC upload panel (hidden during print) */}
      <div className="no-print rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setDocsOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                Customer Documents (Aadhaar / Voter ID / PAN / Image or PDF)
              </p>
              <p className="text-xs text-muted-foreground">
                Upload one or multiple identity documents (image or PDF) for this customer&apos;s agreement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {docs.filter((d) => d.doc_number?.trim() || d.file?.url).length} added
            </span>
            {docsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {docsOpen && (
          <div className="space-y-4 border-t border-border px-4 py-4">
            <IdentityDocumentsField
              value={docs}
              onChange={(next) => {
                setHasEditedDocs(true);
                setDocs(next);
              }}
              folder="ssn/customers/id-proof"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={saveDocsMutation.isPending}
                onClick={() => saveDocsMutation.mutate(docs)}
              >
                {saveDocsMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Customer Documents
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-muted/40 p-3 sm:p-5">
        <div className="flex justify-center">
          <div className="print-target">
            <CustomerAgreementForm
              customer={customer}
              assignment={current}
              branchName={branchName}
              authorizedSignatureUrl={authorizedSignatureUrl}
              agreementDate={agreementDate}
              overrideAmount={parsedAmount}
              overridePurpose={purposeStr}
              overrideDocuments={docs}
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