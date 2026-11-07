import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { staffPortalService } from "@/services/staff-portal.service";
import { describeError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StaffAuthShell } from "./StaffAuthShell";

/**
 * Forgot-password flow for the staff portal.
 *
 * Step 1 — enter the account email; a 6-digit reset code is emailed.
 * Step 2 — enter the code and a new password; on success, sign in again.
 *
 * The request endpoint always reports success (no account enumeration), so the
 * UI advances to step 2 regardless of whether the email is registered.
 */
export function StaffForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    if (!email.trim()) {
      toast.error("Enter your email address");
      return;
    }
    setBusy(true);
    try {
      const res = await staffPortalService.forgotPassword(email.trim());
      if (res?.dev_otp) setOtp(res.dev_otp); // dev convenience when email is off
      toast.success("If that email is registered, a reset code has been sent.");
      setStep(2);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (otp.trim().length < 6) {
      toast.error("Enter the 6-digit reset code");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await staffPortalService.resetPassword(email.trim(), otp.trim(), password);
      toast.success("Password updated — sign in with your new password.");
      navigate("/staff/login", { replace: true });
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffAuthShell
      pageTitle="Reset password"
      title="Reset your password"
      subtitle={
        step === 1
          ? "Enter your email and we'll send a reset code."
          : "Enter the code from your email and choose a new password."
      }
    >
      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset code
          </Button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submitReset();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="otp">6-digit reset code</Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="------"
                className="pl-9 font-mono tracking-[0.4em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pl-9 pr-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              At least 8 characters with an uppercase letter, a number and a special character.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={busy}>
            <KeyRound className="mr-2 h-4 w-4" />
            Set new password
          </Button>

          <button
            type="button"
            onClick={() => requestCode()}
            disabled={busy}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Didn't get a code? Resend
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/staff/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </StaffAuthShell>
  );
}
