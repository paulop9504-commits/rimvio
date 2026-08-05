/**
 * Object Decision Spokes — Intent facet projection → map hub-and-spoke Callouts.
 * Same facts as ObjectPlacePanel (Dual surface). Not inventory cards.
 *
 * @see docs/RIMVIO_CONTEXT_WORKSPACE.md — Callout = Object Diff Viewer
 */

import type {
  IntentDecisionFacet,
  IntentDecisionFacetProjection,
} from "@/lib/context-workspace/projection/build-intent-decision-facets";
import type { ObjectFacetId } from "@/lib/mobile-workspace/object-facets";

export type ObjectDecisionSpoke = {
  readonly id: ObjectFacetId;
  readonly labelKo: string;
  readonly titleKo: string;
  /** Evidence — max 3 lines for map chip */
  readonly linesKo: readonly string[];
  /** Polar angle from pin: 0 = east, 90 = south, 180 = west, 270 = north (CSS y-down) */
  readonly angleDeg: number;
  /** Distance from pin center in px */
  readonly radiusPx: number;
};

export type ObjectDecisionSpokeSet = {
  readonly entityId: string;
  readonly entityTitleKo: string;
  readonly intentLabelKo: string;
  readonly spokes: readonly ObjectDecisionSpoke[];
};

/** Hub layout — why top, price left, trace right, spatial bottom-left */
const SPOKE_LAYOUT: Readonly<
  Record<ObjectFacetId, { angleDeg: number; radiusPx: number }>
> = {
  why: { angleDeg: 270, radiusPx: 118 },
  price: { angleDeg: 195, radiusPx: 128 },
  review: { angleDeg: 345, radiusPx: 128 },
  nearby: { angleDeg: 120, radiusPx: 122 },
};

const SPOKE_ORDER: readonly ObjectFacetId[] = [
  "why",
  "price",
  "review",
  "nearby",
];

function facetToSpoke(facet: IntentDecisionFacet): ObjectDecisionSpoke {
  const layout = SPOKE_LAYOUT[facet.id];
  return {
    id: facet.id,
    labelKo: facet.labelKo,
    titleKo: facet.titleKo,
    linesKo: facet.linesKo.slice(0, 3),
    angleDeg: layout.angleDeg,
    radiusPx: layout.radiusPx,
  };
}

/**
 * Build map spokes from Intent Decision facet projection (one selected entity).
 */
export function buildObjectDecisionSpokes(input: {
  readonly entityId: string;
  readonly entityTitleKo: string;
  readonly projection: IntentDecisionFacetProjection;
  /** Mobile: at most 3 spokes to avoid collapse */
  readonly maxSpokes?: number;
}): ObjectDecisionSpokeSet {
  const max = Math.max(1, Math.min(4, input.maxSpokes ?? 4));
  const byId = new Map(input.projection.facets.map((f) => [f.id, f]));
  const spokes: ObjectDecisionSpoke[] = [];
  for (const id of SPOKE_ORDER) {
    const facet = byId.get(id);
    if (!facet) continue;
    spokes.push(facetToSpoke(facet));
    if (spokes.length >= max) break;
  }
  return {
    entityId: input.entityId,
    entityTitleKo: input.entityTitleKo,
    intentLabelKo: input.projection.intentLabelKo,
    spokes,
  };
}

export function spokeOffsetPx(spoke: ObjectDecisionSpoke): {
  readonly dx: number;
  readonly dy: number;
} {
  const rad = (spoke.angleDeg * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * spoke.radiusPx,
    dy: Math.sin(rad) * spoke.radiusPx,
  };
}
