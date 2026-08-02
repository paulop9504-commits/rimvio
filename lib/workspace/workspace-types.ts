/**
 * Rimvio Workspace State Model
 *
 * Reality Object  = 원본 (immutable from this layer)
 * Workspace Object = Reality Object의 작업용 Instance
 *
 * NL commands mutate Workspace only — never Reality source.
 */

export type WorkspaceObjectKind =
  | "hotel"
  | "restaurant"
  | "place"
  | "event"
  | "product"
  | "other";

/**
 * Working reference bound to a Reality Entity id.
 * Entity payload SSOT lives in Reality Graph — do not fork copies as source of truth.
 * Local fields (selected/visible/attrs) are Workspace-only Draft state.
 */
export type WorkspaceObject = {
  readonly id: string;
  /** Reality Graph Entity reference (canonical) — no Entity payload copy */
  readonly entityId: string;
  /**
   * @deprecated prefer entityId — kept for Reality Object engine bridge
   */
  readonly realityObjectId: string;
  readonly kind: WorkspaceObjectKind;
  /**
   * Display cache only — resolve via getRealityEntity(entityId) for SSOT.
   * Must not diverge as a second Reality write target.
   */
  readonly title: string;
  readonly selected: boolean;
  readonly bookmarked: boolean;
  readonly visible: boolean;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly priceLabelKo: string | null;
  readonly rating: number | null;
  readonly tags: readonly string[];
  /** Instance-local attrs (draft edits) — not Reality Entity properties */
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly updatedAtIso: string;
};

export type WorkspaceConstraint = {
  readonly id: string;
  readonly key: string;
  readonly labelKo: string;
  readonly value: unknown;
  readonly source: "user" | "system" | "nl";
};

export type WorkspaceFilter = {
  readonly id: string;
  readonly key: string;
  readonly labelKo: string;
  readonly value: unknown;
  readonly active: boolean;
};

export type WorkspaceDraft = {
  readonly id: string;
  readonly kind: "reservation" | "itinerary" | "prepare" | "other";
  readonly objectId: string | null;
  readonly labelKo: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: "draft";
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type WorkspaceSimulation = {
  readonly id: string;
  readonly objectId: string | null;
  readonly scenarioKo: string;
  readonly result: Readonly<Record<string, unknown>>;
  readonly createdAtIso: string;
};

export type Workspace = {
  readonly id: string;
  readonly contextId: string;
  readonly objects: readonly WorkspaceObject[];
  readonly constraints: readonly WorkspaceConstraint[];
  readonly filters: readonly WorkspaceFilter[];
  readonly drafts: readonly WorkspaceDraft[];
  readonly simulationResults: readonly WorkspaceSimulation[];
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly revision: number;
};

/** Serializable snapshot for history Before / After */
export type WorkspaceSnapshot = {
  readonly objects: readonly WorkspaceObject[];
  readonly constraints: readonly WorkspaceConstraint[];
  readonly filters: readonly WorkspaceFilter[];
  readonly drafts: readonly WorkspaceDraft[];
  readonly simulationResults: readonly WorkspaceSimulation[];
  readonly revision: number;
  readonly updatedAtIso: string;
};

export type WorkspaceStateMutationType =
  | "patch_object"
  | "add_object"
  | "remove_object"
  | "add_constraint"
  | "remove_constraint"
  | "set_filter"
  | "clear_filter"
  | "filter_object"
  | "add_draft"
  | "add_simulation"
  | "replace_snapshot"
  | "nl_batch"
  | "engine";

export type WorkspaceStateMutation = {
  readonly id: string;
  readonly workspaceId: string;
  readonly mutationType: WorkspaceStateMutationType;
  readonly targetObjectId?: string;
  readonly changes: Readonly<Record<string, unknown>>;
  readonly labelKo: string;
  readonly atIso: string;
};

export type WorkspaceHistoryEntry = {
  readonly id: string;
  readonly workspaceId: string;
  readonly before: WorkspaceSnapshot;
  readonly mutation: WorkspaceStateMutation;
  readonly after: WorkspaceSnapshot;
  readonly atIso: string;
};

/** Seed — upserts RealityEntity then Workspace references entityId (no fork SSOT) */
export type RealityObjectSeed = {
  readonly realityObjectId: string;
  /** When set, used as RealityEntity id; else realityObjectId */
  readonly entityId?: string;
  readonly kind?: WorkspaceObjectKind;
  readonly title: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly priceLabelKo?: string | null;
  readonly rating?: number | null;
  readonly tags?: readonly string[];
  readonly attrs?: Readonly<Record<string, unknown>>;
};
