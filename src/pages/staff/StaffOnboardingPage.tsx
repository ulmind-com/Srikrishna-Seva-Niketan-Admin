import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileSignature,
  Loader2,
  Send,
  Upload,
  UserRound,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { describeError } from "@/services/api/client";
import {
  staffPortalService,
  type StaffOnboardingPayload,
} from "@/services/staff-portal.service";
import { SignaturePad, type SignaturePadHandle } from "@/components/common/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ORG_NAME } from "./StaffAuthShell";
import type { Employee } from "@/types/models";
import {
  verifyDocument,
  type VerificationResult,
} from "@/lib/documentVerification";

const STEPS = [
  { id: 0, label: "Your details", icon: UserRound },
  { id: 1, label: "Work details", icon: Briefcase },
  { id: 2, label: "Government ID", icon: ShieldCheck },
  { id: 3, label: "Current photo", icon: Camera },
  { id: 4, label: "Signature", icon: FileSignature },
] as const;

const CATEGORIES = [
  "nurse",
  "aaya",
  "attendant",
  "physiotherapist",
  "japa",
  "nanny",
  "other",
];

const ID_TYPES = [
  { label: "Aadhaar Card", value: "Aadhaar", hint: "12-digit number (e.g. 1234 5678 9012)" },
  { label: "Voter ID Card", value: "Voter ID", hint: "EPIC alphanumeric number (e.g. ABC1234567)" },
  { label: "PAN Card", value: "PAN", hint: "10-character alphanumeric (e.g. ABCDE1234F)" },
  { label: "Driving Licence", value: "Driving Licence", hint: "State DL number" },
];

type FormValues = StaffOnboardingPayload;

/** Field group shown on a given step — used to validate before advancing. */
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["phone", "address"],
  1: ["experience", "work_history"],
  2: ["id_proof_type", "id_proof_number"],
  3: [],
  4: [],
};

export function StaffOnboardingPage() {
  const { staff, isAuthenticated, isLoading } = useStaffAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated || !staff) return <Navigate to="/staff/login" replace />;
  // A verified profile is locked — send them to their status page instead.
  if (staff.verification_status === "verified") return <Navigate to="/staff-portal" replace />;

  return <OnboardingForm staff={staff} />;
}

function OnboardingForm({ staff }: { staff: Employee }) {
  const { refresh } = useStaffAuth();
  const navigate = useNavigate();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    staff.photo?.url ?? null,
  );
  const [photoUploading, setPhotoUploading] = useState(false);

  // Government ID Document state
  const [idDocPreview, setIdDocPreview] = useState<string | null>(
    staff.id_proof?.url ?? null,
  );
  const [idDocUploading, setIdDocUploading] = useState(false);
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [docVerification, setDocVerification] = useState<VerificationResult | null>(
    (staff.document_verification as unknown as VerificationResult) ?? null,
  );

  const [hasSignature, setHasSignature] = useState(Boolean(staff.signature?.url));
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      phone: staff.phone ?? "",
      alt_phone: staff.alt_phone ?? "",
      address: staff.address ?? "",
      city: staff.city ?? "",
      pincode: staff.pincode ?? "",
      dob: staff.dob ?? "",
      gender: staff.gender ?? "",
      category: staff.category ?? "nurse",
      experience: staff.experience ?? "",
      work_history: staff.work_history ?? "",
      previous_employer: staff.previous_employer ?? "",
      id_proof_type: staff.id_proof_type ?? "Aadhaar",
      id_proof_number: staff.id_proof_number ?? "",
    },
  });

  const selectedIdType = watch("id_proof_type") || "Aadhaar";
  const selectedIdNumber = watch("id_proof_number") || "";

  // Handle Document Upload + Real-Time Verification
  const handleIdDocument = async (file: File) => {
    if (!selectedIdNumber.trim()) {
      toast.error(`Please enter your ${selectedIdType} number first before uploading.`);
      return;
    }

    setIdDocUploading(true);
    setVerifyingDoc(true);

    try {
      // 1. Run local image URL preview
      const localPreviewUrl = URL.createObjectURL(file);
      setIdDocPreview(localPreviewUrl);

      // 2. Run OCR & Anti-fraud algorithm
      toast.info("Scanning document & running anti-fraud checks…");
      const result = await verifyDocument({
        file,
        idType: selectedIdType,
        idNumber: selectedIdNumber.trim(),
        applicantName: staff.name,
        applicantPhotoUrl: photoPreview,
      });

      setDocVerification(result);

      if (result.fraudRisk === "high") {
        toast.error("Fraud Alert: Uploaded document does not match or appears to be a sample/template.");
      } else if (!result.idNumberMatched) {
        toast.warning(`Note: ID number could not be clearly matched. Please ensure the document is clear.`);
      } else {
        toast.success(`Government ID verified successfully (${result.confidenceScore}% match)`);
      }

      // 3. Upload to cloud storage
      const asset = await staffPortalService.upload(file, "id_proof");
      setIdDocPreview(asset.url);

      // 4. Save profile with verification results
      await staffPortalService.saveProfile({
        id_proof_type: selectedIdType,
        id_proof_number: selectedIdNumber.trim(),
        document_verification: result as unknown as Record<string, unknown>,
      });
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setIdDocUploading(false);
      setVerifyingDoc(false);
    }
  };

  const handlePhoto = async (file: File) => {
    // Quick heuristic: check if user uploaded a QR code instead of face
    const fileName = file.name.toLowerCase();
    if (fileName.includes("qr") || fileName.includes("code") || fileName.includes("barcode")) {
      toast.warning("Please upload a clear passport photo of your face, NOT a QR code.");
    }

    setPhotoUploading(true);
    try {
      const asset = await staffPortalService.upload(file, "photo");
      setPhotoPreview(asset.url);
      toast.success("Photo uploaded successfully");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const next = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length && !(await trigger(fields))) return;

    if (step === 2) {
      // Government ID step
      if (!selectedIdNumber.trim()) {
        toast.error("Please enter your Government ID number");
        return;
      }
      if (!idDocPreview) {
        toast.error("Please upload your Government ID document (Aadhaar / Voter ID / PAN)");
        return;
      }
      if (docVerification?.fraudRisk === "high") {
        toast.error("Please upload an authentic, original Government ID document without watermarks.");
        return;
      }
    }

    if (step === 3 && !photoPreview) {
      toast.error("Please upload your current passport photo to continue");
      return;
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  /** Save text fields, push the signature, then submit for verification. */
  const onSubmit = async (values: FormValues) => {
    if (!idDocPreview) {
      toast.error("Government ID document is mandatory");
      setStep(2);
      return;
    }
    if (!photoPreview) {
      toast.error("Please upload your photo first");
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries(values).filter(([, v]) => v !== "" && v != null),
        ),
        document_verification: docVerification as unknown as Record<string, unknown>,
      } as StaffOnboardingPayload;

      await staffPortalService.saveProfile(payload);

      const blob = await signatureRef.current?.toBlob();
      if (blob) {
        await staffPortalService.upload(blob, "signature");
      } else if (!hasSignature) {
        toast.error("Please sign on the board before submitting");
        setStep(4);
        setSubmitting(false);
        return;
      }

      await staffPortalService.submit();
      await refresh();
      toast.success("Application submitted! A super admin will review and verify your profile.");
      navigate("/staff-portal", { replace: true });
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <Helmet>
        <title>Complete your profile · {ORG_NAME}</title>
      </Helmet>

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Complete your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length} — {STEPS[step].label}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition ${
                    done
                      ? "border-success bg-success text-success-foreground"
                      : active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded ${done ? "bg-success" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            {/* ---- Step 0: personal details ---- */}
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number" error={errors.phone?.message} required>
                  <Input
                    placeholder="98765 43210"
                    {...register("phone", {
                      required: "Phone number is required",
                      minLength: { value: 10, message: "Enter a valid phone number" },
                    })}
                  />
                </Field>
                <Field label="Alternate phone">
                  <Input placeholder="Optional" {...register("alt_phone")} />
                </Field>
                <Field
                  label="Home address"
                  error={errors.address?.message}
                  required
                  className="sm:col-span-2"
                >
                  <Textarea
                    rows={2}
                    placeholder="House / street / area"
                    {...register("address", { required: "Address is required" })}
                  />
                </Field>
                <Field label="City">
                  <Input placeholder="Kolkata" {...register("city")} />
                </Field>
                <Field label="PIN code">
                  <Input placeholder="700001" {...register("pincode")} />
                </Field>
                <Field label="Date of birth">
                  <Input type="date" {...register("dob")} />
                </Field>
                <Field label="Gender">
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    {...register("gender")}
                  >
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            )}

            {/* ---- Step 1: work history ---- */}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role you are applying for">
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm capitalize outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    {...register("category")}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="capitalize">
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Total experience" error={errors.experience?.message} required>
                  <Input
                    placeholder="e.g. 3 years"
                    {...register("experience", { required: "Experience is required" })}
                  />
                </Field>
                <Field
                  label="What work have you done?"
                  error={errors.work_history?.message}
                  required
                  className="sm:col-span-2"
                >
                  <Textarea
                    rows={4}
                    placeholder="Describe the kind of patients you have cared for, duties handled, shifts worked…"
                    {...register("work_history", {
                      required: "Please describe your past work",
                      minLength: { value: 10, message: "Please add a little more detail" },
                    })}
                  />
                </Field>
                <Field label="Previous employer" className="sm:col-span-2">
                  <Input
                    placeholder="Hospital / agency / family (optional)"
                    {...register("previous_employer")}
                  />
                </Field>
              </div>
            )}

            {/* ---- Step 2: Government ID & AI Fraud Verification ---- */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Government ID Verification (Mandatory)
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload an authentic original copy of your Government ID. Our system checks your
                    ID number, applicant name, and runs automated anti-fraud checks to prevent duplicate or downloaded templates.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Government ID Type" required>
                    <select
                      className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      {...register("id_proof_type", { required: "Please select an ID type" })}
                    >
                      {ID_TYPES.map((id) => (
                        <option key={id.value} value={id.value}>
                          {id.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={`${selectedIdType} Number`} required error={errors.id_proof_number?.message}>
                    <Input
                      placeholder={ID_TYPES.find((t) => t.value === selectedIdType)?.hint ?? "Enter ID Number"}
                      className="font-mono text-sm uppercase"
                      {...register("id_proof_number", {
                        required: `${selectedIdType} number is required`,
                        minLength: { value: 6, message: "Enter a valid ID number" },
                      })}
                    />
                  </Field>
                </div>

                {/* Upload Box with Drag & Drop & Scan State */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Upload {selectedIdType} Document *
                  </Label>

                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-6 transition hover:border-primary/50">
                    {idDocPreview ? (
                      <div className="relative max-h-56 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                        <img
                          src={idDocPreview}
                          alt="Government ID"
                          className="h-full w-full object-contain max-h-52"
                        />
                        {verifyingDoc && (
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                            <span className="text-xs font-semibold bg-background/90 px-3 py-1 rounded-full shadow-sm text-primary flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 animate-pulse" /> Running OCR & Anti-Fraud Scan…
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-4">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Upload front-side of your {selectedIdType}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Supports JPG, PNG or PDF. Ensure text and ID number are clearly visible and unblurred.
                        </p>
                      </div>
                    )}

                    <input
                      ref={idDocInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleIdDocument(file);
                        e.target.value = "";
                      }}
                    />

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => idDocInputRef.current?.click()}
                        loading={idDocUploading || verifyingDoc}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {idDocPreview ? "Re-upload / Change Document" : "Select Document File"}
                      </Button>
                    </div>
                  </div>

                  {/* Real-time Verification & Anti-Fraud Audit Results Card */}
                  {docVerification && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 text-xs ${
                        docVerification.isVerified
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                        <span className="font-semibold flex items-center gap-1.5 text-foreground">
                          {docVerification.isVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                          AI Document Verification Audit
                        </span>
                        <Badge
                          variant={docVerification.isVerified ? "success" : "warning"}
                          className="font-mono text-[11px]"
                        >
                          Match Score: {docVerification.confidenceScore}%
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {docVerification.idNumberMatched ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          )}
                          <span>ID Number Match: {docVerification.idNumberMatched ? "Confirmed" : "Mismatch / Low Confidence"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {docVerification.nameMatched ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          )}
                          <span>Name Match: {docVerification.nameMatched ? "Confirmed" : "Name not found on card"}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          <span>
                            Anti-Fraud Scan: {docVerification.fraudFlags.length === 0 ? "Clean (Original Document)" : "Flagged"}
                          </span>
                        </div>
                      </div>

                      {docVerification.fraudFlags.length > 0 && (
                        <div className="mt-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-2 text-rose-700 dark:text-rose-300">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Warning / Fraud Flags:
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {docVerification.fraudFlags.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ---- Step 3: photo ---- */}
            {step === 3 && (
              <div className="flex flex-col items-center gap-5 py-4">
                <div className="relative h-44 w-36 overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Your photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}
                  {photoUploading && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="font-medium">Upload a current passport photo</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Face clearly visible, plain background. This appears on your official ID card.
                    Please do NOT upload a QR code or document placeholder.
                  </p>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhoto(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                  loading={photoUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {photoPreview ? "Change photo" : "Choose photo"}
                </Button>
              </div>
            )}

            {/* ---- Step 4: signature ---- */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Sign below</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Draw your signature with your finger on the white board. It is
                    printed on your ID card and both official application forms.
                  </p>
                </div>

                {staff.signature?.url && !hasSignature && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Your saved signature — draw a new one below to replace it.
                    </p>
                    <img
                      src={staff.signature.url}
                      alt="Saved signature"
                      className="h-14 object-contain"
                    />
                  </div>
                )}

                <SignaturePad ref={signatureRef} onChange={setHasSignature} height={210} />

                <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  By submitting you confirm that all details and documents provided are genuine and original.
                  A super admin will review your profile — you'll receive your ID card once verified.
                </p>
              </div>
            )}
          </motion.div>

          {/* ---- Navigation ---- */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0 || submitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" loading={submitting}>
                <Send className="mr-2 h-4 w-4" /> Submit for verification
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/** Small labelled field wrapper keeping the form markup readable. */
function Field({
  label,
  children,
  error,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
