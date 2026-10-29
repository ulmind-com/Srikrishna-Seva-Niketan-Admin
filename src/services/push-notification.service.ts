import { endpoints } from "./api/endpoints";
import { http } from "./api/http";
import { staffRequest } from "./api/staff-client";

/** Convert URL-safe base64 string to Uint8Array for PushManager subscription. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushDispatchPayload {
  target: "all_nurses" | "employee" | "all_admins";
  employee_id?: string;
  title: string;
  message: string;
  urgency?: "normal" | "high";
  link?: string;
}

export interface PushStatusResponse {
  active_staff_devices: number;
}

export const pushNotificationService = {
  /** Check if the current browser environment supports Web Push. */
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  /** Check current browser permission status. */
  getPermission(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  },

  /** Fetch server VAPID public key. */
  async getVapidPublicKey(): Promise<string> {
    const res = await http.get<{ public_key: string }>(endpoints.push.vapidPublicKey);
    return res.public_key;
  },

  /** Register or retrieve the Service Worker instance. */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      throw new Error("Push notifications are not supported in this browser");
    }
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  },

  /** Get existing browser push subscription if any. */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  /** Subscribe current nurse device and record with backend. */
  async subscribeStaffDevice(): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new Error("Push notifications are not supported on this browser or device");
    }

    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Notification permission was blocked in browser settings"
          : "Notification permission was dismissed"
      );
    }

    // 2. Register Service Worker
    const reg = await this.registerServiceWorker();
    await navigator.serviceWorker.ready;

    // 3. Fetch server VAPID public key
    const publicKey = await this.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe with PushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error("Incomplete push subscription payload from browser");
    }

    // 5. Send subscription to staff backend
    await staffRequest({
      method: "POST",
      url: endpoints.staffPortal.pushSubscription,
      data: {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        user_agent: navigator.userAgent,
      },
    });

    return subscription;
  },

  /** Unsubscribe current nurse device from push notifications. */
  async unsubscribeStaffDevice(): Promise<void> {
    if (!this.isSupported()) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await staffRequest({
          method: "DELETE",
          url: endpoints.staffPortal.pushSubscription,
          data: { endpoint: sub.endpoint },
        });
        await sub.unsubscribe();
      }
    } catch (e) {
      console.warn("Unsubscribe push device error", e);
    }
  },

  /** Dispatch immediate test push to verify nurse phone ringing/vibrating. */
  async sendStaffTestAlert(): Promise<{ sent: number }> {
    return await staffRequest<{ sent: number }>({
      method: "POST",
      url: endpoints.staffPortal.pushTest,
    });
  },

  /** Admin: Query active staff push subscribers. */
  async getPushStatus(): Promise<PushStatusResponse> {
    return await http.get<PushStatusResponse>(endpoints.notifications.pushStatus);
  },

  /** Admin: Dispatch instant duty push notification or broadcast. */
  async dispatchPush(payload: PushDispatchPayload): Promise<{ sent: number; total_targets: number }> {
    return await http.post<{ sent: number; total_targets: number }>(
      endpoints.notifications.pushDispatch,
      payload
    );
  },
};
