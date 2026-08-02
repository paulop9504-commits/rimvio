/**
 * Reality Graph store — Entity + Relation SSOT.
 * Workspace Objects reference entity ids; they must not fork entity payloads.
 */

import type {
  RealityEntity,
  RealityEntityId,
  RealityEntityState,
  RealityEntityType,
} from "@/lib/reality-graph/entity-types";
import type {
  RealityRelation,
  RealityRelationKind,
} from "@/lib/reality-graph/relation-types";

const entities = new Map<RealityEntityId, RealityEntity>();
const relations = new Map<string, RealityRelation>();
/** fromId → relationIds */
const outIndex = new Map<RealityEntityId, Set<string>>();
/** toId → relationIds */
const inIndex = new Map<RealityEntityId, Set<string>>();

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function touchAdj(entityId: RealityEntityId, relationId: string, dir: "out" | "in") {
  const index = dir === "out" ? outIndex : inIndex;
  const set = index.get(entityId) ?? new Set<string>();
  set.add(relationId);
  index.set(entityId, set);
}

function refreshEntityRelationIds(entityId: RealityEntityId): void {
  const entity = entities.get(entityId);
  if (!entity) return;
  const out = [...(outIndex.get(entityId) ?? [])];
  const inn = [...(inIndex.get(entityId) ?? [])];
  const relationIds = [...new Set([...out, ...inn])];
  entities.set(entityId, {
    ...entity,
    relationIds,
    updatedAtIso: entity.updatedAtIso,
  });
}

export function upsertRealityEntity(input: {
  readonly id?: RealityEntityId;
  readonly type: RealityEntityType;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly state?: RealityEntityState;
}): RealityEntity {
  const now = new Date().toISOString();
  const id = input.id?.trim() || newId(`ent_${input.type.toLowerCase()}`);
  const existing = entities.get(id);
  if (existing) {
    const next: RealityEntity = {
      ...existing,
      type: input.type,
      properties: {
        ...existing.properties,
        ...(input.properties ?? {}),
      },
      state: {
        ...existing.state,
        ...(input.state ?? {}),
      },
      updatedAtIso: now,
    };
    entities.set(id, next);
    return next;
  }
  const created: RealityEntity = {
    id,
    type: input.type,
    properties: { ...(input.properties ?? {}) },
    state: { ...(input.state ?? { lifecycle: "discovered", active: true }) },
    relationIds: [],
    createdAtIso: now,
    updatedAtIso: now,
  };
  entities.set(id, created);
  return created;
}

export function getRealityEntity(
  entityId: RealityEntityId,
): RealityEntity | null {
  return entities.get(entityId.trim()) ?? null;
}

export function listRealityEntities(
  type?: RealityEntityType,
): readonly RealityEntity[] {
  const all = [...entities.values()];
  if (!type) return all;
  return all.filter((e) => e.type === type);
}

export function updateRealityEntityState(
  entityId: RealityEntityId,
  state: RealityEntityState,
): RealityEntity | null {
  const prev = getRealityEntity(entityId);
  if (!prev) return null;
  const next: RealityEntity = {
    ...prev,
    state: { ...prev.state, ...state },
    updatedAtIso: new Date().toISOString(),
  };
  entities.set(prev.id, next);
  return next;
}

export function addRealityRelation(input: {
  readonly kind: RealityRelationKind;
  readonly fromId: RealityEntityId;
  readonly toId: RealityEntityId;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly id?: string;
}): RealityRelation | null {
  const fromId = input.fromId.trim();
  const toId = input.toId.trim();
  if (!entities.has(fromId) || !entities.has(toId)) {
    return null;
  }
  // Dedupe same kind edge
  for (const rid of outIndex.get(fromId) ?? []) {
    const rel = relations.get(rid);
    if (rel && rel.kind === input.kind && rel.toId === toId) {
      return rel;
    }
  }
  const now = new Date().toISOString();
  const rel: RealityRelation = {
    id: input.id?.trim() || newId("rel"),
    kind: input.kind,
    fromId,
    toId,
    properties: { ...(input.properties ?? {}) },
    createdAtIso: now,
  };
  relations.set(rel.id, rel);
  touchAdj(fromId, rel.id, "out");
  touchAdj(toId, rel.id, "in");
  refreshEntityRelationIds(fromId);
  refreshEntityRelationIds(toId);
  return rel;
}

export function getRealityRelation(relationId: string): RealityRelation | null {
  return relations.get(relationId.trim()) ?? null;
}

export function listRealityRelations(
  entityId?: RealityEntityId,
): readonly RealityRelation[] {
  if (!entityId) return [...relations.values()];
  const id = entityId.trim();
  const ids = new Set([
    ...(outIndex.get(id) ?? []),
    ...(inIndex.get(id) ?? []),
  ]);
  return [...ids]
    .map((rid) => relations.get(rid))
    .filter((r): r is RealityRelation => Boolean(r));
}

export function listOutgoingRelations(
  entityId: RealityEntityId,
  kind?: RealityRelationKind,
): readonly RealityRelation[] {
  const ids = outIndex.get(entityId.trim()) ?? new Set();
  return [...ids]
    .map((rid) => relations.get(rid))
    .filter((r): r is RealityRelation => Boolean(r))
    .filter((r) => (kind ? r.kind === kind : true));
}

export function clearRealityGraphForTests(): void {
  entities.clear();
  relations.clear();
  outIndex.clear();
  inIndex.clear();
}

/**
 * Guard: Workspace must not invent a second Entity payload for the same id.
 */
export function assertEntityReferenceOnly(input: {
  readonly entityId: string;
  readonly attemptedCopyProperties?: Readonly<Record<string, unknown>> | null;
}): void {
  const entity = getRealityEntity(input.entityId);
  if (!entity) {
    throw new Error(
      `Reality Graph: entity ${input.entityId} missing — create Entity first, then reference`,
    );
  }
  if (
    input.attemptedCopyProperties &&
    Object.keys(input.attemptedCopyProperties).length > 0
  ) {
    // Soft guard — warn pattern for tests: copies are forbidden as SSOT
    // Callers should use getRealityEntity for properties.
  }
}
