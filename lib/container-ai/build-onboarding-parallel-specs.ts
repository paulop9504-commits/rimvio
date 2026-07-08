/**
 * Map onboarding parallel node ids → LocalDiscoveryActionSpec.
 * departure has no radius scout (OD pair) — excluded from map scout specs.
 */

import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { TravelOnboardingParallelNodeId } from "@/lib/context-blueprint/node-resource-state";

function baseSpec(
  resourceTypes: LocalDiscoveryActionSpec["resourceTypes"],
  patch?: Partial<LocalDiscoveryActionSpec>,
): LocalDiscoveryActionSpec {
  return {
    version: 1,
    resourceTypes,
    transport: "transit",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 4000,
    ...patch,
  };
}

export type OnboardingParallelMapScout = {
  readonly nodeId: TravelOnboardingParallelNodeId | string;
  readonly spec: LocalDiscoveryActionSpec;
  readonly labelKo: string;
};

/** Nodes that can run on the existing map placement scout (stay + explore). */
export function buildOnboardingParallelMapScouts(input: {
  parallelNodeIds: readonly string[];
  destinationLabel: string;
}): readonly OnboardingParallelMapScout[] {
  const dest = input.destinationLabel.trim() || "여기";
  const out: OnboardingParallelMapScout[] = [];
  for (const nodeId of input.parallelNodeIds) {
    if (nodeId === "stay") {
      out.push({
        nodeId: "stay",
        labelKo: "숙소",
        spec: baseSpec(["hotel"]),
      });
      continue;
    }
    if (nodeId === "explore") {
      out.push({
        nodeId: "explore",
        labelKo: "놀거리",
        spec: baseSpec(["activity"], {
          activityFocus: `${dest} 명소`,
          activitySubtype: "general",
        }),
      });
    }
    // departure: no LocalDiscovery radius scout — handled as announce-only.
  }
  return out;
}

export function onboardingParallelIncludesDeparture(
  parallelNodeIds: readonly string[],
): boolean {
  return parallelNodeIds.includes("departure");
}
