import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ExternalLink, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadService } from "@/services/upload.service";
import { normalizeError } from "@/services/api/client";
import { cn } from "@/lib/utils";
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

export function isPdfAsset(asset?: ImageAsset | null): boolean {
  if (!asset) return false;
  if (asset.format?.toLowerCase() === "pdf") return true;
  if (asset.resource_type === "raw") return true;
  return asset.url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function DocumentFileUpload({
  value,
  onChange,
  folder,
  docLabel,
}: {
  value?: ImageAsset | null;
  onChange: (asset: ImageAsset | null) => void;
  folder: string;
  docLabel: string;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          const fileAsset = await uploadService.file(file, folder);
          onChange({
            url: fileAsset.url,
            public_id: fileAsset.public_id,
            format: fileAsset.format ?? "pdf",
            original_filename: fileAsset.original_filename ?? file.name,
            resource_type: fileAsset.resource_type ?? "raw",
          });
          toast.success(`${docLabel} PDF uploaded`);
        } else {
          const imgAsset = await uploadService.image(file, folder);
          onChange({ ...imgAsset, original_filename: file.name });
          toast.success(`${docLabel} image uploaded`);
        }
      } catch (err) {
        toast.error(normalizeError(err).message);
      } finally {
        setUploading(false);
      }
    },
    [folder, docLabel, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  if (value?.url) {
    const isPdf = isPdfAsset(value);
    return (
      <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-2.5">
        {isPdf ? (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
            <FileText className="h-7 w-7" />
          </div>
        ) : (
          <img
            src={value.url}
            alt={docLabel}
            className="h-14 w-20 shrink-0 rounded-lg border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {value.original_filename || (isPdf ? `${docLabel}.pdf` : `${docLabel} Image`)}
          </p>
          <a
            href={value.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> {isPdf ? "Open PDF" : "View Full"}
          </a>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-4 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40",
        isDragActive && "border-primary bg-primary/5",
        uploading && "pointer-events-none opacity-60"
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <Upload className="h-5 w-5 text-muted-foreground" />
      )}
      <p className="text-xs font-medium text-foreground">
        {uploading ? "Uploading…" : `Drop image or PDF for ${docLabel}, or click to browse`}
      </p>
      <p className="text-[11px] text-muted-foreground">Supports JPG, PNG, WEBP, or PDF (max 10MB)</p>
    </div>
  );
}

/**
 * Multi-document KYC editor allowing any number of identity proofs
 * (Aadhaar, Voter ID, PAN, Driving License, Passport, etc.), each with
 * its own type dropdown, number input, and Image or PDF upload.
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
                Upload {doc.doc_type || "Document"} (Image or PDF)
              </label>
              <DocumentFileUpload
                value={doc.file ?? null}
                onChange={(asset: ImageAsset | null) => updateRow(idx, { file: asset })}
                folder={folder}
                docLabel={doc.doc_type || "Document"}
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
