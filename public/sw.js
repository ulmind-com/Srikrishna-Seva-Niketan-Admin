/**
 * Shri Krishna Nursing Service Worker
 * Handles real-time background Web Push notifications for nurses and field staff.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "Duty Alert",
        body: event.data.text() || "You have a new duty assignment.",
      };
    }
  }

  const title = data.title || "Shri Krishna Nursing: Duty Alert";
  const options = {
    body: data.body || "New duty assignment received. Tap to view details.",
    icon: data.icon || "/brand/ssn-logo.webp",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || `duty-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    vibrate: data.vibrate || [250, 100, 250, 100, 500],
    data: data.data || { url: "/staff/status" },
    actions: data.actions || [
      { action: "open", title: "View Duty 📋" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Also notify any open client windows so the in-app UI can chime and refresh
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "WEB_PUSH_RECEIVED",
            payload: { title, ...options },
          });
        });
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/staff/status";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

