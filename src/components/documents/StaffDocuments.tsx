import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IdCard, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resourceServices } from "@/services/resources";
import type { Employee } from "@/types/models";
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
export function StaffDocuments({ staff }: { staff: Employee }) {
  const [active, setActive] = useState<DocKey>("id-card");

  // Resolve the branch name once; all three documents print it.
  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });
  const branchName = locations?.items.find((b) => b.id === staff.location_id)?.name;

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

        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print {TABS.find((t) => t.key === active)?.label}
        </Button>
      </div>

      {/* Document stage */}
      <div className="overflow-x-auto rounded-2xl bg-muted/40 p-5">
        <div className="flex justify-center">
          {active === "id-card" && (
            <div className="print-target w-[300px] shadow-lg">
              <StaffIdCard staff={staff} branchName={branchName} />
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
