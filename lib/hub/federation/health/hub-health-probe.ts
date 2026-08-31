/**
 * Remote Hub health probe — live + cached capability health (P0).
 */

import type {
  ConnectedHub,
  FederatedCapabilityRef,
  RemoteCapabilityHealth,
  RemoteHubHealthSummary,
} from "@/lib/hub/federation/types";
import { readCachedHubScan, scanRemoteHub } from "@/lib/hub/federation/discovery/remote-hub-scan";
import { upsertConnectedHub } from "@/lib/hub/federation/hub-connection-registry";

export type HealthProbeResult = {
  readonly hub: ConnectedHub;
  readonly summary: RemoteHubHealthSummary;
  readonly probedAtIso: string;
};

/** Probe hub health (demo: from scan cache; prod: fetch healthEndpoint). */
export async function probeHubHealth(hub: ConnectedHub): Promise<HealthProbeResult> {
  const scan = readCachedHubScan(hub.hubId) ?? (await scanRemoteHub(hub));
  const summary = scan.healthSummary;
  const status =
    summary.overall === "healthy"
      ? "healthy"
      : summary.overall === "degraded"
        ? "degraded"
        : summary.overall === "offline"
          ? "offline"
          : "connected";

  const updated = upsertConnectedHub({
    ...hub,
    status,
    lastHealthAtIso: new Date().toISOString(),
    detailKo: `● ${summary.healthyCount} · ⚠ ${summary.degradedCount} · ✕ ${summary.offlineCount}`,
  });

  return { hub: updated, summary, probedAtIso: new Date().toISOString() };
}

export function healthLabelKo(health: RemoteCapabilityHealth): string {
  switch (health) {
    case "healthy":
      return "● Healthy";
    case "degraded":
      return "⚠ Degraded";
    case "offline":
      return "✕ Offline";
    default:
      return "? Unknown";
  }
}

export function pickHealthyCapability(
  candidates: readonly FederatedCapabilityRef[],
): FederatedCapabilityRef | null {
  const order: RemoteCapabilityHealth[] = ["healthy", "degraded", "unknown", "offline"];
  for (const h of order) {
    const found = candidates.find((c) => c.health === h);
    if (found) return found;
  }
  return candidates[0] ?? null;
}
