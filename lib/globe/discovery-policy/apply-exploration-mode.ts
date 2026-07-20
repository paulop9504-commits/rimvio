/**
 * Map exploration mode → scout knobs (guard, caps, retrieval).
 * @see docs/RIMVIO_EXPLORATION_POLICY.md
 */

import type { DiscoveryGuardDomain } from "@/lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import { DISCOVERY_GUARD_THRESHOLD } from "@/lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import {
  LOCAL_DISCOVERY_FEED_INVENTORY_CAP,
  LOCAL_DISCOVERY_LODGING_SCOUT_MAX,
  LOCAL_DISCOVERY_PIN_CAP,
  LOCAL_DISCOVERY_RECOMMEND_CAP,
} from "@/lib/globe/context-condition-ai/local-discovery-limits";
import type { ExplorationMode } from "@/lib/globe/discovery-policy/exploration-mode";

export type ExplorationPolicyKnobs = {
  readonly mode: ExplorationMode;
  readonly pinCap: number;
  readonly recommendCap: number;
  readonly feedInventoryCap: number;
  readonly guardThresholdByDomain: Readonly<
    Record<DiscoveryGuardDomain, number>
  >;
  readonly eateryMaxResults: number;
  readonly eateryPresentCap: number;
  readonly activityPresentCap: number;
  readonly activityLandmarkPinCap: number;
  /** Lodging Places fetch ceiling override (diffuse / 싹 찾아). */
  readonly lodgingMaxResults: number;
  /** Extra radius meters for lodging when diffuse. */
  readonly lodgingRadiusBoostM: number;
  /** Reserved for scorer injection (Phase 2). */
  readonly ratingWeight: number;
  readonly noveltyWeight: number;
};

function guardThreshold(
  domain: DiscoveryGuardDomain,
  mode: ExplorationMode,
): number {
  const base = DISCOVERY_GUARD_THRESHOLD[domain];
  if (mode === "convergent") {
    return base;
  }
  switch (domain) {
    case "lodging":
      return base;
    case "eatery":
      return Math.max(0.35, base - 0.15);
    case "activity":
    case "amenity":
      return Math.max(0.72, base - 0.13);
    default:
      return base;
  }
}

/** Apply mode → deterministic scout knobs. */
export function applyExplorationMode(mode: ExplorationMode): ExplorationPolicyKnobs {
  const convergent = mode === "convergent";
  return {
    mode,
    pinCap: convergent ? LOCAL_DISCOVERY_PIN_CAP : 5,
    recommendCap: convergent ? LOCAL_DISCOVERY_RECOMMEND_CAP : 8,
    feedInventoryCap: convergent
      ? LOCAL_DISCOVERY_FEED_INVENTORY_CAP
      : Math.max(LOCAL_DISCOVERY_FEED_INVENTORY_CAP, 36),
    guardThresholdByDomain: {
      lodging: guardThreshold("lodging", mode),
      eatery: guardThreshold("eatery", mode),
      activity: guardThreshold("activity", mode),
      amenity: guardThreshold("amenity", mode),
    },
    eateryMaxResults: convergent ? 14 : 18,
    eateryPresentCap: convergent ? 6 : 8,
    activityPresentCap: convergent ? 4 : 6,
    activityLandmarkPinCap: convergent ? 1 : 3,
    lodgingMaxResults: convergent
      ? LOCAL_DISCOVERY_LODGING_SCOUT_MAX
      : Math.max(LOCAL_DISCOVERY_LODGING_SCOUT_MAX, 36),
    lodgingRadiusBoostM: convergent ? 0 : 2500,
    ratingWeight: convergent ? 1.05 : 0.85,
    noveltyWeight: convergent ? 1.05 : 1.35,
  };
}

export function guardThresholdForDomain(
  knobs: ExplorationPolicyKnobs,
  domain: DiscoveryGuardDomain,
): number {
  return knobs.guardThresholdByDomain[domain];
}
