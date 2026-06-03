"use client";

import { useEffect } from "react";
import {
  registerRimvioServiceWorker,
  subscribeWebPush,
} from "@/lib/pwa/service-worker";
import { isStandalonePwa } from "@/lib/platform/device";

/** Registers SW on boot; auto-subscribes Web Push when VAPID public key exists. */
export function ServiceWorkerBootstrap() {
  useEffect(() => {
    void (async () => {
      const registration = await registerRimvioServiceWorker();
      if (!registration) {
        return;
      }

      if (isStandalonePwa() && typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }

      await subscribeWebPush();
    })();
  }, []);

  return null;
}
