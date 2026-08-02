/**
 * Workspace Store — editing surface keyed by workspace id.
 *
 * Mutates Workspace Objects only. Never writes Reality Object store.
 */

import { getRealityObject } from "@/lib/reality-object/reality-object-store";
import {
  workspaceKindToEntityType,
} from "@/lib/reality-graph/entity-types";
import {
  getRealityEntity,
  upsertRealityEntity,
} from "@/lib/reality-graph/graph-store";
import {
  applySnapshotToWorkspace,
  clearWorkspaceHistory,
  recordWorkspaceHistory,
  redoWorkspaceHistory,
  rollbackWorkspaceHistory,
  snapshotWorkspace,
} from "@/lib/workspace/workspace-history";
import type {
  RealityObjectSeed,
  Workspace,
  WorkspaceConstraint,
  WorkspaceDraft,
  WorkspaceFilter,
  WorkspaceObject,
  WorkspaceObjectKind,
  WorkspaceSimulation,
  WorkspaceStateMutation,
  WorkspaceStateMutationType,
} from "@/lib/workspace/workspace-types";

const workspaces = new Map<string, Workspace>();

export const WORKSPACE_STATE_UPDATED = "rimvio:workspace-state-updated" as const;

function emitUpdated(workspaceId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_STATE_UPDATED, {
      detail: { workspaceId, draftOnly: true as const },
    }),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Hard guard — Workspace layer must never call Reality Object writers.
 * Detects forbidden ops by name when NL / callers attempt source rewrite.
 */
export function assertDoesNotMutateRealityObject(op: string): void {
  const forbidden = [
    "mutate_reality",
    "write_reality",
    "reality_object_patch",
    "transition_reality",
    "commit_reality",
    "global_object",
  ];
  if (forbidden.includes(op)) {
    throw new Error(
      "Workspace State Model: Reality Object mutation forbidden — edit Workspace Instance only",
    );
  }
}

/** Verify Reality Object still equals the seed snapshot after Workspace edits. */
export function assertRealityObjectUnchanged(input: {
  readonly realityObjectId: string;
  readonly expectedUpdatedAt?: string | null;
}): void {
  const reality = getRealityObject(input.realityObjectId);
  if (!reality) return;
  if (
    input.expectedUpdatedAt != null &&
    reality.updatedAt !== input.expectedUpdatedAt
  ) {
    throw new Error(
      "Workspace State Model: Reality Object was mutated — rollback required",
    );
  }
}

/**
 * Bind Workspace Object to an existing Reality Entity by reference only.
 * Forbidden: inventing a second Entity payload copy as SSOT.
 */
export function createWorkspaceObjectRef(input: {
  readonly entityId: string;
  readonly kind?: WorkspaceObjectKind;
}): WorkspaceObject {
  const entity = getRealityEntity(input.entityId);
  if (!entity) {
    throw new Error(
      "Workspace Object requires Reality Entity reference — create Entity first",
    );
  }
  const now = new Date().toISOString();
  const kind =
    input.kind ??
    (entity.type === "Hotel"
      ? "hotel"
      : entity.type === "Restaurant"
        ? "restaurant"
        : entity.type === "Event"
          ? "event"
          : "place");
  return {
    id: newId("wobj"),
    entityId: entity.id,
    realityObjectId: entity.id,
    kind,
    title: String(entity.properties.name ?? entity.properties.title ?? entity.id),
    selected: false,
    bookmarked: false,
    visible: true,
    lat:
      typeof entity.properties.lat === "number" ? entity.properties.lat : null,
    lng:
      typeof entity.properties.lng === "number" ? entity.properties.lng : null,
    priceLabelKo:
      typeof entity.properties.priceLabelKo === "string"
        ? entity.properties.priceLabelKo
        : null,
    rating:
      typeof entity.properties.rating === "number"
        ? entity.properties.rating
        : null,
    tags: Array.isArray(entity.properties.tags)
      ? [...(entity.properties.tags as string[])]
      : String(entity.properties.tags ?? "")
          .split(/[,\s]+/)
          .filter(Boolean),
    attrs: { entityRefOnly: true },
    updatedAtIso: now,
  };
}

/**
 * Register Reality Entity (SSOT) then create Workspace reference.
 * Display fields are projection cache from Entity — not a forked write target.
 */
export function createWorkspaceObjectFromReality(
  seed: RealityObjectSeed,
): WorkspaceObject {
  const entityId = seed.entityId?.trim() || seed.realityObjectId;
  const kind = seed.kind ?? "other";
  upsertRealityEntity({
    id: entityId,
    type: workspaceKindToEntityType(kind),
    properties: {
      name: seed.title,
      title: seed.title,
      ...(seed.lat != null ? { lat: seed.lat } : {}),
      ...(seed.lng != null ? { lng: seed.lng } : {}),
      ...(seed.priceLabelKo != null
        ? { priceLabelKo: seed.priceLabelKo }
        : {}),
      // Do not clobber Entity SSOT with null when seed omits rating
      ...(seed.rating != null ? { rating: seed.rating } : {}),
      ...(seed.tags != null ? { tags: seed.tags } : {}),
      ...(seed.attrs ?? {}),
    },
    state: { lifecycle: "candidate", active: true },
  });
  const now = new Date().toISOString();
  return {
    id: newId("wobj"),
    entityId,
    realityObjectId: seed.realityObjectId,
    kind,
    title: seed.title,
    selected: false,
    bookmarked: false,
    visible: true,
    lat: seed.lat ?? null,
    lng: seed.lng ?? null,
    priceLabelKo: seed.priceLabelKo ?? null,
    rating: seed.rating ?? null,
    tags: [...(seed.tags ?? [])],
    attrs: { ...(seed.attrs ?? {}), entityRefOnly: true },
    updatedAtIso: now,
  };
}

/** Resolve Entity SSOT for a Workspace Object reference */
export function resolveWorkspaceEntity(object: WorkspaceObject) {
  return getRealityEntity(object.entityId || object.realityObjectId);
}

export function createWorkspace(input: {
  readonly contextId: string;
  readonly id?: string;
  readonly seeds?: readonly RealityObjectSeed[];
}): Workspace {
  const now = new Date().toISOString();
  const id = input.id?.trim() || newId("ws");
  const ws: Workspace = {
    id,
    contextId: input.contextId.trim(),
    objects: (input.seeds ?? []).map(createWorkspaceObjectFromReality),
    constraints: [],
    filters: [],
    drafts: [],
    simulationResults: [],
    createdAtIso: now,
    updatedAtIso: now,
    revision: 0,
  };
  workspaces.set(id, ws);
  clearWorkspaceHistory(id);
  emitUpdated(id);
  return ws;
}

export function readWorkspace(workspaceId: string): Workspace | null {
  return workspaces.get(workspaceId.trim()) ?? null;
}

export function readWorkspaceByContext(contextId: string): Workspace | null {
  const ctx = contextId.trim();
  for (const ws of workspaces.values()) {
    if (ws.contextId === ctx) return ws;
  }
  return null;
}

export function listWorkspaces(): readonly Workspace[] {
  return [...workspaces.values()];
}

export function clearWorkspace(workspaceId: string): void {
  const id = workspaceId.trim();
  workspaces.delete(id);
  clearWorkspaceHistory(id);
  emitUpdated(id);
}

export function clearAllWorkspacesForTests(): void {
  workspaces.clear();
}

function commitMutation(input: {
  readonly workspaceId: string;
  readonly before: Workspace;
  readonly next: Omit<Workspace, "revision" | "updatedAtIso"> &
    Partial<Pick<Workspace, "revision" | "updatedAtIso">>;
  readonly mutationType: WorkspaceStateMutationType;
  readonly targetObjectId?: string;
  readonly changes: Readonly<Record<string, unknown>>;
  readonly labelKo: string;
}): Workspace {
  assertDoesNotMutateRealityObject(input.mutationType);
  const atIso = new Date().toISOString();
  const afterWs: Workspace = {
    ...input.before,
    ...input.next,
    id: input.before.id,
    contextId: input.before.contextId,
    createdAtIso: input.before.createdAtIso,
    revision: input.before.revision + 1,
    updatedAtIso: atIso,
  };

  const mutation: WorkspaceStateMutation = {
    id: newId("wmut"),
    workspaceId: input.workspaceId,
    mutationType: input.mutationType,
    targetObjectId: input.targetObjectId,
    changes: input.changes,
    labelKo: input.labelKo,
    atIso,
  };

  recordWorkspaceHistory({
    workspaceId: input.workspaceId,
    before: snapshotWorkspace(input.before),
    mutation,
    after: snapshotWorkspace(afterWs),
  });

  workspaces.set(input.workspaceId, afterWs);
  emitUpdated(input.workspaceId);
  return afterWs;
}

/**
 * Mutation Engine commit — Workspace State only.
 * Snapshots Reality Object updatedAt before write; asserts unchanged after.
 */
export function commitWorkspaceEngineChange(input: {
  readonly workspaceId: string;
  readonly objects?: readonly WorkspaceObject[];
  readonly constraints?: readonly WorkspaceConstraint[];
  readonly filters?: readonly WorkspaceFilter[];
  readonly drafts?: readonly WorkspaceDraft[];
  readonly simulationResults?: readonly WorkspaceSimulation[];
  readonly mutationType?: WorkspaceStateMutationType;
  readonly targetObjectId?: string;
  readonly changes: Readonly<Record<string, unknown>>;
  readonly labelKo: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;

  const realityStamps = ws.objects.map((o) => ({
    id: o.realityObjectId,
    updatedAt: getRealityObject(o.realityObjectId)?.updatedAt ?? null,
  }));

  const next = commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: {
      ...ws,
      objects: input.objects ?? ws.objects,
      constraints: input.constraints ?? ws.constraints,
      filters: input.filters ?? ws.filters,
      drafts: input.drafts ?? ws.drafts,
      simulationResults: input.simulationResults ?? ws.simulationResults,
    },
    mutationType: input.mutationType ?? "engine",
    targetObjectId: input.targetObjectId,
    changes: input.changes,
    labelKo: input.labelKo,
  });

  for (const stamp of realityStamps) {
    assertRealityObjectUnchanged({
      realityObjectId: stamp.id,
      expectedUpdatedAt: stamp.updatedAt,
    });
  }
  return next;
}

/**
 * Patch a Workspace Object instance. Reality Object is never written.
 */
export function patchWorkspaceObject(input: {
  readonly workspaceId: string;
  readonly objectId: string;
  readonly patch: Partial<
    Pick<
      WorkspaceObject,
      | "title"
      | "selected"
      | "bookmarked"
      | "visible"
      | "priceLabelKo"
      | "rating"
      | "tags"
      | "lat"
      | "lng"
      | "kind"
    >
  > & { readonly attrs?: Readonly<Record<string, unknown>> };
  readonly labelKo?: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const idx = ws.objects.findIndex((o) => o.id === input.objectId);
  if (idx < 0) return null;

  const prev = ws.objects[idx]!;
  const realityBefore = getRealityObject(prev.realityObjectId);
  const realityUpdatedAt = realityBefore?.updatedAt ?? null;

  // Never allow callers to overwrite realityObjectId via patch
  const { attrs: patchAttrs, ...rest } = input.patch;
  const nextObj: WorkspaceObject = {
    ...prev,
    ...rest,
    id: prev.id,
    realityObjectId: prev.realityObjectId,
    attrs: patchAttrs ? { ...prev.attrs, ...patchAttrs } : prev.attrs,
    tags: rest.tags ? [...rest.tags] : prev.tags,
    updatedAtIso: new Date().toISOString(),
  };

  const objects = ws.objects.map((o, i) => (i === idx ? nextObj : o));
  const next = commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, objects },
    mutationType: "patch_object",
    targetObjectId: nextObj.id,
    changes: { ...input.patch },
    labelKo: input.labelKo ?? "Workspace Object 수정",
  });

  assertRealityObjectUnchanged({
    realityObjectId: prev.realityObjectId,
    expectedUpdatedAt: realityUpdatedAt,
  });
  return next;
}

export function addWorkspaceObject(input: {
  readonly workspaceId: string;
  readonly seed: RealityObjectSeed;
  readonly labelKo?: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const obj = createWorkspaceObjectFromReality(input.seed);
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, objects: [...ws.objects, obj] },
    mutationType: "add_object",
    targetObjectId: obj.id,
    changes: { realityObjectId: seedRealityId(input.seed) },
    labelKo: input.labelKo ?? "Object 추가",
  });
}

function seedRealityId(seed: RealityObjectSeed): string {
  return seed.realityObjectId;
}

export function removeWorkspaceObject(input: {
  readonly workspaceId: string;
  readonly objectId: string;
  readonly labelKo?: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const objects = ws.objects.filter((o) => o.id !== input.objectId);
  if (objects.length === ws.objects.length) return ws;
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, objects },
    mutationType: "remove_object",
    targetObjectId: input.objectId,
    changes: { removed: true },
    labelKo: input.labelKo ?? "Object 제거",
  });
}

export function addWorkspaceConstraint(input: {
  readonly workspaceId: string;
  readonly key: string;
  readonly labelKo: string;
  readonly value: unknown;
  readonly source?: WorkspaceConstraint["source"];
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const constraint: WorkspaceConstraint = {
    id: newId("wc"),
    key: input.key,
    labelKo: input.labelKo,
    value: input.value,
    source: input.source ?? "nl",
  };
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, constraints: [...ws.constraints, constraint] },
    mutationType: "add_constraint",
    changes: { key: input.key, value: input.value },
    labelKo: `조건 · ${input.labelKo}`,
  });
}

export function removeWorkspaceConstraint(input: {
  readonly workspaceId: string;
  readonly constraintId: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: {
      ...ws,
      constraints: ws.constraints.filter((c) => c.id !== input.constraintId),
    },
    mutationType: "remove_constraint",
    changes: { constraintId: input.constraintId },
    labelKo: "조건 해제",
  });
}

export function setWorkspaceFilter(input: {
  readonly workspaceId: string;
  readonly key: string;
  readonly labelKo: string;
  readonly value: unknown;
  readonly active?: boolean;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const existing = ws.filters.filter((f) => f.key !== input.key);
  const filter: WorkspaceFilter = {
    id: newId("wf"),
    key: input.key,
    labelKo: input.labelKo,
    value: input.value,
    active: input.active ?? true,
  };
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, filters: [...existing, filter] },
    mutationType: "set_filter",
    changes: { key: input.key, value: input.value },
    labelKo: `필터 · ${input.labelKo}`,
  });
}

export function clearWorkspaceFilter(input: {
  readonly workspaceId: string;
  readonly key?: string;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const filters = input.key
    ? ws.filters.filter((f) => f.key !== input.key)
    : [];
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, filters },
    mutationType: "clear_filter",
    changes: { key: input.key ?? null },
    labelKo: "필터 해제",
  });
}

export function addWorkspaceDraft(input: {
  readonly workspaceId: string;
  readonly kind: WorkspaceDraft["kind"];
  readonly objectId?: string | null;
  readonly labelKo: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const now = new Date().toISOString();
  const draft: WorkspaceDraft = {
    id: newId("wd"),
    kind: input.kind,
    objectId: input.objectId ?? null,
    labelKo: input.labelKo,
    payload: { ...(input.payload ?? {}) },
    status: "draft",
    createdAtIso: now,
    updatedAtIso: now,
  };
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, drafts: [...ws.drafts, draft] },
    mutationType: "add_draft",
    targetObjectId: draft.objectId ?? undefined,
    changes: { draftId: draft.id, kind: draft.kind },
    labelKo: input.labelKo,
  });
}

export function addWorkspaceSimulation(input: {
  readonly workspaceId: string;
  readonly objectId?: string | null;
  readonly scenarioKo: string;
  readonly result?: Readonly<Record<string, unknown>>;
}): Workspace | null {
  const ws = readWorkspace(input.workspaceId);
  if (!ws) return null;
  const sim: WorkspaceSimulation = {
    id: newId("wsim"),
    objectId: input.objectId ?? null,
    scenarioKo: input.scenarioKo,
    result: { ...(input.result ?? {}) },
    createdAtIso: new Date().toISOString(),
  };
  return commitMutation({
    workspaceId: ws.id,
    before: ws,
    next: { ...ws, simulationResults: [...ws.simulationResults, sim] },
    mutationType: "add_simulation",
    targetObjectId: sim.objectId ?? undefined,
    changes: { simulationId: sim.id, scenarioKo: sim.scenarioKo },
    labelKo: "What-if · Draft",
  });
}

export function rollbackWorkspace(workspaceId: string): Workspace | null {
  const ws = readWorkspace(workspaceId);
  if (!ws) return null;
  const result = rollbackWorkspaceHistory(workspaceId);
  if (!result.ok) return ws;
  const restored = applySnapshotToWorkspace(ws, result.snapshot);
  workspaces.set(ws.id, restored);
  emitUpdated(ws.id);
  return restored;
}

export function redoWorkspace(workspaceId: string): Workspace | null {
  const ws = readWorkspace(workspaceId);
  if (!ws) return null;
  const result = redoWorkspaceHistory(workspaceId);
  if (!result.ok) return ws;
  const restored = applySnapshotToWorkspace(ws, result.snapshot);
  workspaces.set(ws.id, restored);
  emitUpdated(ws.id);
  return restored;
}

export function kindFromRealityKind(kind: string): WorkspaceObjectKind {
  const k = kind.toLowerCase();
  if (k.includes("hotel") || k.includes("lodging")) return "hotel";
  if (k.includes("restaurant") || k.includes("eatery")) return "restaurant";
  if (k.includes("event")) return "event";
  if (k.includes("product")) return "product";
  if (k.includes("place") || k.includes("poi")) return "place";
  return "other";
}
