/**
 * Federated capability discovery — merge remote scan into agent discovery path.
 */

import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import { planCapabilityDiscovery } from "@/lib/platform-sdk/discover-capabilities";
import {
  searchFederatedCapabilities,
  selectBestFederatedCapability,
  planCrossHubComposition,
} from "@/lib/hub/federation/capability-router";
import { listConnectedHubs } from "@/lib/hub/federation/hub-connection-registry";

export type FederatedDiscoveryPlan = CapabilityDiscoveryPlan & {
  readonly hubId: string;
  readonly hubLabel: string;
  readonly origin: "local" | "remote";
  readonly remoteExecution: boolean;
};

/** Main Agent entry — local first, then federated remote if better score. */
export function planFederatedCapabilityDiscovery(input: {
  readonly utterance: string;
}): FederatedDiscoveryPlan | null {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  const composition = planCrossHubComposition(utterance);
  if (composition && composition.steps.length >= 2) {
    const first = composition.steps[0]!;
    return {
      capabilityId: first.capabilityId,
      platformId: first.platformId,
      platformName: first.platformName,
      marketCountry: "GLOBAL",
      routePath: "/",
      approvalRequired: false,
      planLabelKo: composition.summaryKo,
      score: first.score,
      matchReason: composition.summaryKo,
      scores: { intentMatch: 0.9, contextMatch: 0.8, reliability: 0.85, composite: first.score / 100 },
      intentDomain: "travel",
      hubId: first.hubId,
      hubLabel: first.hubLabel,
      origin: first.origin,
      remoteExecution: first.origin === "remote",
    };
  }

  const local = planCapabilityDiscovery({ utterance });
  const remote = selectBestFederatedCapability(utterance);

  if (remote && (!local || remote.score > local.score * 100)) {
    return {
      capabilityId: remote.capabilityId,
      platformId: remote.platformId,
      platformName: remote.platformName,
      marketCountry: "GLOBAL",
      routePath: "/",
      approvalRequired: false,
      planLabelKo: `${remote.hubLabel} · ${remote.capabilityId}`,
      score: remote.score,
      matchReason: remote.matchReasonKo,
      scores: { intentMatch: 0.8, contextMatch: 0.7, reliability: remote.health === "healthy" ? 0.9 : 0.5, composite: remote.score / 100 },
      intentDomain: remote.capabilityId.split(".")[0] ?? "general",
      hubId: remote.hubId,
      hubLabel: remote.hubLabel,
      origin: remote.origin,
      remoteExecution: remote.origin === "remote",
    };
  }

  if (local) {
    return {
      ...local,
      hubId: "hub.rimvio.local",
      hubLabel: "Rimvio Hub",
      origin: "local",
      remoteExecution: false,
    };
  }

  return null;
}

export function listFederatedDiscoveryCandidates(utterance: string): readonly FederatedDiscoveryPlan[] {
  if (listConnectedHubs().length === 0) {
    const local = planCapabilityDiscovery({ utterance });
    return local
      ? [{ ...local, hubId: "hub.rimvio.local", hubLabel: "Rimvio Hub", origin: "local", remoteExecution: false }]
      : [];
  }

  return searchFederatedCapabilities({ utterance, limit: 6 }).map((h) => ({
    capabilityId: h.capabilityId,
    platformId: h.platformId,
    platformName: h.platformName,
    marketCountry: "GLOBAL",
    routePath: "/",
    approvalRequired: false,
    planLabelKo: `${h.hubLabel} · ${h.capabilityId}`,
    score: h.score,
    matchReason: h.matchReasonKo,
    scores: { intentMatch: 0.7, contextMatch: 0.7, reliability: 0.8, composite: h.score / 100 },
    intentDomain: h.capabilityId.split(".")[0] ?? "general",
    hubId: h.hubId,
    hubLabel: h.hubLabel,
    origin: h.origin,
    remoteExecution: h.origin === "remote",
  }));
}
