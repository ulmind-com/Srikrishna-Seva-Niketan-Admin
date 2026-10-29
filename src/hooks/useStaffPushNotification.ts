import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pushNotificationService } from "@/services/push-notification.service";
import { playDutyAlertSound, playSynthesizedChime } from "@/utils/audioAlert";

export function useStaffPushNotification() {
  const qc = useQueryClient();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const checkStatus = useCallback(async () => {
    if (!pushNotificationService.isSupported()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }
    setIsSupported(true);
    setPermission(pushNotificationService.getPermission());

    try {
      const sub = await pushNotificationService.getExistingSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Listen for messages from the Service Worker (foreground push received)
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "WEB_PUSH_RECEIVED") {
          playDutyAlertSound();
          qc.invalidateQueries({ queryKey: ["staff-notifications"] });
          qc.invalidateQueries({ queryKey: ["staff-assignments"] });
          qc.invalidateQueries({ queryKey: ["staff-duties"] });
          toast.info(event.data.payload?.title || "New Duty Alert", {
            description: event.data.payload?.body,
            duration: 8000,
          });
        }
      };

      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }
  }, [checkStatus, qc]);

  const enablePush = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.subscribeStaffDevice();
      setIsSubscribed(true);
      setPermission("granted");
      playSynthesizedChime();
      toast.success("Duty push notifications activated!", {
        description: "You will now receive instant alerts even when your phone is locked.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to enable notifications";
      setPermission(pushNotificationService.getPermission());
      toast.error("Could not enable push alerts", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const disablePush = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.unsubscribeStaffDevice();
      setIsSubscribed(false);
      toast.info("Push notifications turned off on this device.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to unsubscribe";
      toast.error("Error", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTest = async () => {
    setIsTesting(true);
    try {
      await pushNotificationService.sendStaffTestAlert();
      playDutyAlertSound();
      toast.success("Test alert dispatched!", {
        description: "Check your system notifications & sound chime.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send test alert";
      toast.error("Test alert failed", { description: message });
    } finally {
      setIsTesting(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isTesting,
    enablePush,
    disablePush,
    sendTest,
    checkStatus,
  };
}

