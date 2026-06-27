import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryPayloadFromResource } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { filterEateryRankedResources } from "@/lib/globe/resource/rank-context-resources";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { shouldRenderLodgingGlobeMarkers } from "@/lib/globe/context-hub/project-lodging-globe-markers";

export function shouldRenderEateryGlobeMarkers(detailLevel: GlobeDetailLevel): boolean {
  return shouldRenderLodgingGlobeMarkers(detailLevel);
}

/** Ranked eatery inventory → globe View markers (no fetch). */
export function projectEateryGlobeMarkers(input: {
  ranked: readonly RankedContextResource[];
  activeResourceId?: string | null;
  visibleResourceIds?: ReadonlySet<string> | null;
  popInDelays?: ReadonlyMap<string, number> | null;
}): GlobeEateryMapMarker[] {
  const eateries = filterEateryRankedResources(input.ranked);
  if (eateries.length === 0) {
    return [];
  }

  const activeId = input.activeResourceId?.trim() || eateries[0]?.resource.resourceId;
  const filterIds = input.visibleResourceIds;

  return eateries
    .map((entry) => {
      if (filterIds && filterIds.size > 0 && !filterIds.has(entry.resource.resourceId)) {
        return null;
      }
      const carouselIndex = input.ranked.findIndex(
        (row) => row.resource.resourceId === entry.resource.resourceId,
      );
      const lat = entry.resource.spacetime.lat;
      const lng = entry.resource.spacetime.lng;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const payload = readEateryPayloadFromResource(entry.resource);
      const isMain = entry.resource.resourceId === activeId;
      const popInDelayMs = input.popInDelays?.get(entry.resource.resourceId);

      return {
        markerKind: "eatery" as const,
        id: `eatery:${entry.resource.resourceId}`,
        resourceId: entry.resource.resourceId,
        label: entry.resource.label,
        lat,
        lng,
        carouselIndex: carouselIndex >= 0 ? carouselIndex : 0,
        isMain,
        thumbnailUrl: payload?.images[0] ?? null,
        ...(popInDelayMs != null ? { popInDelayMs } : {}),
      };
    })
    .filter((row): row is GlobeEateryMapMarker => row != null);
}
