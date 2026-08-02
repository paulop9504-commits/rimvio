/**
 * Callout seed for discovered entities (Discover schema hint).
 */

import type {
  SpatialAnchorResolved,
  SpatialCalloutSeed,
  SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

export function buildSpatialCalloutSeeds(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
}): readonly SpatialCalloutSeed[] {
  return input.entities.map((e) => {
    const why: string[] = [`${input.anchor.labelKo} 근처`];
    if (e.metersFromAnchor != null) {
      why.push(`거리 ${e.metersFromAnchor}m`);
    }
    if (e.walkMinutes != null) {
      why.push(`도보 ${e.walkMinutes}분`);
    }
    if (e.contextScore != null) {
      why.push(`Context ${Math.round(e.contextScore.total * 100)}`);
    }
    return {
      entityId: e.entityId,
      mode: "Discover",
      titleKo: e.titleKo,
      whyLinesKo: why,
    };
  });
}
