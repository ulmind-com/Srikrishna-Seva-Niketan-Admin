import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { describeError } from "@/services/api/client";
import { staffPortalService } from "@/services/staff-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GoogleButton, StaffAuthShell } from "./StaffAuthShell";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  location_id: string;
  otp?: string;
}

export function StaffRegisterPage() {
  const { register: createAccount, isAuthenticated } = useStaffAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP Verification state
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Timer countdown for resending OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Public branch list
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["staff-portal", "branches"],
    queryFn: staffPortalService.branches,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: { name: "", email: "", password: "", location_id: "", otp: "" },
  });

  const emailValue = watch("email")?.trim().toLowerCase() || "";

  // Reset verification state if user edits email
  useEffect(() => {
    if (isEmailVerified && emailValue !== verifiedEmail) {
      setIsEmailVerified(false);
      setOtpSent(false);
      setOtpCode("");
    }
  }, [emailValue, isEmailVerified, verifiedEmail]);

  if (isAuthenticated) return <Navigate to="/staff-portal" replace />;

  /** Send 6-digit OTP via Resend */
  const handleSendOtp = async () => {
    if (!emailValue || !/\S+@\S+\.\S+/.test(emailValue)) {
      toast.error("Please enter a valid email address first");
      return;
    }

    setIsSendingOtp(true);
    try {
      await staffPortalService.sendOtp(emailValue);
      setOtpSent(true);
      setCountdown(60);
      toast.success(`Verification code sent to ${emailValue}`);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setIsSendingOtp(false);
    }
  };

  /** Verify the entered 6-digit OTP code */
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await staffPortalService.verifyOtp(emailValue, otpCode.trim());
      setIsEmailVerified(true);
      setVerifiedEmail(emailValue);
      toast.success("Email verified successfully! You can now complete registration.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const onSubmit = async (values: RegisterForm) => {
    if (!isEmailVerified) {
      toast.error("Please verify your email address with the OTP code first");
      return;
    }

    try {
      await createAccount({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        location_id: values.location_id,
        otp: otpCode.trim() || undefined,
      });
      toast.success("Account created — let's complete your profile");
      navigate("/staff/onboarding", { replace: true });
    } catch (err) {
      const msg = describeError(err);
      if (msg.toLowerCase().includes("already exists")) {
        toast.error("An account with this email already exists. Please sign in instead.", {
          action: {
            label: "Sign in",
            onClick: () => navigate("/staff/login"),
          },
        });
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <StaffAuthShell
      pageTitle="Staff registration"
      title="Create your account"
      subtitle="Step 1 of 2 — verify your email and set up your staff credentials."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              placeholder="e.g. Soumyajit Molla"
              className="pl-9"
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "Name is too short" },
              })}
            />
          </div>
          {errors.name && (
            <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Email Address with Resend OTP Verification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email address</Label>
            {isEmailVerified ? (
              <Badge variant="success" className="gap-1 text-[11px] py-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Email Verified
              </Badge>
            ) : null}
          </div>

          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isEmailVerified}
                placeholder="you@example.com"
                className={`pl-9 pr-9 ${
                  isEmailVerified
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : ""
                }`}
                {...register("email", { required: "Email is required" })}
              />
              {isEmailVerified && (
                <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              )}
            </div>

            {!isEmailVerified && (
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleSendOtp}
                loading={isSendingOtp}
                disabled={!emailValue || !/\S+@\S+\.\S+/.test(emailValue) || countdown > 0}
                className="shrink-0"
              >
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : otpSent ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Resend OTP
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5 text-primary" /> Send OTP
                  </>
                )}
              </Button>
            )}
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}

          {/* OTP Input Card */}
          <AnimatePresence>
            {!isEmailVerified && otpSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-medium flex items-center gap-1.5 text-foreground">
                      <KeyRound className="h-4 w-4 text-primary" /> Enter 6-Digit Code
                    </span>
                    <span className="text-[11px]">Sent via Resend to {emailValue}</span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="font-mono text-center tracking-[0.3em] font-bold text-base h-10 bg-background"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="default"
                      onClick={handleVerifyOtp}
                      loading={isVerifyingOtp}
                      disabled={otpCode.length < 6}
                      className="shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Verify Code
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Check your spam or junk folder if you don't see the email within 30 seconds.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Branch Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="location_id">Which branch are you joining?</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="location_id"
              disabled={branchesLoading}
              className="flex h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              {...register("location_id", { required: "Please choose your branch" })}
            >
              <option value="">
                {branchesLoading ? "Loading branches…" : "Select your branch"}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.city ? ` — ${b.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          {errors.location_id && (
            <p className="text-xs font-medium text-destructive">
              {errors.location_id.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="pl-9 pr-9"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Use at least 8 characters" },
                validate: (value) =>
                  !/[A-Z]/.test(value)
                    ? "Add at least one capital letter (A–Z)"
                    : !/[a-z]/.test(value)
                      ? "Add at least one small letter (a–z)"
                      : !/\d/.test(value)
                        ? "Add at least one number (0–9)"
                        : !/[\W_]/.test(value)
                          ? "Add at least one symbol (@ # ! …)"
                          : true,
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use 8+ characters with an uppercase letter, a number and a symbol.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={!isEmailVerified}
        >
          {isEmailVerified ? (
            <>
              Create account & continue <CheckCircle2 className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Verify email to continue <Lock className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5">
        <GoogleButton />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/staff/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </StaffAuthShell>
  );
}
