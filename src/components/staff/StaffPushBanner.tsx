import { Bell, BellOff, BellRing, CheckCircle2, AlertCircle, Loader2, Sparkles, Volume2 } from "lucide-react";
import { useStaffPushNotification } from "@/hooks/useStaffPushNotification";
import { Button } from "@/components/ui/button";
import { playDutyAlertSound } from "@/utils/audioAlert";

export function StaffPushBanner() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isTesting,
    enablePush,
    disablePush,
    sendTest,
  } = useStaffPushNotification();

  if (!isSupported) {
    return null;
  }

  // Active state: Nurse is fully subscribed and ready
  if (isSubscribed && permission === "granted") {
    return (
      <section className="no-print relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-background to-background p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <BellRing className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Instant Duty Push Alerts Active
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This device is registered. You will receive real-time duty assignments even when locked.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTest}
              disabled={isTesting}
              className="h-8 gap-1.5 text-xs font-medium border-emerald-500/30 hover:bg-emerald-500/10"
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              )}
              Test Alert
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => playDutyAlertSound()}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Preview Sound Chime"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disablePush}
              disabled={isLoading}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              title="Turn off alerts on this device"
            >
              <BellOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Blocked in browser settings
  if (permission === "denied") {
    return (
      <section className="no-print rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-destructive/10 p-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-destructive">
              Notifications Blocked in Browser
            </p>
            <p className="mt-0.5 text-muted-foreground">
              To receive emergency duty alerts, please click the lock/tune icon beside the URL in your browser address bar and enable notifications.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Prompt / Ready to enable state
  return (
    <section className="no-print relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Enable Duty Push Notifications
            </p>
            <p className="text-xs text-muted-foreground">
              Receive immediate alerts on this phone when an admin assigns you a new patient.
            </p>
          </div>
        </div>

        <Button
          onClick={enablePush}
          disabled={isLoading}
          size="sm"
          className="brand-gradient font-medium text-white shadow-md hover:brightness-110 gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          Enable Instant Alerts
        </Button>
      </div>
    </section>
  );
}
