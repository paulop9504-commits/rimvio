/**
 * Browser device id (localStorage) + session id (sessionStorage).
 * Guest-first: no auth required.
 */

import { getAnalyticsSessionId } from "@/lib/analytics/store";

const DEVICE_KEY = "rimvio-analytics-device-id";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Stable across tabs/visits on this browser profile. */
export function getAnalyticsDeviceId(): string {
  if (!isBrowser()) {
    return "server-device";
  }
  try {
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId || deviceId.length < 8) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return getAnalyticsSessionId();
  }
}

export function readPresenceIdentity(): {
  deviceId: string;
  sessionId: string;
} {
  return {
    deviceId: getAnalyticsDeviceId(),
    sessionId: getAnalyticsSessionId(),
  };
}
