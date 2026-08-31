/**
 * Remote Hub scan — fetch Platforms · Capabilities · Workflows · Schemas · Permissions · Health.
 */

import type { ConnectedHub, RemoteHubScanResult } from "@/lib/hub/federation/types";
import { upsertConnectedHub } from "@/lib/hub/federation/hub-connection-registry";
import {
  SHOPPING_HUB_ID,
  buildShoppingHubScan,
  TRAVEL_PARTNER_HUBS,
  buildTravelCompositionCapabilities,
  SHOPPING_CAPABILITIES,
} from "@/lib/hub/federation/seeds/shopping-hub-seed";

/** In-memory scan cache (hubId → last scan). */
const scanCache = new Map<string, RemoteHubScanResult>();

function scanTravelHub(hub: ConnectedHub): RemoteHubScanResult {
  const caps = buildTravelCompositionCapabilities().filter((c) => c.hubId === hub.hubId);
  const healthMap = Object.fromEntries(caps.map((c) => [c.capabilityId, c.health]));
  return {
    hub: { ...hub, status: "healthy", lastScanAtIso: new Date().toISOString() },
    platforms: [{ platformId: caps[0]?.platformId ?? hub.hubId, platformName: hub.label, capabilityCount: caps.length, workflowCount: 1, schemaCount: caps.length }],
    capabilities: caps,
    workflows: [{ id: "wf.travel", label: "search → book → pay" }],
    schemas: caps.map((c) => ({ id: c.outputSchema, version: "v1" })),
    permissions: caps.map((c) => ({ capabilityId: c.capabilityId, action: "invoke" as const, allowed: true })),
    versions: caps.map((c) => ({ capabilityId: c.capabilityId, schemaVersion: "v1" })),
    healthSummary: {
      overall: "healthy",
      healthyCount: caps.length,
      degradedCount: 0,
      offlineCount: 0,
      capabilityHealth: healthMap,
    },
    scannedAtIso: new Date().toISOString(),
  };
}

/** Scan remote hub manifest (demo: seed data; prod: HTTP fetch). */
export async function scanRemoteHub(hub: ConnectedHub): Promise<RemoteHubScanResult> {
  let result: RemoteHubScanResult;

  if (hub.hubId === SHOPPING_HUB_ID || hub.label.toLowerCase().includes("shopping")) {
    result = buildShoppingHubScan({ ...hub, status: "scanning" });
  } else if (TRAVEL_PARTNER_HUBS.some((h) => h.hubId === hub.hubId)) {
    result = scanTravelHub(hub);
  } else if (hub.baseUrl.includes("demo.rimvio.app") || hub.trustLevel === "sandbox") {
    result = {
      ...buildShoppingHubScan(hub),
      capabilities: SHOPPING_CAPABILITIES.map((c) => ({ ...c, hubId: hub.hubId, hubLabel: hub.label })),
    };
  } else {
    result = {
      hub: { ...hub, status: "error", detailKo: "원격 Hub manifest를 가져올 수 없습니다" },
      platforms: [],
      capabilities: [],
      workflows: [],
      schemas: [],
      permissions: [],
      versions: [],
      healthSummary: { overall: "unknown", healthyCount: 0, degradedCount: 0, offlineCount: 0, capabilityHealth: {} },
      scannedAtIso: new Date().toISOString(),
    };
  }

  scanCache.set(hub.hubId, result);
  upsertConnectedHub({
    ...result.hub,
    status: result.healthSummary.overall === "healthy" ? "healthy" : result.healthSummary.overall === "degraded" ? "degraded" : "connected",
    lastScanAtIso: result.scannedAtIso,
    detailKo: `${result.capabilities.length} capabilities · ${result.platforms.length} platforms`,
  });

  return result;
}

export function readCachedHubScan(hubId: string): RemoteHubScanResult | null {
  return scanCache.get(hubId) ?? null;
}

export function listAllFederatedCapabilities(): readonly import("@/lib/hub/federation/types").FederatedCapabilityRef[] {
  const all: import("@/lib/hub/federation/types").FederatedCapabilityRef[] = [];
  for (const scan of scanCache.values()) {
    all.push(...scan.capabilities);
  }
  return all;
}

export function clearHubScanCacheForTests(): void {
  scanCache.clear();
}
