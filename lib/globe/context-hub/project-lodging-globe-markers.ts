import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import { formatLodgingStayBadgeLabel } from "@/lib/globe/context-hub/lodging-stay-window";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { filterLodgingRankedResources } from "@/lib/globe/resource/rank-context-resources";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { GhostProjectionNode, SituationProjectionManifest } from "@/lib/situation-projection/types";

const LODGING_MARKER_ZOOM_LEVELS = new Set<GlobeDetailLevel>([
  "city",
  "neighborhood",
  "street",
  "pin",
]);

export function shouldRenderLodgingGlobeMarkers(
  detailLevel: GlobeDetailLevel,
): boolean {
  return LODGING_MARKER_ZOOM_LEVELS.has(detailLevel);
}

function isGhostLodgingNode(
  node: unknown,
): node is GhostProjectionNode & { axisId: "lodging" } {
  return (
    !!node &&
    typeof node === "object" &&
    (node as GhostProjectionNode).kind === "ghost" &&
    (node as GhostProjectionNode).axisId === "lodging"
  );
}

function extractShortLabel(label: string): string {
  const first = label.trim().split(/\s+/u)[0]?.trim();
  return first && first.length <= 8 ? first : label.trim().slice(0, 6);
}

/** Ranked lodging inventory → globe View markers (no fetch). */
export function projectLodgingGlobeMarkers(input: {
  event?: EventCandidate | null;
  ranked: readonly RankedContextResource[];
  activeResourceId?: string | null;
  visibleResourceIds?: ReadonlySet<string> | null;
  popInDelays?: ReadonlyMap<string, number> | null;
  manifest?: SituationProjectionManifest | null;
}): GlobeLodgingMapMarker[] {
  const lodging = filterLodgingRankedResources(input.ranked);
  if (lodging.length === 0) {
    return [];
  }

  const activeId = input.activeResourceId?.trim() || lodging[0]?.resource.resourceId;
  const filterIds = input.visibleResourceIds;
  const anchorNode =
    input.manifest?.nodes.find(
      (node) => node.kind === "solid" && node.eventId === input.manifest?.anchorEventId,
    ) ?? null;
  const anchorLabel = anchorNode?.label?.trim() || "주맥락";
  const ghostByPlaceId = new Map(
    (input.manifest?.nodes ?? [])
      .filter(isGhostLodgingNode)
      .map((node) => [node.placeId?.trim() ?? "", node] as const)
      .filter(([placeId]) => Boolean(placeId)),
  );

  const markers: GlobeLodgingMapMarker[] = [];
  for (const entry of lodging) {
    if (filterIds && filterIds.size > 0 && !filterIds.has(entry.resource.resourceId)) {
      continue;
    }
    const carouselIndex = input.ranked.findIndex(
      (row) => row.resource.resourceId === entry.resource.resourceId,
    );
    const lat = entry.resource.spacetime.lat;
    const lng = entry.resource.spacetime.lng;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const payload = readLodgingPayloadFromResource(entry.resource);
    const isMain = entry.resource.resourceId === activeId;
    const ghost = payload?.placeId ? ghostByPlaceId.get(payload.placeId.trim()) ?? null : null;
    const presentation = ghost ? resolveProjectionNodePresentation(ghost) : null;
    const stayBadgeLabel = formatLodgingStayBadgeLabel(
      payload?.stayWindow ?? ghost?.stayWindow ?? null,
    );
    const supportDetail = payload?.partnerLabel?.trim() || entry.resource.shortLabel?.trim() || null;
    const supportLabel = [stayBadgeLabel, supportDetail].filter(Boolean).join(" · ") || null;
    const explanation =
      ghost && input.manifest && input.event
        ? buildProjectionNodeExplanation({
            node: ghost,
            manifest: input.manifest,
            event: input.event,
            supportLabel,
          })
        : null;

    const popInDelayMs = input.popInDelays?.get(entry.resource.resourceId);
    markers.push({
      markerKind: "lodging",
      id: `lodging:${entry.resource.resourceId}`,
      resourceId: entry.resource.resourceId,
      label: entry.resource.label,
      lat,
      lng,
      carouselIndex: carouselIndex >= 0 ? carouselIndex : 0,
      isMain,
      thumbnailUrl: payload ? selectPreferredLodgingImage(payload) : null,
      discoveryShortLabel: extractShortLabel(entry.resource.label),
      discoveryPriceLabel: supportDetail,
      stayBadgeLabel,
      discoveryAccent: presentation?.discoveryAccent ?? "blue",
      virtualCandidate: ghost?.virtual === true || undefined,
      ontologyBadgeLabel: presentation?.markerBadgeLabelKo ?? null,
      anchorLabel,
      relationMemoKo: explanation?.memoKo ?? null,
      ...(popInDelayMs != null ? { popInDelayMs } : {}),
    });
  }
  return markers;
}
