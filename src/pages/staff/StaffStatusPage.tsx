import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Clock,
  FilePenLine,
  FolderClock,
  HeartPulse,
  IdCard,
  LogOut,
  Loader2,
} from "lucide-react";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StaffDocuments } from "@/components/documents/StaffDocuments";
import { StaffDuties } from "@/components/staff/StaffDuties";
import { StaffDutyHistory } from "@/components/staff/StaffDutyHistory";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import {
  VERIFICATION_LABEL,
  VERIFICATION_VARIANT,
} from "@/components/documents/document-utils";
import { ORG_NAME } from "./StaffAuthShell";
import { StaffNotifications, useStaffNotificationCount } from "./StaffNotifications";
import { StaffPushBanner } from "@/components/staff/StaffPushBanner";

type TabType = "duty" | "history" | "documents";

/** The staff member's ultra-premium home screen with native app styling. */
export function StaffStatusPage() {
  const { staff, isAuthenticated, isLoading, logout } = useStaffAuth();
  const [activeTab, setActiveTab] = useState<TabType>("duty");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unread } = useStaffNotificationCount();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated || !staff) return <Navigate to="/staff/login" replace />;

  const status = staff.verification_status;
  const isVerified = status === "verified";

  return (
    <div className="min-h-screen bg-muted/20 pb-24 sm:pb-12 text-foreground font-sans">
      <Helmet>
        <title>Nurse Portal · {ORG_NAME}</title>
      </Helmet>

      {/* Top Application Header */}
      <header className="sticky top-0 z-30 no-print border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl brand-gradient text-white shadow-sm">
              <HeartPulse className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold leading-tight tracking-tight">
                {ORG_NAME}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  Staff Portal
                </span>
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500 font-semibold">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notification Bell with Red Badge */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-muted/60 text-foreground hover:bg-muted transition-all active:scale-95 border border-border/60 cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black text-white shadow-sm animate-pulse">
                  {unread}
                </span>
              )}
            </button>

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-9 sm:h-10 px-2.5 sm:px-3 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl space-y-4 sm:space-y-6 px-3.5 sm:px-6 py-4 sm:py-6">
        {/* Nurse Identity Strip */}
        <section className="no-print rounded-3xl border border-border/80 bg-card/80 p-4 sm:p-5 shadow-soft backdrop-blur-sm">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl bg-muted border border-border/80 shadow-xs">
              {staff.photo?.url ? (
                <img
                  src={staff.photo.url}
                  alt={staff.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xl font-black text-muted-foreground bg-primary/10 text-primary">
                  {staff.name.charAt(0)}
                </div>
              )}
              {isVerified && (
                <span className="absolute bottom-0 inset-x-0 bg-emerald-500 py-0.5 text-center text-[9px] font-black uppercase tracking-wider text-white">
                  PRO
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base sm:text-xl font-bold tracking-tight flex items-center gap-1.5">
                <span className="truncate">{staff.name}</span>
                {isVerified && (
                  <VerifiedBadge size={20} title="Official Verified Staff Member" />
                )}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {staff.designation ?? staff.category} · Code:{" "}
                <span className="font-mono font-semibold text-foreground">{staff.code}</span>
              </p>
            </div>

            <div className="shrink-0">
              <Badge
                variant={VERIFICATION_VARIANT[status] ?? "muted"}
                className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs"
              >
                {VERIFICATION_LABEL[status] ?? status}
              </Badge>
            </div>
          </div>
        </section>

        {/* Duty Push Notification Control */}
        <StaffPushBanner />

        {/* Unverified Status Notice Panels */}
        {!isVerified && (
          <>
            {status === "draft" && (
              <StatusPanel
                tone="primary"
                icon={FilePenLine}
                title="Finish your profile"
                text="Add your details, work history, photo and signature, then submit for verification."
              >
                <Button asChild size="sm" className="rounded-xl font-bold">
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
                <Button asChild size="sm" variant="destructive" className="rounded-xl font-bold">
                  <Link to="/staff/onboarding">Update and resubmit</Link>
                </Button>
              </StatusPanel>
            )}
          </>
        )}

        {/* Verified Nurse Interactive Surface */}
        {isVerified && (
          <>
            {/* Desktop Navigation Tabs */}
            <div className="hidden sm:flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border/80 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("duty")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "duty"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <HeartPulse className="h-4 w-4" />
                <span>লাইভ ডিউটি (Current Duty)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FolderClock className="h-4 w-4" />
                <span>কাজের ইতিহাস (Duty History)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "documents"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <IdCard className="h-4 w-4" />
                <span>আইডি ও ডকুমেন্টস (ID & Docs)</span>
              </button>
            </div>

            {/* Tab 1: Live Duty */}
            {activeTab === "duty" && (
              <div className="space-y-4 sm:space-y-6">
                <StaffDuties />
              </div>
            )}

            {/* Tab 2: Duty Record & History */}
            {activeTab === "history" && (
              <div className="space-y-4 sm:space-y-6">
                <StaffDutyHistory />
              </div>
            )}

            {/* Tab 3: Official ID & Verified Documents */}
            {activeTab === "documents" && (
              <div className="space-y-4 sm:space-y-6">
                <StatusPanel
                  tone="success"
                  icon={BadgeCheck}
                  title="You're verified"
                  text="Your documents and official identity credentials are authenticated. Print or display your digital ID card while on duty."
                />
                <StaffDocuments staff={staff} mode="staff" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Ultra-Pro Native App Mobile Bottom Navigation Bar */}
      {isVerified && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 px-4 py-2 shadow-2xl">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("duty")}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === "duty"
                  ? "text-primary font-black scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                  activeTab === "duty" ? "bg-primary/15 text-primary" : ""
                }`}
              >
                <HeartPulse className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-tight">ডিউটি</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === "history"
                  ? "text-primary font-black scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                  activeTab === "history" ? "bg-primary/15 text-primary" : ""
                }`}
              >
                <FolderClock className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-tight">ইতিহাস</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === "documents"
                  ? "text-primary font-black scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                  activeTab === "documents" ? "bg-primary/15 text-primary" : ""
                }`}
              >
                <IdCard className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-tight">আইডি কার্ড</span>
            </button>
          </div>
        </nav>
      )}

      {/* Notifications Slide-Out Sheet */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="p-4 border-b border-border text-left">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-primary" />
              <span>নোটিফিকেশন (Notifications)</span>
            </SheetTitle>
          </SheetHeader>
          <div className="p-2">
            <StaffNotifications mode="popup" onClose={() => setNotificationsOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
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
      className={`no-print flex flex-wrap items-start gap-3.5 sm:gap-4 rounded-3xl border p-4 sm:p-5 ${TONES[tone]} shadow-xs`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card shadow-xs">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold text-sm sm:text-base text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
      {children}
    </section>
  );
}
