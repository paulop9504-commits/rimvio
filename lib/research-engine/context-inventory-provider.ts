/**
 * Fast Scan from context lodging + eatery inventory (real place rows).
 * No network crawl — uses already-scouted SSOT on the event.
 */

import type { FastScanCandidate } from "@/engines/research/schema";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  candidatesFromInventorySnippets,
  type ResearchCandidateProvider,
} from "@/lib/research-engine/providers";
import { readLodgingRecommendReasonsForEvent } from "@/lib/globe/lodging/lodging-recommendation-reason-store";
import { readEateryRecommendReasonsForEvent } from "@/lib/globe/eatery/eatery-recommendation-reason-store";

export function createContextInventoryCandidateProvider(
  contextEventId: string,
): ResearchCandidateProvider {
  return {
    id: "context_inventory",
    listCandidates(input) {
      const event = findLifeEventCandidate(contextEventId.trim());
      if (!event) {
        return [] as FastScanCandidate[];
      }
      const lodgingReasons = readLodgingRecommendReasonsForEvent(event.id);
      const eateryReasons = readEateryRecommendReasonsForEvent(event.id);
      const lodging = readLodgingInventoryRows(event).map((row) => ({
        id: row.placeId,
        title: row.name,
        snippet:
          lodgingReasons[row.placeId]?.reasonKo?.trim() ||
          row.address?.trim() ||
          `${row.name} 숙소 후보`,
        domain: "inventory.lodging.rimvio",
        priceKrw: row.priceKrw ?? null,
        rating: row.rating ?? null,
        reviewCount: row.reviewCount ?? null,
        kind: "lodging",
        lat: row.lat,
        lng: row.lng,
      }));
      const eatery = readEateryInventoryRows(event).map((row) => ({
        id: row.placeId,
        title: row.name,
        snippet:
          eateryReasons[row.placeId]?.reasonKo?.trim() ||
          [row.cuisineHint, row.address].filter(Boolean).join(" · ") ||
          `${row.name} 맛집 후보`,
        domain: "inventory.eatery.rimvio",
        priceKrw: null,
        rating: row.rating ?? null,
        reviewCount: null,
        kind: "eatery",
        lat: row.lat,
        lng: row.lng,
      }));
      const mapped = candidatesFromInventorySnippets([...lodging, ...eatery]);
      if (mapped.length === 0) {
        return [] as FastScanCandidate[];
      }
      const q = input.queries.join(" ").toLowerCase();
      const filtered = q
        ? mapped.filter((row) =>
            `${row.title} ${row.snippet}`.toLowerCase().includes(
              q.slice(0, 16).trim(),
            ),
          )
        : mapped;
      return (filtered.length > 0 ? filtered : mapped).slice(
        0,
        input.limit ?? 24,
      );
    },
  };
}
