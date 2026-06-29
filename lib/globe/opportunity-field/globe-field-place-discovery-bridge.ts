/** Field place-search results → globe staged pin reveal. */

import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import {
  placeDiscoveryGlobePinId,
  projectPlaceDiscoveryPinClusters,
} from "@/lib/globe/opportunity-field/project-place-discovery-pin-cluster";
import { runStagedPinReveal } from "@/lib/globe/opportunity-field/staged-pin-reveal";

export const FIELD_PLACE_PIN_SESSION = "rimvio:field-place-pin-session";

export type FieldPlacePinSessionDetail = {
  clusters: readonly PinCluster[];
  contextId: string | null;
};

export function dispatchFieldPlacePinSession(detail: FieldPlacePinSessionDetail): void {
  if (typeof window === "undefined" || detail.clusters.length === 0) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<FieldPlacePinSessionDetail>(FIELD_PLACE_PIN_SESSION, { detail }),
  );
}

export function subscribeFieldPlacePinSession(
  listener: (detail: FieldPlacePinSessionDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FieldPlacePinSessionDetail>).detail;
    if (!detail?.clusters?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(FIELD_PLACE_PIN_SESSION, handler);
  return () => window.removeEventListener(FIELD_PLACE_PIN_SESSION, handler);
}

export function runStagedFieldPlacePinReveal(input: {
  clusters: readonly PinCluster[];
  contextId?: string | null;
}): () => void {
  if (input.clusters.length === 0) {
    return () => {};
  }

  dispatchFieldPlacePinSession({
    clusters: input.clusters,
    contextId: input.contextId ?? null,
  });

  return runStagedPinReveal({
    items: input.clusters.map((cluster) => ({ id: cluster.pinId })),
  });
}

export { placeDiscoveryGlobePinId, projectPlaceDiscoveryPinClusters };
