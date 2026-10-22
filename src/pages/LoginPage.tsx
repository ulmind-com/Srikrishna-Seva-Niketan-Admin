import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/config/env";

interface LoginForm {
  email: string;
  password: string;
}

const HIGHLIGHTS = [
  { icon: Activity, title: "Real-time operations", text: "Bookings, rentals & applications at a glance." },
  { icon: ShieldCheck, title: "Enterprise security", text: "Role-based access with full audit trails." },
  { icon: Sparkles, title: "Crafted experience", text: "A dashboard designed for daily delight." },
];

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
      toast.success("Welcome back!");
      const to = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(to, { replace: true });
    } catch (err) {
      toast.error(normalizeError(err).message);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Helmet>
        <title>Sign in · {env.APP_NAME}</title>
      </Helmet>

      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden brand-gradient lg:block">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">Nupun Health</p>
              <p className="text-sm text-white/70">Home Health Care Services</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-balance text-4xl font-bold leading-tight">
                The command center for premium home healthcare.
              </h1>
              <p className="mt-3 max-w-md text-white/80">
                Manage services, bookings, equipment and content — all from one
                elegant, secure workspace.
              </p>
            </div>
            <div className="space-y-4">
              {HIGHLIGHTS.map((h, i) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.12 }}
                  className="flex items-start gap-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/15">
                    <h.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{h.title}</p>
                    <p className="text-sm text-white/70">{h.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Nupun Home Health Care Services.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl brand-gradient text-white shadow-glow">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold">Nupun Health</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your admin account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="admin@nupunhealth.com"
                  className="pl-9"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-destructive">
                  {errors.email.message}
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
                  autoComplete="off"
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Protected by role-based access control. Unauthorized access is
            prohibited.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
