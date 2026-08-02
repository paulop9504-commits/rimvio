/**
 * Reality Graph Entity API — Google Maps POI → Reality Object (Entity).
 *
 * Entity shape:
 *   { id, type, properties, state, relations }
 *
 * SSOT lives in graph-store; this module is the Entity-facing facade.
 * Existing entity-types / graph-store are preserved.
 */

import type {
  RealityEntity,
  RealityEntityId,
  RealityEntityState,
  RealityEntityType,
} from "@/lib/reality-graph/entity-types";
import {
  REALITY_ENTITY_TYPES,
  workspaceKindToEntityType,
} from "@/lib/reality-graph/entity-types";
import {
  getRealityEntity,
  listOutgoingRelations,
  listRealityRelations,
  updateRealityEntityState,
  upsertRealityEntity,
} from "@/lib/reality-graph/graph-store";
import type { RealityRelation } from "@/lib/reality-graph/relation-types";

export type {
  RealityEntity,
  RealityEntityId,
  RealityEntityState,
  RealityEntityType,
};

export { REALITY_ENTITY_TYPES, workspaceKindToEntityType };

/**
 * Product Entity view — includes resolved `relations` list (not only ids).
 */
export type RealityEntityView = {
  readonly id: string;
  readonly type: RealityEntityType | string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly state: RealityEntityState;
  readonly relations: readonly RealityRelation[];
};

export function toEntityView(entity: RealityEntity): RealityEntityView {
  const relations = listRealityRelations(entity.id);
  return {
    id: entity.id,
    type: entity.type,
    properties: entity.properties,
    state: entity.state,
    relations,
  };
}

export function readEntityView(
  entityId: RealityEntityId,
): RealityEntityView | null {
  const entity = getRealityEntity(entityId);
  if (!entity) return null;
  return toEntityView(entity);
}

/** Create / upsert Entity (Reality Object). */
export function createEntity(input: {
  readonly id?: string;
  readonly type: RealityEntityType;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly state?: RealityEntityState;
}): RealityEntity {
  return upsertRealityEntity(input);
}

/**
 * Google Maps POI → Reality Entity.
 * Does not stamp Globe; Workspace / Context bind via UsedIn / PartOf.
 */
export function entityFromMapsPoi(input: {
  readonly placeId: string;
  readonly name: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly types?: readonly string[];
  readonly rating?: number | null;
  readonly priceLevel?: number | null;
  readonly address?: string | null;
  readonly mapsType?: string | null;
}): RealityEntity {
  const mapsType = (input.mapsType ?? input.types?.[0] ?? "place").toLowerCase();
  let type: RealityEntityType = "Place";
  if (/lodging|hotel|capsule/i.test(mapsType) || input.types?.some((t) => /lodging|hotel/i.test(t))) {
    type = "Hotel";
  } else if (/restaurant|food|cafe|meal/i.test(mapsType) || input.types?.some((t) => /restaurant|food/i.test(t))) {
    type = "Restaurant";
  } else if (/airport|transit|train|subway|station/i.test(mapsType)) {
    type = "Place";
  } else if (/route|path/i.test(mapsType)) {
    type = "Route";
  }

  return createEntity({
    id: input.placeId.startsWith("ent_")
      ? input.placeId
      : `ent_${input.placeId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    type,
    properties: {
      name: input.name,
      title: input.name,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      rating: input.rating ?? null,
      priceBand: input.priceLevel ?? null,
      address: input.address ?? null,
      source: "google_maps_poi",
      mapsTypes: input.types ?? [],
      mapsType,
    },
    state: { lifecycle: "discovered", active: true },
  });
}

export function setEntityState(
  entityId: RealityEntityId,
  state: RealityEntityState,
): RealityEntity | null {
  return updateRealityEntityState(entityId, state);
}

export function listEntityRelationIds(
  entityId: RealityEntityId,
): readonly string[] {
  return listOutgoingRelations(entityId).map((r) => r.id);
}

export function entityDisplayName(entity: RealityEntity): string {
  return String(
    entity.properties.name ?? entity.properties.title ?? entity.id,
  );
}
