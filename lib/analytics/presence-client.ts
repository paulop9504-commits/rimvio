"use client";

import { readPresenceIdentity } from "@/lib/analytics/presence-ids";
import {
  PRESENCE_HEARTBEAT_MS,
} from "@/lib/analytics/presence-types";

let lastInteractionAt = 0;

function markInteraction() {
  lastInteractionAt = Date.now();
}

function resolveSurface(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/globe")) {
    return "globe";
  }
  if (pathname.startsWith("/peers")) {
    return "peers";
  }
  if (pathname.startsWith("/now")) {
    return "now";
  }
  if (pathname.startsWith("/search")) {
    return "search";
  }
  if (pathname.startsWith("/field")) {
    return "field";
  }
  return "app";
}

function isWorkingNow(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (document.hidden) {
    return false;
  }
  const recent = Date.now() - lastInteractionAt < 2 * 60_000;
  return document.hasFocus() && recent;
}

export async function sendPresenceHeartbeat(input?: {
  path?: string | null;
  working?: boolean;
}): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const { deviceId, sessionId } = readPresenceIdentity();
  const path = input?.path ?? window.location.pathname;
  const working = input?.working ?? isWorkingNow();
  void fetch("/api/analytics/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      sessionId,
      surface: resolveSurface(path),
      path,
      working,
    }),
    keepalive: true,
  }).catch(() => {
    // Non-blocking.
  });
}

/**
 * Start interval heartbeats. Call once from app Providers.
 * Returns cleanup.
 */
export function startPresenceHeartbeatLoop(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  markInteraction();
  const onInteract = () => markInteraction();
  window.addEventListener("pointerdown", onInteract, { passive: true });
  window.addEventListener("keydown", onInteract);
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      markInteraction();
      void sendPresenceHeartbeat();
    }
  });

  void sendPresenceHeartbeat();
  const timer = window.setInterval(() => {
    void sendPresenceHeartbeat();
  }, PRESENCE_HEARTBEAT_MS);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
  };
}
