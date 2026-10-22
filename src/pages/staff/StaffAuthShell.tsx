import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { HeartPulse, BadgeCheck, IdCard, FileSignature } from "lucide-react";

export const ORG_NAME = "Srikrishna Seva Niketan";
export const ORG_TAGLINE = "Nursing · Aaya · Attendant Services";

const HIGHLIGHTS = [
  {
    icon: FileSignature,
    title: "Sign on screen",
    text: "Draw your signature right on your phone — no printing, no scanning.",
  },
  {
    icon: BadgeCheck,
    title: "Verified by head office",
    text: "A super admin reviews your profile before you are enrolled.",
  },
  {
    icon: IdCard,
    title: "Instant ID card",
    text: "Your photo ID and application forms generate the moment you're approved.",
  },
];

/** Split-screen shell shared by the staff login and registration screens. */
export function StaffAuthShell({
  title,
  subtitle,
  pageTitle,
  children,
}: {
  title: string;
  subtitle: string;
  pageTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Helmet>
        <title>
          {pageTitle} · {ORG_NAME}
        </title>
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
              <p className="text-lg font-bold">{ORG_NAME}</p>
              <p className="text-sm text-white/70">{ORG_TAGLINE}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-balance text-4xl font-bold leading-tight">
                Join our care team.
              </h1>
              <p className="mt-3 max-w-md text-white/80">
                Register once, complete your profile, and get your official
                staff ID — all from your phone.
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
            © {new Date().getFullYear()} {ORG_NAME}.
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
              <p className="text-base font-bold">{ORG_NAME}</p>
              <p className="text-xs text-muted-foreground">Staff Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Google sign-in button.
 *
 * The backend hook exists at `POST /staff-portal/google` but stays disabled
 * until a Google OAuth Client ID is configured — so the button explains that
 * rather than failing on click.
 */
export function GoogleButton({ disabled = true }: { disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs text-muted-foreground">or</span>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? "Google sign-in is not configured yet" : undefined}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
          />
        </svg>
        Continue with Google
      </button>
      {disabled && (
        <p className="text-center text-[11px] text-muted-foreground">
          Google sign-in will be enabled soon — use email and password for now.
        </p>
      )}
    </div>
  );
}
