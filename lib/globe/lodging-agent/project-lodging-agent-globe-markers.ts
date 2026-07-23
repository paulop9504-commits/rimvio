import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { isTrustedVenueMediaUrl } from "@/lib/globe/lodging/lodging-photo-fidelity";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { GhostProjectionNode, SituationProjectionManifest } from "@/lib/situation-projection/types";

function isLodgingAgentGhost(node: unknown): node is GhostProjectionNode {
  return (
    !!node &&
    typeof node === "object" &&
    (node as GhostProjectionNode).kind === "ghost" &&
    (node as GhostProjectionNode).candidateOrigin === "lodging_agent"
  );
}

function extractShortLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 9).trimEnd()}…`;
}

/** Lodging agent Ghost Pins → globe discovery markers. */
export function projectLodgingAgentGlobeMarkers(input: {
  event: EventCandidate;
  manifest: SituationProjectionManifest | null;
  activeResourceId?: string | null;
}): GlobeEateryMapMarker[] {
  const manifest = input.manifest;
  if (!manifest || manifest.anchorEventId !== input.event.id) {
    return [];
  }

  const inventory = readEateryInventoryRows(input.event);
  const byPlaceId = new Map(inventory.map((row) => [row.placeId, row] as const));
  const activeId = input.activeResourceId?.trim() || null;
  const anchorNode =
    manifest.nodes.find(
      (node) => node.kind === "solid" && node.eventId === input.event.id,
    ) ?? null;
  const anchorLabel = anchorNode?.label?.trim() || input.event.title.trim() || "주맥락";

  return manifest.nodes
    .filter(isLodgingAgentGhost)
    .map((node, index) => {
      const placeId = node.placeId?.trim();
      const lat = typeof node.lat === "number" ? node.lat : null;
      const lng = typeof node.lng === "number" ? node.lng : null;
      if (!placeId || lat == null || lng == null) {
        return null;
      }
      const row = byPlaceId.get(placeId);
      const resourceId = `${input.event.id}:eatery:${placeId}`;
      const presentation = resolveProjectionNodePresentation(node);
      const rawThumb = row?.images[0] ?? node.previewImageUrl ?? null;
      const thumbnailUrl = isTrustedVenueMediaUrl(rawThumb)
        ? rawThumb.trim()
        : null;
      const explanation = buildProjectionNodeExplanation({
        node,
        manifest,
        event: input.event,
        supportLabel: node.cuisineHint?.trim() || null,
      });
      const marker: GlobeEateryMapMarker = {
        markerKind: "eatery" as const,
        id: `lodging-agent:${resourceId}`,
        resourceId,
        label: row?.name ?? node.label,
        lat,
        lng,
        carouselIndex: index,
        isMain: activeId ? resourceId === activeId : index === 0,
        thumbnailUrl,
        discoveryShortLabel: extractShortLabel(row?.name ?? node.label),
        discoveryPriceLabel: node.cuisineHint?.trim() || null,
        discoveryAccent: presentation.discoveryAccent,
        virtualCandidate: true,
        ontologyBadgeLabel: node.candidateBadgeKo ?? presentation.markerBadgeLabelKo,
        anchorLabel,
        relationMemoKo: explanation.memoKo,
        popInDelayMs: index * 120,
      };
      return marker;
    })
    .filter((row): row is GlobeEateryMapMarker => row != null);
}

export function mergeLodgingAgentGlobeMarkers(
  base: readonly GlobeEateryMapMarker[],
  agent: readonly GlobeEateryMapMarker[],
): GlobeEateryMapMarker[] {
  if (agent.length === 0) {
    return [...base];
  }
  const agentResourceIds = new Set(agent.map((marker) => marker.resourceId));
  const rest = base.filter((marker) => !agentResourceIds.has(marker.resourceId));
  return [...agent, ...rest];
}
