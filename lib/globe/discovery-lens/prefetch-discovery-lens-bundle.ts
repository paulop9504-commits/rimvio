import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import {
  defaultMasterOrchestratorContext,
  readClientMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { verifyDiscoveryResults } from "@/lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";
import { loadPlaceInventoryRows } from "@/lib/globe/place/load-place-inventory-rows";
import { scorePlaceRecommendations } from "@/lib/globe/place/score-place-recommendations";
import type {
  DiscoveryLens,
  LensPrefetchBundle,
  LensPrefetchItem,
} from "@/lib/globe/discovery-lens/types";
import { copy } from "@/lib/copy/human-ko";

function toPrefetchItem(input: {
  kind: LensPrefetchItem["kind"];
  row: {
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    images?: readonly string[];
    priceKrw?: number | null;
    rating?: number | null;
    mapsUrl?: string | null;
    openNow?: boolean | null;
  };
  reasonKo: string;
  activitySubtype?: LensPrefetchItem["activitySubtype"];
}): LensPrefetchItem {
  return {
    kind: input.kind,
    activitySubtype: input.activitySubtype ?? null,
    placeId: input.row.placeId,
    title: input.row.name,
    reasonKo: input.reasonKo,
    lat: input.row.lat,
    lng: input.row.lng,
    thumbnailUrl: input.row.images?.[0] ?? null,
    priceKrw: input.row.priceKrw ?? null,
    rating: input.row.rating ?? null,
    mapsUrl: input.row.mapsUrl ?? null,
    openNow: input.row.openNow ?? null,
  };
}

/** Lightweight scout — lens POV only, no pin commit. */
export async function prefetchDiscoveryLensBundle(input: {
  event: EventCandidate;
  lens: DiscoveryLens;
}): Promise<LensPrefetchBundle> {
  const { lat, lng } = input.lens.center;
  const radiusM = input.lens.radiusM;
  const area = input.lens.labelKo.trim() || "근처";
  const context = buildContextInstance({
    event: input.event,
    lat,
    lng,
  });
  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();
  const unifiedContext = buildUnifiedExperienceContext({
    message: area,
    masterContext,
  });

  const [activityLoaded, eateryLoaded, lodgingLoaded] = await Promise.all([
    loadPlaceInventoryRows({
      event: input.event,
      domain: "activity",
      query: `${area} 놀거리`,
      lat,
      lng,
      maxResults: 6,
      radiusM,
    }),
    loadEateryInventoryRows({
      event: input.event,
      message: `${area} 맛집`,
      lat,
      lng,
      maxResults: 5,
      radiusM,
    }),
    loadLodgingInventoryRows({
      event: input.event,
      lat,
      lng,
      maxResults: 4,
      radiusM,
    }),
  ]);

  const activityScored = verifyDiscoveryResults({
    domain: "activity",
    items: scorePlaceRecommendations({
      domain: "activity",
      rows: activityLoaded.rows,
      lat,
      lng,
      focusMatch: area,
      activitySubtype: "general",
    }),
    focusTokens: [area],
  }).kept;

  const eateryScored = scoreEateryRecommendations({
    rows: eateryLoaded.rows,
    unifiedContext,
    lat,
    lng,
    context,
  }).slice(0, 3);

  const lodgingScored = scoreLodgingRecommendations({
    rows: lodgingLoaded.rows,
    unifiedContext,
    lat,
    lng,
    context,
  }).slice(0, 2);

  const items: LensPrefetchItem[] = [];

  for (const row of activityScored.slice(0, 3)) {
    items.push(
      toPrefetchItem({
        kind: "activity",
        row: row.row,
        reasonKo: row.reasonKo || copy.globe.eateryReasonFallback,
        activitySubtype: "general",
      }),
    );
  }
  for (const row of eateryScored) {
    items.push(
      toPrefetchItem({
        kind: "eatery",
        row: row.row,
        reasonKo: row.reasonKo || copy.globe.eateryReasonFallback,
      }),
    );
  }
  for (const row of lodgingScored) {
    items.push(
      toPrefetchItem({
        kind: "lodging",
        row: row.row,
        reasonKo: row.reasonKo || copy.globe.lodgingReasonFallback,
      }),
    );
  }

  return {
    status: items.length > 0 ? "ready" : "empty",
    updatedAtIso: new Date().toISOString(),
    items,
  };
}
