/** Contextual Data Layering — only the active context projects onto Globe. */

export type GlobeProjectionLayerMode =
  | "overview"
  | "folded"
  | "focus"
  | "context_only";

export type GlobeProjectionLayerPolicy = {
  mode: GlobeProjectionLayerMode;
  activeContextEventId: string | null;
  visiblePlaceIds: readonly string[];
};

const POLICY_EVENT = "rimvio-globe-projection-layer-policy";

const DEFAULT_POLICY: GlobeProjectionLayerPolicy = {
  mode: "overview",
  activeContextEventId: null,
  visiblePlaceIds: [],
};

let policy: GlobeProjectionLayerPolicy = { ...DEFAULT_POLICY };

function emitPolicy(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(POLICY_EVENT));
}

export function readGlobeProjectionLayerPolicy(): GlobeProjectionLayerPolicy {
  return policy;
}

export function publishGlobeProjectionLayerPolicy(
  input: Partial<GlobeProjectionLayerPolicy>,
): GlobeProjectionLayerPolicy {
  policy = {
    ...policy,
    ...input,
    visiblePlaceIds:
      input.visiblePlaceIds !== undefined
        ? [...input.visiblePlaceIds]
        : policy.visiblePlaceIds,
  };
  emitPolicy();
  return policy;
}

export function resetGlobeProjectionLayerPolicy(): void {
  policy = { ...DEFAULT_POLICY };
  emitPolicy();
}

export function publishFoldedGlobeProjection(contextEventId: string): void {
  publishGlobeProjectionLayerPolicy({
    mode: "folded",
    activeContextEventId: contextEventId.trim(),
    visiblePlaceIds: [],
  });
}

export function publishContextOnlyGlobeProjection(contextEventId: string): void {
  publishGlobeProjectionLayerPolicy({
    mode: "context_only",
    activeContextEventId: contextEventId.trim(),
    visiblePlaceIds: [],
  });
}

export function publishFocusGlobeProjection(input: {
  contextEventId: string;
  visiblePlaceIds: readonly string[];
}): void {
  publishGlobeProjectionLayerPolicy({
    mode: "focus",
    activeContextEventId: input.contextEventId.trim(),
    visiblePlaceIds: input.visiblePlaceIds,
  });
}

export function subscribeGlobeProjectionLayerPolicy(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(POLICY_EVENT, listener);
  return () => window.removeEventListener(POLICY_EVENT, listener);
}
