import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { normalizeError } from "@/services/api/client";
import { staffPortalService } from "@/services/staff-portal.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton, StaffAuthShell } from "./StaffAuthShell";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  location_id: string;
}

export function StaffRegisterPage() {
  const { register: createAccount, isAuthenticated } = useStaffAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Public branch list — drives the mandatory branch choice. The branch is
  // what scopes the staff member to a manager, so it is picked up-front.
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["staff-portal", "branches"],
    queryFn: staffPortalService.branches,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: { name: "", email: "", password: "", location_id: "" },
  });

  if (isAuthenticated) return <Navigate to="/staff-portal" replace />;

  const onSubmit = async (values: RegisterForm) => {
    try {
      await createAccount(values);
      toast.success("Account created — let's complete your profile");
      navigate("/staff/onboarding", { replace: true });
    } catch (err) {
      toast.error(normalizeError(err).message);
    }
  };

  return (
    <StaffAuthShell
      pageTitle="Staff registration"
      title="Create your account"
      subtitle="Step 1 of 2 — we'll collect your details next."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Manisha Patel"
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
              {...register("email", { required: "Email is required" })}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

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
                minLength: { value: 8, message: "At least 8 characters" },
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
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
