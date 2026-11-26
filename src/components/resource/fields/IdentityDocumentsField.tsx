import { FileText, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/common/ImageUpload";
import type { IdentityDocument, ImageAsset } from "@/types/models";

const DOC_TYPES: { label: string; value: string; placeholder: string }[] = [
  { label: "Aadhaar Card", value: "Aadhaar", placeholder: "e.g. 1234 5678 9012" },
  { label: "Voter ID Card", value: "Voter ID", placeholder: "e.g. ABC1234567" },
  { label: "PAN Card", value: "PAN", placeholder: "e.g. ABCDE1234F" },
  { label: "Driving License", value: "Driving License", placeholder: "DL number" },
  { label: "Passport", value: "Passport", placeholder: "Passport number" },
  { label: "Bank Passbook", value: "Bank Passbook", placeholder: "Account number" },
  { label: "Other", value: "Other", placeholder: "Document number" },
];

/**
 * Multi-document KYC editor allowing any number of identity proofs
 * (Aadhaar, Voter ID, PAN, Driving License, Passport, etc.), each with
 * its own type dropdown, number input, and document photo upload.
 */
export function IdentityDocumentsField({
  value,
  onChange,
  folder = "ssn/documents",
}: {
  value: IdentityDocument[] | null | undefined;
  onChange: (docs: IdentityDocument[]) => void;
  folder?: string;
}) {
  const docs: IdentityDocument[] =
    value && value.length > 0 ? value : [{ doc_type: "Aadhaar", doc_number: "", file: null }];

  const updateRow = (idx: number, patch: Partial<IdentityDocument>) => {
    const next = docs.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(next);
  };

  const addRow = () => {
    const usedTypes = new Set(docs.map((d) => d.doc_type));
    const nextType = DOC_TYPES.find((t) => !usedTypes.has(t.value))?.value ?? "Other";
    onChange([...docs, { doc_type: nextType, doc_number: "", file: null }]);
  };

  const removeRow = (idx: number) => {
    const next = docs.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [{ doc_type: "Aadhaar", doc_number: "", file: null }]);
  };

  return (
    <div className="space-y-3">
      {docs.map((doc, idx) => {
        const meta = DOC_TYPES.find((t) => t.value === doc.doc_type) ?? DOC_TYPES[DOC_TYPES.length - 1];
        return (
          <div
            key={idx}
            className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Document #{idx + 1}</span>
              </div>
              {(docs.length > 1 || doc.doc_number || doc.file) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(idx)}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Document Type
                </label>
                <Select
                  value={doc.doc_type || "Aadhaar"}
                  onValueChange={(v) => updateRow(idx, { doc_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  {doc.doc_type || "Document"} Number
                </label>
                <Input
                  placeholder={meta.placeholder}
                  value={doc.doc_number ?? ""}
                  onChange={(e) => updateRow(idx, { doc_number: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-muted-foreground">
                Upload {doc.doc_type || "Document"} Photo / Scan
              </label>
              <ImageUpload
                value={doc.file ?? null}
                onChange={(asset: ImageAsset | null) => updateRow(idx, { file: asset })}
                folder={folder}
              />
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Document (Aadhaar / Voter / PAN)
      </Button>
    </div>
  );
}
