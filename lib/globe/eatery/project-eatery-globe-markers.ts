import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryPayloadFromResource } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { filterEateryRankedResources } from "@/lib/globe/resource/rank-context-resources";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { shouldRenderLodgingGlobeMarkers } from "@/lib/globe/context-hub/project-lodging-globe-markers";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { GhostProjectionNode, SituationProjectionManifest } from "@/lib/situation-projection/types";
import {
  sanitizeMapMarkerSupportLabel,
  sanitizeOntologyMapBadgeLabel,
} from "@/lib/globe/resolve-context-resource-map-markers";
import { hasExplicitMarkerThumbnail } from "@/lib/globe/brain-surface-marker-media";
import { resolveRealityObjectCoverForPlace } from "@/lib/reality-object";
import { resolveProjectedObjectVisual } from "@/lib/visual-projection";

function extractMapPillLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/gu, " ");
  if (trimmed.length <= 22) {
    return trimmed;
  }
  return `${trimmed.slice(0, 21).trimEnd()}…`;
}

function isGhostEateryNode(node: unknown): node is GhostProjectionNode {
  return (
    !!node &&
    typeof node === "object" &&
    (node as GhostProjectionNode).kind === "ghost" &&
    (node as GhostProjectionNode).axisId === "eatery"
  );
}

export function shouldRenderEateryGlobeMarkers(detailLevel: GlobeDetailLevel): boolean {
  return shouldRenderLodgingGlobeMarkers(detailLevel);
}

/** Ranked eatery inventory → globe View markers (no fetch). */
export function projectEateryGlobeMarkers(input: {
  event?: EventCandidate | null;
  ranked: readonly RankedContextResource[];
  activeResourceId?: string | null;
  visibleResourceIds?: ReadonlySet<string> | null;
  popInDelays?: ReadonlyMap<string, number> | null;
  manifest?: SituationProjectionManifest | null;
}): GlobeEateryMapMarker[] {
  const eateries = filterEateryRankedResources(input.ranked);
  if (eateries.length === 0) {
    return [];
  }

  const activeId = input.activeResourceId?.trim() || eateries[0]?.resource.resourceId;
  const filterIds = input.visibleResourceIds;
  const anchorNode =
    input.manifest?.nodes.find(
      (node) => node.kind === "solid" && node.eventId === input.manifest?.anchorEventId,
    ) ?? null;
  const anchorLabel = anchorNode?.label?.trim() || "주맥락";
  const ghostByPlaceId = new Map(
    (input.manifest?.nodes ?? [])
      .filter(isGhostEateryNode)
      .map((node) => [node.placeId?.trim() ?? "", node] as const)
      .filter(([placeId]) => Boolean(placeId)),
  );

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
      const inventoryImages = payload?.images ?? [];
      const preferred = resolveRealityObjectCoverForPlace({
        event: input.event,
        placeId: payload?.placeId,
        fallback: inventoryImages[0] ?? null,
      });
      const visual = resolveProjectedObjectVisual({
        event: input.event,
        placeId: payload?.placeId,
        title: entry.resource.label,
        pinKind: "eatery",
        imageUrls: inventoryImages,
        preferredUrl: preferred,
      });
      const imageUrl = visual.thumbnailUrl;
      // Glyph LOD can show without a photo; only drop empty stock placeholders when we had a URL.
      if (imageUrl && !hasExplicitMarkerThumbnail(imageUrl)) {
        return null;
      }
      if (visual.projectionTier === "hidden") {
        return null;
      }
      const isMain = entry.resource.resourceId === activeId;
      const ghost = payload?.placeId ? ghostByPlaceId.get(payload.placeId.trim()) ?? null : null;
      const presentation = ghost ? resolveProjectionNodePresentation(ghost) : null;
      const supportDetail = sanitizeMapMarkerSupportLabel(
        payload?.cuisineHint?.trim() ||
          payload?.categoryLabel?.trim() ||
          entry.resource.shortLabel?.trim() ||
          null,
      );
      const explanation =
        ghost && input.manifest && input.event
          ? buildProjectionNodeExplanation({
              node: ghost,
              manifest: input.manifest,
              event: input.event,
              supportLabel: supportDetail,
            })
          : null;
      const popInDelayMs = input.popInDelays?.get(entry.resource.resourceId);
      const marker: GlobeEateryMapMarker = {
        markerKind: "eatery" as const,
        id: `eatery:${entry.resource.resourceId}`,
        resourceId: entry.resource.resourceId,
        label: entry.resource.label,
        lat,
        lng,
        carouselIndex: carouselIndex >= 0 ? carouselIndex : 0,
        isMain,
        thumbnailUrl: imageUrl,
        discoveryShortLabel: extractMapPillLabel(entry.resource.label),
        discoveryPriceLabel: supportDetail,
        discoveryAccent:
          presentation?.discoveryAccent ?? visual.halo.discoveryAccent,
        objectGlyph: visual.halo.glyph,
        objectHaloFamily: visual.halo.family,
        projectionTier: visual.projectionTier,
        useSegmentation: visual.useSegmentation,
        cutoutMode: visual.cutoutMode,
        ...(payload?.virtualCandidate === true || ghost?.virtual === true
          ? { virtualCandidate: true }
          : {}),
        ontologyBadgeLabel: sanitizeOntologyMapBadgeLabel(
          presentation?.markerBadgeLabelKo ?? null,
        ),
        anchorLabel,
        relationMemoKo: explanation?.memoKo ?? null,
        ...(popInDelayMs != null ? { popInDelayMs } : {}),
      };
      return marker;
    })
    .filter((row): row is GlobeEateryMapMarker => row != null);
}
