"use client";

import { useEffect } from "react";
import { startPresenceHeartbeatLoop } from "@/lib/analytics/presence-client";

/** Guest-first session/device presence heartbeats. */
export function PresenceHeartbeatBootstrap() {
  useEffect(() => startPresenceHeartbeatLoop(), []);
  return null;
}
