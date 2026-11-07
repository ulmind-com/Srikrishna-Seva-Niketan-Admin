import { useRef, useState } from "react";
import { Check, CreditCard, Landmark, Upload, Vote } from "lucide-react";
import { toast } from "sonner";
import { staffPortalService } from "@/services/staff-portal.service";
import { describeError } from "@/services/api/client";
import type { Employee } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PhotoKind = "voter_photo" | "pan_photo" | "bank_photo";

/**
 * Additional KYC documents collected during onboarding beyond the primary
 * government ID: Voter ID, PAN and bank account. Each is a number plus a
 * document photo. All optional — they do not gate submission; a super admin
 * reviews whatever is provided.
 */
export function KycDocsSection({ staff }: { staff: Employee }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          Additional KYC Documents
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Voter ID, PAN and bank details. Optional, but recommended — your branch
          uses these for records and salary payouts.
        </p>
      </div>

      <DocBlock
        icon={<Vote className="h-4 w-4" />}
        label="Voter ID"
        placeholder="Voter ID number"
        numberField="voter_number"
        photoKind="voter_photo"
        initialNumber={staff.voter_number ?? ""}
        initialPhoto={staff.voter_photo?.url ?? null}
      />

      <DocBlock
        icon={<CreditCard className="h-4 w-4" />}
        label="PAN"
        placeholder="PAN number (ABCDE1234F)"
        numberField="pan_number"
        photoKind="pan_photo"
        uppercase
        initialNumber={staff.pan_number ?? ""}
        initialPhoto={staff.pan_photo?.url ?? null}
      />

      <BankBlock staff={staff} />
    </div>
  );
}

function DocBlock({
  icon,
  label,
  placeholder,
  numberField,
  photoKind,
  uppercase = false,
  initialNumber,
  initialPhoto,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  numberField: "voter_number" | "pan_number";
  photoKind: PhotoKind;
  uppercase?: boolean;
  initialNumber: string;
  initialPhoto: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [number, setNumber] = useState(initialNumber);
  const [preview, setPreview] = useState<string | null>(initialPhoto);
  const [uploading, setUploading] = useState(false);

  async function saveNumber() {
    const value = number.trim();
    if (value === initialNumber.trim()) return;
    try {
      await staffPortalService.saveProfile({ [numberField]: value });
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      setPreview(URL.createObjectURL(file));
      const asset = await staffPortalService.upload(file, photoKind);
      setPreview(asset.url);
      if (number.trim()) await staffPortalService.saveProfile({ [numberField]: number.trim() });
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(describeError(err));
      setPreview(initialPhoto);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <Input
          placeholder={placeholder}
          value={number}
          className={uppercase ? "font-mono uppercase tracking-wider" : ""}
          onChange={(e) => setNumber(e.target.value)}
          onBlur={saveNumber}
        />
        <div className="flex items-center gap-2">
          {preview && !uploading && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Uploaded
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {preview ? "Change" : "Upload"}
          </Button>
        </div>
      </div>
      {preview && (
        <div className="mt-2 max-h-28 overflow-hidden rounded-lg border border-border bg-background">
          <img src={preview} alt={label} className="max-h-28 w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function BankBlock({ staff }: { staff: Employee }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState(staff.bank_account_number ?? "");
  const [ifsc, setIfsc] = useState(staff.bank_ifsc ?? "");
  const [preview, setPreview] = useState<string | null>(staff.bank_photo?.url ?? null);
  const [uploading, setUploading] = useState(false);

  async function save() {
    try {
      await staffPortalService.saveProfile({
        bank_account_number: account.trim(),
        bank_ifsc: ifsc.trim().toUpperCase(),
      });
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      setPreview(URL.createObjectURL(file));
      const asset = await staffPortalService.upload(file, "bank_photo");
      setPreview(asset.url);
      await save();
      toast.success("Bank document uploaded");
    } catch (err) {
      toast.error(describeError(err));
      setPreview(staff.bank_photo?.url ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Landmark className="h-4 w-4" /> Bank Account
      </Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Account number"
          value={account}
          className="font-mono tracking-wider"
          onChange={(e) => setAccount(e.target.value)}
          onBlur={save}
        />
        <Input
          placeholder="IFSC code"
          value={ifsc}
          className="font-mono uppercase tracking-wider"
          onChange={(e) => setIfsc(e.target.value)}
          onBlur={save}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        {preview && !uploading && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Passbook / cheque uploaded
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {preview ? "Change passbook" : "Upload passbook / cheque"}
        </Button>
      </div>
      {preview && (
        <div className="mt-2 max-h-28 overflow-hidden rounded-lg border border-border bg-background">
          <img src={preview} alt="Bank document" className="max-h-28 w-full object-contain" />
        </div>
      )}
    </div>
  );
}
