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
} from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { normalizeError } from "@/services/api/client";
import {
  staffPortalService,
  type StaffOnboardingPayload,
} from "@/services/staff-portal.service";
import { SignaturePad, type SignaturePadHandle } from "@/components/common/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORG_NAME } from "./StaffAuthShell";
import type { Employee } from "@/types/models";

const STEPS = [
  { id: 0, label: "Your details", icon: UserRound },
  { id: 1, label: "Work history", icon: FileSignature },
  { id: 2, label: "Photo", icon: Camera },
  { id: 3, label: "Signature", icon: FileSignature },
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

type FormValues = StaffOnboardingPayload;

/** Field group shown on a given step — used to validate before advancing. */
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["phone", "address"],
  1: ["experience", "work_history"],
  2: [],
  3: [],
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

/**
 * The wizard itself.
 *
 * Mounted only once the profile has loaded, because `useForm` captures its
 * `defaultValues` on first render — initialising it while `staff` was still
 * null would leave a returning staff member staring at an empty form.
 */
function OnboardingForm({ staff }: { staff: Employee }) {
  const { refresh } = useStaffAuth();
  const navigate = useNavigate();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    staff.photo?.url ?? null,
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(staff.signature?.url));
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
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
      id_proof_type: staff.id_proof_type ?? "",
      id_proof_number: staff.id_proof_number ?? "",
    },
  });

  const next = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length && !(await trigger(fields))) return;
    if (step === 2 && !photoPreview) {
      toast.error("Please upload your photo to continue");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handlePhoto = async (file: File) => {
    setPhotoUploading(true);
    try {
      const asset = await staffPortalService.upload(file, "photo");
      setPhotoPreview(asset.url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(normalizeError(err).message);
    } finally {
      setPhotoUploading(false);
    }
  };

  /** Save text fields, push the signature, then submit for verification. */
  const onSubmit = async (values: FormValues) => {
    if (!photoPreview) {
      toast.error("Please upload your photo first");
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      // Empty strings would overwrite saved values with blanks.
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v != null),
      ) as StaffOnboardingPayload;
      await staffPortalService.saveProfile(payload);

      const blob = await signatureRef.current?.toBlob();
      if (blob) {
        await staffPortalService.upload(blob, "signature");
      } else if (!hasSignature) {
        toast.error("Please sign on the board before submitting");
        setStep(3);
        setSubmitting(false);
        return;
      }

      await staffPortalService.submit();
      await refresh();
      toast.success("Submitted! A super admin will review your profile.");
      navigate("/staff-portal", { replace: true });
    } catch (err) {
      toast.error(normalizeError(err).message);
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
                <Field label="ID proof type">
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    {...register("id_proof_type")}
                  >
                    <option value="">Select</option>
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="PAN">PAN</option>
                    <option value="Driving Licence">Driving Licence</option>
                  </select>
                </Field>
                <Field label="ID proof number">
                  <Input placeholder="Optional" {...register("id_proof_number")} />
                </Field>
              </div>
            )}

            {/* ---- Step 2: photo ---- */}
            {step === 2 && (
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
                    Face clearly visible, plain background. This appears on your ID card.
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

            {/* ---- Step 3: signature ---- */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Sign below</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Draw your signature with your finger on the white board. It is
                    printed on your ID card and both application forms.
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
                  By submitting you confirm the details are true. A super admin will
                  review your profile — you'll see the result on your dashboard.
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
