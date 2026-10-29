import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { IdCard, Printer, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/common/ImageUpload";
import { resourceServices } from "@/services/resources";
import { settingsService } from "@/services/settings.service";
import { staffPortalService } from "@/services/staff-portal.service";
import type { Employee, ImageAsset } from "@/types/models";
import { StaffIdCard } from "./StaffIdCard";
import { ApplicationFormI, ApplicationFormII } from "./StaffApplicationForms";

type DocKey = "id-card" | "form-1" | "form-2";

const TABS: { key: DocKey; label: string; icon: typeof IdCard }[] = [
  { key: "id-card", label: "ID Card", icon: IdCard },
  { key: "form-1", label: "Application Form I", icon: FileText },
  { key: "form-2", label: "Form II — Undertaking", icon: FileText },
];

/**
 * The three generated documents for a verified staff member, with one
 * printable at a time.
 *
 * Printing is browser-native: the selected document carries `.print-target`
 * and the global print stylesheet hides everything else, so what the user
 * sees on screen is exactly what lands on paper (or in a Save-as-PDF).
 */
export function StaffDocuments({
  staff,
  mode = "admin",
}: {
  staff: Employee;
  /**
   * "admin" (default) runs inside the admin panel with an admin token.
   * "staff" runs inside the self-service staff portal, where the admin-only
   * `locations` and `employees` endpoints would 401 and bounce the nurse to
   * the admin login — so it reads the branch from the public staff-portal
   * endpoint and hides the admin signature uploader.
   */
  mode?: "admin" | "staff";
}) {
  const [active, setActive] = useState<DocKey>("id-card");
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isStaffPortal = mode === "staff";

  // Resolve the branch name once; all three documents print it. The admin
  // panel reads the full locations list; the staff portal uses the public
  // branch list so it never hits an admin-only endpoint.
  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
    enabled: !isStaffPortal,
  });
  const { data: staffBranches } = useQuery({
    queryKey: ["staff-portal", "branches"],
    queryFn: () => staffPortalService.branches(),
    staleTime: 60_000,
    enabled: isStaffPortal,
  });
  const branchName = isStaffPortal
    ? staffBranches?.find((b) => b.id === staff.location_id)?.name
    : locations?.items.find((b) => b.id === staff.location_id)?.name;

  // The super-admin's signature, printed as "Authorized Signatory" on the card.
  const { data: settings } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
    staleTime: 300_000,
  });
  const authorizedSignatureUrl = settings?.authorized_signature?.url ?? null;

  // Upload / replace the card holder's own signature (or a photo of their
  // thumb impression) straight from the ID card view. Saved on the employee
  // and reflected on the card immediately.
  const qc = useQueryClient();
  const signatureMutation = useMutation({
    mutationFn: (signature: ImageAsset | null) =>
      resourceServices.employees.update(staff.id, { signature }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  /**
   * Download only the ID card as a PNG — captured straight from the card node,
   * so there is no page background, toolbar or A4 whitespace around it.
   */
  async function downloadCard() {
    const node = cardRef.current?.querySelector<HTMLElement>(".id-card");
    if (!node) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `ID-Card-${staff.code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("ID card download failed", err);
      // Fall back to the browser print dialog (Save as PDF still works there).
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Print just the ID card on a page cut to the card's exact size.
   *
   * The card is first rendered to a PNG, then printed from a throwaway iframe
   * whose only content is that image at the card's size, with an @page sized to
   * match. Nothing else is in that document, so there is no A4 background and
   * no stray whitespace — only the card. The forms keep their own A4 printing.
   */
  async function printCard() {
    const node = cardRef.current?.querySelector<HTMLElement>(".id-card");
    if (!node) {
      window.print();
      return;
    }
    const wMm = ((node.offsetWidth / 96) * 25.4).toFixed(1);
    const hMm = ((node.offsetHeight / 96) * 25.4).toFixed(1);
    setDownloading(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow!.document;
      doc.open();
      doc.write(
        `<!doctype html><html><head><style>` +
          `@page{size:${wMm}mm ${hMm}mm;margin:0}` +
          `html,body{margin:0;padding:0}` +
          `img{width:${wMm}mm;height:${hMm}mm;display:block}` +
          `</style></head><body><img src="${dataUrl}"></body></html>`,
      );
      doc.close();
      const img = doc.querySelector("img")!;
      const run = () => {
        iframe.contentWindow!.focus();
        iframe.contentWindow!.print();
        setTimeout(() => iframe.remove(), 1000);
      };
      if (img.complete) run();
      else img.onload = run;
    } catch (err) {
      console.error("ID card print failed", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === t.key
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {active === "id-card" && (
            <Button variant="outline" onClick={downloadCard} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Preparing…" : "Download Card"}
            </Button>
          )}
          <Button
            onClick={() => (active === "id-card" ? printCard() : window.print())}
            disabled={active === "id-card" && downloading}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {TABS.find((t) => t.key === active)?.label}
          </Button>
        </div>
      </div>

      {/* Card holder signature uploader (ID card only). Admin panel only —
          in the staff portal the profile is already verified and locked, and
          the update endpoint is admin-scoped. */}
      {active === "id-card" && !isStaffPortal && (
        <div className="no-print rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Signature of Card Holder</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Upload the staff member's signature. If they cannot sign, upload a
            photo of their thumb impression — it prints just above "Signature of
            Card Holder" on the card.
          </p>
          <div className="max-w-xs">
            <ImageUpload
              value={staff.signature}
              onChange={(asset) => signatureMutation.mutate(asset)}
              folder="ssn/employees/signatures"
              aspect="wide"
            />
          </div>
          {signatureMutation.isPending && (
            <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
          )}
        </div>
      )}

      {/* Document stage. The A4 forms keep their true width and scroll
          horizontally on narrow screens rather than squishing. */}
      <div className="overflow-x-auto rounded-2xl bg-muted/40 p-3 sm:p-5">
        <div className="flex justify-center">
          {active === "id-card" && (
            <div ref={cardRef} className="print-target w-[300px] shadow-lg">
              <StaffIdCard
                staff={staff}
                branchName={branchName}
                authorizedSignatureUrl={authorizedSignatureUrl}
              />
            </div>
          )}
          {active === "form-1" && (
            <div className="print-target">
              <ApplicationFormI staff={staff} branchName={branchName} />
            </div>
          )}
          {active === "form-2" && (
            <div className="print-target">
              <ApplicationFormII staff={staff} branchName={branchName} />
            </div>
          )}
        </div>
      </div>

      <p className="no-print text-center text-xs text-muted-foreground">
        Tip: in the print dialog choose <strong>Save as PDF</strong> and set margins
        to <strong>None</strong> for the cleanest result.
      </p>
    </div>
  );
}
