/**
 * Reality Surface — Globe UX projection scope (v2).
 * Read-only composition of visible state — never Blueprint/Operator/Commit internals.
 * @see docs/RIMVIO_REALITY_SURFACE.md
 */

/** Semantic bands included on the globe Reality Surface. */
export const REALITY_SURFACE_INCLUDED_LAYERS = [
  "capture",
  "context",
  "bridge",
  "runtime_state",
  "flow_projection",
] as const;

export type RealitySurfaceIncludedLayer =
  (typeof REALITY_SURFACE_INCLUDED_LAYERS)[number];

/** OS/backend layers that must NOT render as first-class globe UX. */
export const REALITY_SURFACE_EXCLUDED_LAYERS = [
  "blueprint",
  "operator_internals",
  "commit_logic",
  "storage_schema",
] as const;

export type RealitySurfaceExcludedLayer =
  (typeof REALITY_SURFACE_EXCLUDED_LAYERS)[number];

/**
 * One-line scope — current-state projection on the globe.
 * Capture + Context + Bridge + Runtime state + Flow visualization only.
 */
export type RealitySurfaceScope = {
  readonly surfaceKind: "reality_surface";
  readonly included: readonly RealitySurfaceIncludedLayer[];
  readonly excluded: readonly RealitySurfaceExcludedLayer[];
};

export const REALITY_SURFACE_SCOPE: RealitySurfaceScope = {
  surfaceKind: "reality_surface",
  included: [...REALITY_SURFACE_INCLUDED_LAYERS],
  excluded: [...REALITY_SURFACE_EXCLUDED_LAYERS],
};

/** Runtime phase hint allowed on surface — projection only, not Blueprint wire. */
export type RealitySurfaceRuntimeProjection = {
  readonly runtimeId: string | null;
  readonly activePhaseLabel: string | null;
  readonly activeFlowNodeId: string | null;
  readonly progressHintKo: string | null;
};

/** Flow path hint on globe — dashed/solid lines; not the Flow SSOT store. */
export type RealitySurfaceFlowProjection = {
  readonly flowNodeIds: readonly string[];
  readonly nextStepHintKo: string | null;
  readonly strokeStyle: "solid" | "dashed";
};

/** Context node visible on globe — pin / goal only, not Blueprint wire. */
export type RealitySurfaceContextProjection = {
  readonly contextId: string;
  readonly goalKo: string;
};

/** Bridge path visible on globe — leg labels only, not bridgeId hero. */
export type RealitySurfaceBridgeProjection = {
  readonly pathLabels: readonly string[];
  readonly activeLegIndex: number;
};

export type RealitySurfaceProjectionBundle = {
  readonly scope: RealitySurfaceScope;
  readonly context: RealitySurfaceContextProjection | null;
  readonly bridge: RealitySurfaceBridgeProjection | null;
  readonly runtime: RealitySurfaceRuntimeProjection | null;
  readonly flow: RealitySurfaceFlowProjection | null;
};

export function composeRealitySurfaceProjectionBundle(input: {
  context?: RealitySurfaceContextProjection | null;
  bridge?: RealitySurfaceBridgeProjection | null;
  runtime?: RealitySurfaceRuntimeProjection | null;
  flow?: RealitySurfaceFlowProjection | null;
}): RealitySurfaceProjectionBundle {
  return {
    scope: REALITY_SURFACE_SCOPE,
    context: input.context ?? null,
    bridge: input.bridge ?? null,
    runtime: input.runtime ?? null,
    flow: input.flow ?? null,
  };
}

export function assertNotRealitySurfaceViolation(
  layer: RealitySurfaceExcludedLayer,
  action: string,
): void {
  throw new Error(
    `[RealitySurface] forbidden on globe UX: ${layer} — ${action}`,
  );
}
