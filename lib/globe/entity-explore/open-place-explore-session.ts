/**
 * Open / run Place Action Graph helpers.
 */

import { buildPlaceExploreGraph } from "@/lib/globe/entity-explore/build-place-explore-graph";
import type { PlaceExploreContextBias } from "@/lib/globe/entity-explore/build-place-explore-graph";
import {
  writePlaceExploreSession,
} from "@/lib/globe/entity-explore/place-explore-session-store";
import type {
  PlaceExploreEntity,
  PlaceExploreSessionV1,
} from "@/lib/globe/entity-explore/types";
import { PLACE_EXPLORE_VERSION } from "@/lib/globe/entity-explore/types";

export function openPlaceExploreSession(input: {
  entity: PlaceExploreEntity;
  bias?: PlaceExploreContextBias;
}): PlaceExploreSessionV1 {
  const graph = buildPlaceExploreGraph({
    entity: input.entity,
    bias: input.bias,
  });
  const session: PlaceExploreSessionV1 = {
    version: PLACE_EXPLORE_VERSION,
    sessionId: `pex-session:${graph.entity.placeId}:${Date.now().toString(36)}`,
    graph,
    projectedCandidateIds: [],
    openedAtIso: new Date().toISOString(),
  };
  writePlaceExploreSession(session);
  return session;
}

export function entityFromBrainCandidate(input: {
  placeId: string;
  titleKo: string;
  lat: number;
  lng: number;
  contextEventId?: string | null;
  contextLabelKo?: string | null;
  thumbnailUrl?: string | null;
  providerTags?: readonly string[];
  evidenceLineKo?: string | null;
}): PlaceExploreEntity {
  return {
    placeId: input.placeId.trim() || "place",
    titleKo: input.titleKo.trim() || "장소",
    lat: input.lat,
    lng: input.lng,
    providerTags: input.providerTags ?? [],
    contextEventId: input.contextEventId?.trim() || null,
    contextLabelKo: input.contextLabelKo?.trim() || null,
    thumbnailUrl: input.thumbnailUrl?.trim() || null,
    evidenceLineKo: input.evidenceLineKo?.trim() || null,
  };
}
