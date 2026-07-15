import type {
  FastScanCandidate,
} from "@/engines/research/schema";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  candidatesFromInventorySnippets,
  type ResearchCandidateProvider,
} from "@/lib/research-engine/providers";

/**
 * Fast Scan from active discovery batch — enrich with inventory price/rating when present.
 */
export function createDiscoveryBatchCandidateProvider(
  contextEventId: string,
): ResearchCandidateProvider {
  return {
    id: "discovery_batch",
    listCandidates(input) {
      const batch = readActiveDiscoveryExecution(contextEventId);
      const rows = batch?.recommendations ?? [];
      const event = findLifeEventCandidate(contextEventId.trim());
      const lodgingById = new Map(
        (event ? readLodgingInventoryRows(event) : []).map((row) => [
          row.placeId,
          row,
        ]),
      );
      const eateryById = new Map(
        (event ? readEateryInventoryRows(event) : []).map((row) => [
          row.placeId,
          row,
        ]),
      );
      const mapped = candidatesFromInventorySnippets(
        rows.map((row, index) => {
          const placeId = row.placeId?.trim() || `batch-${index}`;
          const lodging = lodgingById.get(placeId);
          const eatery = eateryById.get(placeId);
          return {
            id: placeId,
            title: row.title,
            snippet: row.reasonKo || row.title,
            domain: `discovery.${row.kind}.rimvio`,
            kind: row.kind,
            priceKrw: lodging?.priceKrw ?? null,
            rating: lodging?.rating ?? eatery?.rating ?? null,
            reviewCount: lodging?.reviewCount ?? null,
            lat: lodging?.lat ?? eatery?.lat ?? row.lat ?? null,
            lng: lodging?.lng ?? eatery?.lng ?? row.lng ?? null,
          };
        }),
      );
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
