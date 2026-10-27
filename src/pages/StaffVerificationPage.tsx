import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  FileText,
  Inbox,
  Loader2,
  XCircle,
  ShieldCheck,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { describeError } from "@/services/api/client";
import { staffAdminService } from "@/services/staff-portal.service";
import { settingsService } from "@/services/settings.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BranchName } from "@/components/common/BranchName";
import { ImageUpload } from "@/components/common/ImageUpload";
import { formatDate } from "@/components/documents/document-utils";
import type { Employee, ImageAsset } from "@/types/models";

const STATUS_TABS = [
  { key: "pending", label: "Awaiting review" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Needs changes" },
  { key: "draft", label: "Incomplete" },
] as const;

/**
 * The super-admin review queue for self-registered staff.
 *
 * Managers can open this page and see their own branch's submissions — the
 * backend scopes the list — but only a super admin may approve or reject, so
 * the action buttons are hidden for everyone else.
 */
export function StaffVerificationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  const canDecide = Boolean(user?.is_superuser);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-verification", status],
    queryFn: () => staffAdminService.listByStatus(status),
  });

  const items = data?.items ?? [];

  // Super-admin's signature — stored on website settings, printed as
  // "Authorized Signatory" on every staff ID card.
  const { data: websiteSettings } = useQuery({
    queryKey: ["settings", "website"],
    queryFn: () => settingsService.getWebsite(),
    enabled: canDecide,
    staleTime: 300_000,
  });
  const authSignatureMutation = useMutation({
    mutationFn: (authorized_signature: ImageAsset | null) =>
      settingsService.updateWebsite({ authorized_signature }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "website"] });
      toast.success("Authorized signature updated");
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-verification"] });
    queryClient.invalidateQueries({ queryKey: ["staff-location-stats"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Staff Verification</title>
      </Helmet>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canDecide
            ? "Review self-registered staff and approve them to generate their ID card and forms."
            : "Submissions from your branch. Only a super admin can approve or reject."}
        </p>
      </div>

      {/* Authorized signatory — super admin only */}
      {canDecide && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Authorized Signatory</p>
          </div>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Upload the super-admin's signature once. It prints as the
            "Authorized Signatory" on every staff ID card. Use a transparent PNG
            or a photo of the signature on white paper.
          </p>
          <div className="max-w-xs">
            <ImageUpload
              value={websiteSettings?.authorized_signature}
              onChange={(asset) => authSignatureMutation.mutate(asset)}
              folder="nupun/brand"
              aspect="wide"
            />
          </div>
          {authSignatureMutation.isPending && (
            <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
          )}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setStatus(t.key);
              setOpenId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === t.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nothing here</p>
          <p className="text-sm text-muted-foreground">
            No staff profiles with this status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((staff) => (
            <ReviewCard
              key={staff.id}
              staff={staff}
              open={openId === staff.id}
              onToggle={() => setOpenId(openId === staff.id ? null : staff.id)}
              canDecide={canDecide}
              onDone={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  staff,
  open,
  onToggle,
  canDecide,
  onDone,
}: {
  staff: Employee;
  open: boolean;
  onToggle: () => void;
  canDecide: boolean;
  onDone: () => void;
}) {
  const [designation, setDesignation] = useState(staff.designation ?? "");
  const [hrmsCode, setHrmsCode] = useState(staff.hrms_code ?? "");
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const verify = useMutation({
    mutationFn: () =>
      staffAdminService.verify(staff.id, {
        designation: designation || undefined,
        hrms_code: hrmsCode || undefined,
      }),
    onSuccess: () => {
      toast.success(`${staff.name} verified — documents are ready`);
      onDone();
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const reject = useMutation({
    mutationFn: () => staffAdminService.reject(staff.id, reason),
    onSuccess: () => {
      toast.success("Sent back to the staff member");
      setShowReject(false);
      onDone();
    },
    onError: (err) => toast.error(describeError(err)),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-muted/40"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          {staff.photo?.url ? (
            <img src={staff.photo.url} alt={staff.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center font-bold text-muted-foreground">
              {staff.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{staff.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {staff.category} · <BranchName id={staff.location_id} /> ·{" "}
            <span className="font-mono text-xs">{staff.code}</span>
          </p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-sm font-medium">{formatDate(staff.submitted_at)}</p>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded review */}
      {open && (
        <div className="border-t border-border bg-muted/20 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Phone" value={staff.phone} />
                <Detail label="Email" value={staff.email} />
                <Detail label="Date of birth" value={formatDate(staff.dob)} />
                <Detail label="Gender" value={staff.gender} />
                <Detail label="Experience" value={staff.experience} />
                <Detail label="Previous employer" value={staff.previous_employer} />
                <Detail label="Address" value={staff.address} className="sm:col-span-2" />
                <Detail
                  label="ID proof"
                  value={
                    staff.id_proof_type
                      ? `${staff.id_proof_type} ${staff.id_proof_number ?? ""}`.trim()
                      : null
                  }
                  className="sm:col-span-2"
                />
              </div>

              {/* Uploaded ID Document Preview & Anti-Fraud Audit */}
              {staff.id_proof?.url && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Uploaded {staff.id_proof_type || "Government ID"} Document
                    </span>
                    <a
                      href={staff.id_proof.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View Original File
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <a
                      href={staff.id_proof.url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative group h-32 w-48 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm"
                    >
                      <img
                        src={staff.id_proof.url}
                        alt="Government ID"
                        className="h-full w-full object-contain p-1 transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                        <Eye className="h-4 w-4" /> Enlarge
                      </div>
                    </a>

                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            staff.document_verification?.fraudRisk === "high"
                              ? "danger"
                              : staff.document_verification?.isVerified
                              ? "success"
                              : "warning"
                          }
                          className="text-[11px]"
                        >
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          {staff.document_verification?.isVerified
                            ? `Authentic ID Verified (${staff.document_verification.confidenceScore}% Match)`
                            : staff.document_verification?.fraudRisk === "high"
                            ? "Fraud / Mismatch Detected"
                            : "Document Attached (Awaiting Verification)"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                        <div>
                          <strong>ID Number Match:</strong>{" "}
                          <span className={staff.document_verification?.idNumberMatched ? "text-emerald-600 font-medium" : ""}>
                            {staff.document_verification?.idNumberMatched ? "Confirmed Match" : "Manual verification required"}
                          </span>
                        </div>
                        <div>
                          <strong>Applicant Name Match:</strong>{" "}
                          <span className={staff.document_verification?.nameMatched ? "text-emerald-600 font-medium" : ""}>
                            {staff.document_verification?.nameMatched ? "Confirmed Match" : "Name not found on card"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <strong>Anti-Fraud Heuristic:</strong>{" "}
                          <span className={staff.document_verification?.fraudRisk === "high" ? "text-rose-600 font-semibold" : "text-emerald-600"}>
                            {staff.document_verification?.fraudFlags && staff.document_verification.fraudFlags.length > 0
                              ? `Flagged: ${staff.document_verification.fraudFlags.join("; ")}`
                              : "Clean Original (No AI templates, stock watermarks, or forged patterns detected)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Work history
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-sm">
                  {staff.work_history || "—"}
                </p>
              </div>

              {staff.rejection_reason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Previously returned
                  </p>
                  <p className="mt-0.5 text-sm">{staff.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Signature + decision */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Signature
                </p>
                <div className="mt-1 grid h-20 place-items-center rounded-lg border border-border bg-white p-2">
                  {staff.signature?.url ? (
                    <img
                      src={staff.signature.url}
                      alt="Signature"
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not signed</span>
                  )}
                </div>
              </div>

              {staff.verification_status === "verified" ? (
                <div className="space-y-2">
                  <Badge variant="success">
                    <BadgeCheck className="mr-1 h-3 w-3" /> Verified{" "}
                    {formatDate(staff.verified_at)}
                  </Badge>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/employees/${staff.id}/documents`}>
                      <FileText className="mr-2 h-4 w-4" /> View documents
                    </Link>
                  </Button>
                </div>
              ) : (
                canDecide && (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Designation (on ID card)</Label>
                      <Input
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder={staff.category}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-HRMS code</Label>
                      <Input
                        value={hrmsCode}
                        onChange={(e) => setHrmsCode(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="h-9"
                      />
                    </div>

                    <Button
                      variant="success"
                      className="w-full"
                      loading={verify.isPending}
                      onClick={() => verify.mutate()}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Verify &amp; generate
                    </Button>

                    {showReject ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="What needs to be corrected?"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            loading={reject.isPending}
                            disabled={reason.trim().length < 3}
                            onClick={() => reject.mutate()}
                          >
                            Send back
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReject(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setShowReject(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Request changes
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm capitalize">{value || "—"}</p>
    </div>
  );
}
