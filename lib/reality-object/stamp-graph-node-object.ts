/**
 * Stamp a Reality Object id onto a session-graph node
 * (Search Diff / NL pin / reserve path).
 * Full EventCandidate metadata attach stays on lodging/eatery pin-to-context.
 */

import { buildRealityObject } from "@/lib/reality-object/build-reality-object";
import type { RealityPinCompatKind } from "@/lib/reality-object/types";
import type { SessionGraphNode } from "@/lib/graph-command/types";

function pinKindForNode(
  kind: SessionGraphNode["kind"],
): RealityPinCompatKind | null {
  if (kind === "lodging" || kind === "eatery" || kind === "activity") {
    return kind;
  }
  if (kind === "poi") {
    return "activity";
  }
  return null;
}

export function stampRealityObjectOntoSessionNode(input: {
  readonly contextEventId: string;
  readonly node: SessionGraphNode;
}): SessionGraphNode {
  const node = input.node;
  if (
    typeof node.attrs.realityObjectId === "string" &&
    node.attrs.realityObjectId.trim()
  ) {
    return node;
  }
  const object = buildRealityObject({
    contextEventId: input.contextEventId,
    title: node.labelKo,
    placeId:
      typeof node.attrs.searchId === "string"
        ? node.attrs.searchId
        : typeof node.attrs.googlePlaceId === "string"
          ? `maps:${node.attrs.googlePlaceId}`
          : node.id,
    resourceId:
      typeof node.attrs.liteapiOfferId === "string"
        ? node.attrs.liteapiOfferId
        : null,
    pinKind: pinKindForNode(node.kind),
    lat: node.lat,
    lng: node.lng,
    rating: node.rating,
    reservationSupport: node.reservable,
    price: node.priceBand,
  });
  return {
    ...node,
    attrs: {
      ...node.attrs,
      realityObjectId: object.id,
      realityObjectType: object.objectType,
    },
  };
}
