/**
 * Inject a live Maps/LiteAPI candidate into the session graph as a place node.
 */

import type { SessionGraphNode } from "@/lib/graph-command/types";
import { stampRealityObjectOntoSessionNode } from "@/lib/reality-object/stamp-graph-node-object";

function slug(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, "-")
      .replace(/[^\w\uac00-\ud7a3-]+/gu, "")
      .slice(0, 40) || "place"
  );
}

export function makeNodeFromLiveCandidate(input: {
  readonly contextEventId: string;
  readonly kind: "lodging" | "eatery" | "poi";
  readonly candidate: {
    readonly id: string;
    readonly labelKo: string;
    readonly rating?: number | null;
    readonly walkMinutes?: number | null;
    readonly priceBand?: number | null;
    readonly reservable?: boolean | null;
    readonly localFavorite?: boolean | null;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly source?: string | null;
    readonly liteapiOfferId?: string | null;
    readonly liteapiHotelId?: string | null;
    readonly amountLabel?: string | null;
  };
}): SessionGraphNode {
  const hit = input.candidate;
  let nodeId = `gnode:${input.contextEventId}:${input.kind}:${slug(hit.labelKo)}`;
  if (hit.id.startsWith("maps:") && hit.id.length > 10) {
    nodeId = `gnode:${input.contextEventId}:${input.kind}:${hit.id.slice("maps:".length).slice(0, 24)}`;
  } else if (hit.id.startsWith("liteapi:") && hit.id.length > 10) {
    nodeId = `gnode:${input.contextEventId}:${input.kind}:${hit.id.slice("liteapi:".length).slice(0, 24)}`;
  }

  const attrs: Record<string, string | number | boolean | null> = {
    searchId: hit.id,
    source: hit.source ?? "maps",
  };
  if (hit.id.startsWith("maps:")) {
    attrs.googlePlaceId = hit.id.slice("maps:".length);
  }
  if (hit.id.startsWith("liteapi:")) {
    attrs.liteapiHotelId = hit.id.slice("liteapi:".length);
  }
  if (hit.liteapiHotelId) {
    attrs.liteapiHotelId = hit.liteapiHotelId;
  }
  if (hit.liteapiOfferId) {
    attrs.liteapiOfferId = hit.liteapiOfferId;
  }
  if (hit.amountLabel) {
    attrs.amountLabel = hit.amountLabel;
  }

  const raw: SessionGraphNode = {
    id: nodeId,
    labelKo: hit.labelKo,
    kind: input.kind,
    lat: hit.lat ?? null,
    lng: hit.lng ?? null,
    rating: hit.rating ?? null,
    walkMinutes: hit.walkMinutes ?? null,
    reservable: hit.reservable ?? false,
    localFavorite: hit.localFavorite ?? false,
    priceBand: hit.priceBand ?? null,
    pinned: false,
    visible: true,
    alwaysVisible: false,
    parentId: null,
    groupId: null,
    accent: "default",
    projectFolderKo: null,
    attrs,
  };
  return stampRealityObjectOntoSessionNode({
    contextEventId: input.contextEventId,
    node: raw,
  });
}
