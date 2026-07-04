"use client";

import type { GhostAxisId } from "@/lib/situation-projection/types";

export const GLOBE_BRAIN_CONTEXT_RUN_REQUEST = "rimvio:globe-brain-context-run-request";

export type GlobeBrainContextRunRequest = {
  anchorEventId: string;
  ghostAxisId: GhostAxisId;
  searchQuery: string | null;
};

export function dispatchGlobeBrainContextRunRequest(
  detail: GlobeBrainContextRunRequest,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeBrainContextRunRequest>(GLOBE_BRAIN_CONTEXT_RUN_REQUEST, {
      detail,
    }),
  );
}

export function subscribeGlobeBrainContextRunRequest(
  listener: (detail: GlobeBrainContextRunRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeBrainContextRunRequest>).detail;
    if (!detail?.anchorEventId?.trim() || !detail.ghostAxisId) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_BRAIN_CONTEXT_RUN_REQUEST, handler);
  return () => window.removeEventListener(GLOBE_BRAIN_CONTEXT_RUN_REQUEST, handler);
}
