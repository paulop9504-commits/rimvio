import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import type { GhostProjectionNode, SituationProjectionManifest } from "@/lib/situation-projection/types";

function isGhostEateryNode(node: unknown): node is GhostProjectionNode {
  return (
    !!node &&
    typeof node === "object" &&
    (node as GhostProjectionNode).kind === "ghost" &&
    (node as GhostProjectionNode).axisId === "eatery"
  );
}

function extractShortLabel(label: string): string {
  const first = label.trim().split(/\s+/u)[0]?.trim();
  return first && first.length <= 8 ? first : label.trim().slice(0, 6);
}

function extractAnchorShortLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "주맥락";
  }
  return trimmed.length <= 12 ? trimmed : `${trimmed.slice(0, 10)}…`;
}

/** Projection ghost eatery nodes -> actual globe marker coordinates. */
export function projectGhostEateryGlobeMarkers(input: {
  event: EventCandidate;
  manifest: SituationProjectionManifest | null;
  activeResourceId?: string | null;
}): GlobeEateryMapMarker[] {
  const manifest = input.manifest;
  if (!manifest || manifest.anchorEventId !== input.event.id) {
    return [];
  }

  const rows = readEateryInventoryRows(input.event);
  const byPlaceId = new Map(rows.map((row) => [row.placeId, row] as const));
  const activeId = input.activeResourceId?.trim() || null;
  const anchorNode =
    manifest.nodes.find((node) => node.kind === "solid" && node.eventId === input.event.id) ?? null;
  const anchorLabel = anchorNode?.label?.trim() || input.event.title.trim() || "주맥락";
  const anchorShortLabel = extractAnchorShortLabel(anchorLabel);

  return manifest.nodes
    .filter(isGhostEateryNode)
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
      const supportDetail = row?.cuisineHint?.trim() || null;
      const explanation = buildProjectionNodeExplanation({
        node,
        manifest,
        event: input.event,
        supportLabel: supportDetail,
      });
      const marker: GlobeEateryMapMarker = {
        markerKind: "eatery" as const,
        id: `ghost-eatery:${resourceId}`,
        resourceId,
        label: row?.name ?? node.label,
        lat,
        lng,
        carouselIndex: index,
        isMain: activeId ? resourceId === activeId : index === 0,
        thumbnailUrl: row?.images[0] ?? null,
        discoveryShortLabel: extractShortLabel(row?.name ?? node.label),
        discoveryPriceLabel: supportDetail,
        discoveryAccent: presentation.discoveryAccent,
        virtualCandidate: true,
        ontologyBadgeLabel: presentation.markerBadgeLabelKo,
        anchorLabel,
        relationMemoKo: explanation.memoKo,
      };
      return marker;
    })
    .filter((row): row is GlobeEateryMapMarker => row != null);
}
