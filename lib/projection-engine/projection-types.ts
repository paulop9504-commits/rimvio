/**
 * Reality Projection Engine — Workspace Draft → UI Projection.
 *
 * Layers: Reality (RO) → Context → Workspace → Projection (UI)
 * Globe reads Projection only — never writes Reality Objects.
 */

export const PROJECTION_EVENT_TYPES = [
  "OBJECT_VISIBLE_CHANGED",
  "OBJECT_STATE_CHANGED",
  "OBJECT_ADDED",
  "OBJECT_REMOVED",
  "RELATION_UPDATED",
  "SIMULATION_CREATED",
] as const;

export type ProjectionEventType = (typeof PROJECTION_EVENT_TYPES)[number];

export type ProjectionEvent = {
  readonly id: string;
  readonly type: ProjectionEventType;
  readonly workspaceId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly atIso: string;
  /** Always true — Projection never commits Reality */
  readonly draftOnly: true;
};

export type ProjectionSnapshot = {
  readonly workspaceId: string;
  readonly visibleObjectIds: readonly string[];
  readonly hiddenObjectIds: readonly string[];
  readonly hotelType: string | null;
  readonly revision: number;
  readonly updatedAtIso: string;
};

export type ProjectionBuildInput = {
  readonly workspaceId: string;
  readonly beforeVisibleIds: readonly string[];
  readonly afterVisibleIds: readonly string[];
  readonly addedObjectIds?: readonly string[];
  readonly removedObjectIds?: readonly string[];
  readonly stateChanges?: readonly {
    readonly objectId: string;
    readonly before: Readonly<Record<string, unknown>>;
    readonly after: Readonly<Record<string, unknown>>;
  }[];
  readonly relationUpdated?: boolean;
  readonly simulationCreated?: {
    readonly simulationId: string;
    readonly scenarioKo: string;
  } | null;
  readonly hotelType?: string | null;
  readonly summaryKo?: string;
};
