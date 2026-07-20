/**
 * Scout-turn entry — resolve entities then record hit/miss seed learning.
 * Safe to call from Globe pin-bar / NL pipeline; never mutates Reality.
 */
import { resolveEntities } from "@/lib/entity-resolver/resolve-entities";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import { syncReadyPromotesToCatalogOverlay } from "@/lib/seed-learning/apply-promote-to-overlay";
import {
  observeSeedMentions,
  seedMentionEventsFromEntities,
  seedMentionMissProbesFromUtterance,
} from "@/lib/seed-learning/observe-seed-mentions";
import type { SeedMentionEvent } from "@/lib/seed-learning/types";

export type ObserveScoutSeedLearningInput = {
  readonly message: string;
  /** When discovery origin resolved to a seeded station/landmark. */
  readonly discoveryOriginHit?: boolean | null;
  readonly discoveryRegionLabel?: string | null;
  readonly discoveryGeoId?: string | null;
};

export type ObserveScoutSeedLearningResult = {
  readonly eventCount: number;
  readonly hitCount: number;
  readonly missCount: number;
};

export function observeScoutSeedLearning(
  input: ObserveScoutSeedLearningInput,
): ObserveScoutSeedLearningResult {
  const message = input.message?.trim() ?? "";
  if (!message) {
    return { eventCount: 0, hitCount: 0, missCount: 0 };
  }

  const resolved = resolveEntities(message);
  const hits = seedMentionEventsFromEntities(resolved.entities, message);
  const misses = seedMentionMissProbesFromUtterance(message, resolved.entities);

  const extra: SeedMentionEvent[] = [];
  const region = input.discoveryRegionLabel?.trim();
  if (region && input.discoveryOriginHit) {
    const geo = resolveWorldGeoEntity(region);
    extra.push({
      sectorId: /역|station|駅/iu.test(region) ? "stations" : "world_geo",
      token: region,
      outcome: "hit",
      domain: "transit",
      geoId: input.discoveryGeoId ?? geo?.node.id ?? null,
      messageSnippet: message.slice(0, 80),
    });
  } else if (region && input.discoveryOriginHit === false) {
    // Explicit miss when caller tried to resolve origin and failed.
    extra.push({
      sectorId: /역|station|駅/iu.test(region) ? "stations" : "world_geo",
      token: region,
      outcome: "miss",
      domain: "transit",
      messageSnippet: message.slice(0, 80),
    });
  }

  const events = [...hits, ...misses, ...extra];
  observeSeedMentions(events);

  // Runtime Dictionary overlay — ready promotes become resolvable (not Reality).
  try {
    syncReadyPromotesToCatalogOverlay();
  } catch {
    /* never break scout */
  }

  // Community flush — personal → shared server aggregate (debounced).
  if (typeof window !== "undefined" && events.length > 0) {
    void import("@/lib/seed-learning/flush-seed-learning-client")
      .then((mod) => {
        mod.scheduleSeedLearningSharedFlush();
      })
      .catch(() => {
        /* never break scout */
      });
  }

  return {
    eventCount: events.length,
    hitCount: events.filter((e) => e.outcome === "hit").length,
    missCount: events.filter((e) => e.outcome === "miss").length,
  };
}
