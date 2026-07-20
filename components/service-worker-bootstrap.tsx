"use client";

import { useEffect } from "react";
import {
  refreshRimvioServiceWorker,
  registerRimvioServiceWorker,
  subscribeWebPush,
} from "@/lib/pwa/service-worker";
import { isStandalonePwa } from "@/lib/platform/device";

const SW_RELOAD_ONCE_KEY = "rimvio:sw-controller-reload-v4";

/**
 * Register SW for push/reminders.
 * Do NOT reload-loop on controllerchange — Edge often claims mid-navigation
 * and an auto-reload leaves the tab spinner on "새 탭" forever while Chrome looks fine.
 */
export function ServiceWorkerBootstrap() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const registration = await registerRimvioServiceWorker();
      if (cancelled || !registration) {
        return;
      }

      // One-shot soft recovery after this SW version ships — not on every claim.
      if (
        registration.waiting &&
        typeof sessionStorage !== "undefined" &&
        !sessionStorage.getItem(SW_RELOAD_ONCE_KEY)
      ) {
        sessionStorage.setItem(SW_RELOAD_ONCE_KEY, "1");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      if (isStandalonePwa() && typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {
            /* Edge may reject without hanging the app */
          }
        }
      }

      // Never block boot on push — Edge `serviceWorker.ready` can stall.
      void subscribeWebPush();
    })();

    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshRimvioServiceWorker();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
