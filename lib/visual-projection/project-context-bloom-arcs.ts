import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import type {
  BloomRelationKind,
  ContextBloomCandidate,
  ContextBloomRelatedHit,
} from "@/lib/visual-projection/context-bloom-types";

const COLORS: Record<BloomRelationKind, string> = {
  travel: "rgba(49, 130, 246, 0.72)",
  recommend: "rgba(255, 149, 0, 0.55)",
  booking_order: "rgba(191, 90, 242, 0.65)",
  visited: "rgba(52, 199, 89, 0.7)",
};

/**
 * Brief selection-only arcs. linkStyle encodes relation shape:
 * travel = solid · recommend = dashed signal · booking_order = dashed · visited = solid muted.
 */
export function projectContextBloomArcs(input: {
  selected: ContextBloomCandidate;
  related: readonly ContextBloomRelatedHit[];
}): GlobeTripArc[] {
  return input.related.map((hit) => ({
    id: `bloom:${input.selected.id}:${hit.id}`,
    tripRef: `bloom:${input.selected.resourceId}`,
    startLat: input.selected.lat,
    startLng: input.selected.lng,
    endLat: hit.lat,
    endLng: hit.lng,
    color: COLORS[hit.relationKind],
    emphasis: "focused" as const,
    linkStyle:
      hit.relationKind === "recommend" || hit.relationKind === "booking_order"
        ? ("signal" as const)
        : undefined,
  }));
}
