/**
 * Cross-Hub Capability Router — Main Agent selects best capability (P0/P1).
 */

import type {
  CrossHubCompositionPlan,
  FederatedCapabilityRef,
  FederatedCapabilitySelection,
} from "@/lib/hub/federation/types";
import { listAllFederatedCapabilities } from "@/lib/hub/federation/discovery/remote-hub-scan";
import { listConnectedHubs } from "@/lib/hub/federation/hub-connection-registry";
import { pickHealthyCapability } from "@/lib/hub/federation/health/hub-health-probe";
import { filterAllowedCapabilities } from "@/lib/hub/federation/permission/delegation-policy";
import { readCachedHubScan } from "@/lib/hub/federation/discovery/remote-hub-scan";
import { searchCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import type { ScoredCapabilityHit } from "@/lib/platform-sdk/score-capability-discovery";

export type FederatedSearchHit = FederatedCapabilitySelection & {
  readonly latencyMsP50?: number;
};

function scoreFederatedCap(cap: FederatedCapabilityRef, utterance: string): number {
  const hay = `${cap.capabilityId} ${cap.platformName} ${cap.keywords.join(" ")}`.toLowerCase();
  const tokens = utterance.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 15;
  }
  if (cap.health === "healthy") score += 20;
  else if (cap.health === "degraded") score += 5;
  else if (cap.health === "offline") score -= 50;
  if (cap.latencyMsP50 != null) score += Math.max(0, 10 - cap.latencyMsP50 / 30);
  return score;
}

function localHitToSelection(hit: ScoredCapabilityHit): FederatedCapabilitySelection {
  return {
    capabilityId: hit.capabilityId,
    hubId: "hub.rimvio.local",
    hubLabel: "Rimvio Hub",
    platformId: hit.platformId,
    platformName: hit.platformName,
    score: hit.composite,
    matchReasonKo: hit.matchReason,
    health: "healthy",
    origin: "local",
  };
}

/** Search local index + all connected remote hubs. */
export function searchFederatedCapabilities(input: {
  readonly utterance: string;
  readonly limit?: number;
}): readonly FederatedSearchHit[] {
  const limit = input.limit ?? 8;
  const utterance = input.utterance.trim();
  const hits: FederatedSearchHit[] = [];

  const localHits = searchCapabilityIndex(utterance, { limit: 6, publishedOnly: true });
  for (const h of localHits) {
    hits.push({ ...localHitToSelection(h), latencyMsP50: 50 });
  }

  const remoteCaps = listAllFederatedCapabilities();
  for (const cap of remoteCaps) {
    const scan = readCachedHubScan(cap.hubId);
    const grants = scan?.permissions ?? [];
    if (grants.length && !filterAllowedCapabilities([cap.capabilityId], grants).includes(cap.capabilityId)) {
      continue;
    }
    const score = scoreFederatedCap(cap, utterance);
    if (score <= 0) continue;
    hits.push({
      capabilityId: cap.capabilityId,
      hubId: cap.hubId,
      hubLabel: cap.hubLabel,
      platformId: cap.platformId,
      platformName: cap.platformName,
      score,
      matchReasonKo: `Remote · ${cap.hubLabel}`,
      health: cap.health,
      origin: "remote",
      latencyMsP50: cap.latencyMsP50,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Pick single best capability for utterance (local + remote). */
export function selectBestFederatedCapability(utterance: string): FederatedSearchHit | null {
  const hits = searchFederatedCapabilities({ utterance, limit: 4 });
  if (hits.length === 0) return null;

  const byCap = new Map<string, FederatedSearchHit[]>();
  for (const h of hits) {
    const list = byCap.get(h.capabilityId) ?? [];
    list.push(h);
    byCap.set(h.capabilityId, list);
  }

  const topCap = hits[0]!.capabilityId;
  const candidates = remoteCapsForId(topCap);
  if (candidates.length > 1) {
    const healthy = pickHealthyCapability(candidates);
    if (healthy) {
      const match = hits.find((h) => h.hubId === healthy.hubId && h.capabilityId === healthy.capabilityId);
      if (match) return match;
    }
  }

  return hits[0]!;
}

function remoteCapsForId(capabilityId: string): FederatedCapabilityRef[] {
  return listAllFederatedCapabilities().filter((c) => c.capabilityId === capabilityId);
}

const TRAVEL_COMPOSITION: ReadonlyArray<{ readonly pattern: RegExp; readonly capabilityId: string }> = [
  { pattern: /호텔|hotel|숙소/i, capabilityId: "hotel.search" },
  { pattern: /맛집|restaurant|식당/i, capabilityId: "restaurant.search" },
  { pattern: /기차|train|교통|transport/i, capabilityId: "train.route" },
  { pattern: /예약|booking/i, capabilityId: "booking.prepare" },
  { pattern: /결제|payment/i, capabilityId: "payment.prepare" },
];

/** Cross-hub composition — e.g. Osaka trip across Hotel + Restaurant + Transport hubs. */
export function planCrossHubComposition(utterance: string): CrossHubCompositionPlan | null {
  const steps: FederatedCapabilitySelection[] = [];
  for (const { pattern, capabilityId } of TRAVEL_COMPOSITION) {
    if (!pattern.test(utterance)) continue;
    const hit = searchFederatedCapabilities({ utterance: capabilityId, limit: 3 }).find(
      (h) => h.capabilityId === capabilityId,
    );
    if (hit) steps.push(hit);
  }
  if (steps.length === 0) return null;
  return {
    goalKo: utterance.slice(0, 80),
    steps,
    summaryKo: `${steps.length} hubs · ${steps.map((s) => `${s.capabilityId}→${s.hubLabel}`).join(" · ")}`,
  };
}

/** Dashboard summary for connected hubs UI. */
export function summarizeConnectedHubsForAgent(): readonly {
  readonly hub: import("@/lib/hub/federation/types").ConnectedHub;
  readonly capabilityCount: number;
  readonly healthKo: string;
}[] {
  return listConnectedHubs().map((hub) => {
    const scan = readCachedHubScan(hub.hubId);
    return {
      hub,
      capabilityCount: scan?.capabilities.length ?? 0,
      healthKo: scan?.healthSummary
        ? `● ${scan.healthSummary.healthyCount} · ⚠ ${scan.healthSummary.degradedCount} · ✕ ${scan.healthSummary.offlineCount}`
        : hub.detailKo,
    };
  });
}
