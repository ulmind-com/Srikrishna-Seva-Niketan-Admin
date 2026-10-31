import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  FilePenLine,
  HeartPulse,
  LogOut,
  Loader2,
} from "lucide-react";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaffDocuments } from "@/components/documents/StaffDocuments";
import { StaffDuties } from "@/components/staff/StaffDuties";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import {
  VERIFICATION_LABEL,
  VERIFICATION_VARIANT,
} from "@/components/documents/document-utils";
import { ORG_NAME } from "./StaffAuthShell";
import { StaffNotifications } from "./StaffNotifications";
import { StaffPushBanner } from "@/components/staff/StaffPushBanner";

/** The staff member's home screen after signing in. */
export function StaffStatusPage() {
  const { staff, isAuthenticated, isLoading, logout } = useStaffAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated || !staff) return <Navigate to="/staff/login" replace />;

  const status = staff.verification_status;

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>My profile · {ORG_NAME}</title>
      </Helmet>

      {/* Top bar */}
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl brand-gradient text-white">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{ORG_NAME}</p>
              <p className="text-xs text-muted-foreground">Staff Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Identity strip */}
        <section className="no-print flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
            {staff.photo?.url ? (
              <img
                src={staff.photo.url}
                alt={staff.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-xl font-bold text-muted-foreground">
                {staff.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight flex items-center gap-1.5">
              <span>{staff.name}</span>
              {status === "verified" && (
                <VerifiedBadge size={22} title="Official Verified Staff Member" />
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {staff.designation ?? staff.category} · Staff code{" "}
              <span className="font-mono">{staff.code}</span>
            </p>
          </div>
          <Badge variant={VERIFICATION_VARIANT[status] ?? "muted"}>
            {VERIFICATION_LABEL[status] ?? status}
          </Badge>
        </section>

        {/* Duty Push Notification Control */}
        <StaffPushBanner />

        {/* Live notification feed */}
        <StaffNotifications />

        {/* Status-specific panel */}
        {status === "draft" && (
          <StatusPanel
            tone="primary"
            icon={FilePenLine}
            title="Finish your profile"
            text="Add your details, work history, photo and signature, then submit for verification."
          >
            <Button asChild>
              <Link to="/staff/onboarding">Continue my profile</Link>
            </Button>
          </StatusPanel>
        )}

        {status === "pending" && (
          <StatusPanel
            tone="warning"
            icon={Clock}
            title="Awaiting verification"
            text="Your profile has been submitted. A super admin will review it shortly — you'll see your ID card here once approved."
          />
        )}

        {status === "rejected" && (
          <StatusPanel
            tone="danger"
            icon={AlertTriangle}
            title="Changes requested"
            text={
              staff.rejection_reason ??
              "Your profile needs a few corrections before it can be approved."
            }
          >
            <Button asChild>
              <Link to="/staff/onboarding">Update and resubmit</Link>
            </Button>
          </StatusPanel>
        )}

        {status === "verified" && (
          <>
            <StaffDuties />
            <StatusPanel
              tone="success"
              icon={BadgeCheck}
              title="You're verified"
              text="Your documents are ready. Print your ID card and keep it with you while on duty."
            />
            <StaffDocuments staff={staff} mode="staff" />
          </>
        )}
      </main>
    </div>
  );
}

const TONES = {
  primary: "border-primary/30 bg-primary/5 text-primary",
  success: "border-success/30 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/5 text-warning",
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
} as const;

function StatusPanel({
  tone,
  icon: Icon,
  title,
  text,
  children,
}: {
  tone: keyof typeof TONES;
  icon: typeof Clock;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={`no-print flex flex-wrap items-start gap-4 rounded-2xl border p-5 ${TONES[tone]}`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </section>
  );
}
