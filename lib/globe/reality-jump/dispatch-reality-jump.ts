/**
 * Reality Jump (= Context Projection) — activate a Reality place from text.
 * Camera fly + ontology focus + Action Graph. Never Reality Commit.
 */

import {
  dispatchGlobePlaceOntologyFocus,
  type GlobePlaceOntologyFocusDetail,
} from "@/lib/globe/place-ontology/globe-place-ontology-focus-bridge";
import type { RealityJumpTarget } from "@/lib/globe/reality-jump/linkify-assistant-entities";

export const REALITY_JUMP_EVENT = "rimvio:reality-jump";

export type RealityJumpDetail = GlobePlaceOntologyFocusDetail & {
  readonly source: "assistant_entity" | "workspace_chat" | "itinerary";
  readonly jumpKind: "reality_jump";
};

export function dispatchRealityJump(input: {
  readonly contextEventId: string;
  readonly target: RealityJumpTarget;
  readonly source?: RealityJumpDetail["source"];
}): boolean {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return false;
  }
  const { target } = input;
  if (
    !Number.isFinite(target.lat) ||
    !Number.isFinite(target.lng) ||
    !target.placeId.trim()
  ) {
    return false;
  }
  const detail: RealityJumpDetail = {
    contextEventId,
    placeId: target.placeId,
    kind: target.kind,
    lat: target.lat,
    lng: target.lng,
    title: target.labelKo,
    surface: "detail",
    source: input.source ?? "assistant_entity",
    jumpKind: "reality_jump",
  };
  dispatchGlobePlaceOntologyFocus(detail);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<RealityJumpDetail>(REALITY_JUMP_EVENT, { detail }),
    );
  }
  return true;
}

export function subscribeRealityJump(
  listener: (detail: RealityJumpDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<RealityJumpDetail>).detail);
  };
  window.addEventListener(REALITY_JUMP_EVENT, handler);
  return () => window.removeEventListener(REALITY_JUMP_EVENT, handler);
}
