/**
 * Reality Graph queries — related / path / similar / nearby.
 */

import type {
  RealityEntity,
  RealityEntityId,
  RealityEntityType,
} from "@/lib/reality-graph/entity-types";
import {
  getRealityEntity,
  listOutgoingRelations,
  listRealityEntities,
  listRealityRelations,
} from "@/lib/reality-graph/graph-store";
import type {
  RealityRelation,
  RealityRelationKind,
} from "@/lib/reality-graph/relation-types";

export type RelatedEntityHit = {
  readonly entity: RealityEntity;
  readonly relation: RealityRelation;
  readonly direction: "out" | "in";
};

export function getRelatedEntities(
  entityId: RealityEntityId,
  options?: {
    readonly kind?: RealityRelationKind;
    readonly types?: readonly RealityEntityType[];
  },
): readonly RelatedEntityHit[] {
  const id = entityId.trim();
  const rels = listRealityRelations(id).filter((r) =>
    options?.kind ? r.kind === options.kind : true,
  );
  const hits: RelatedEntityHit[] = [];
  for (const relation of rels) {
    const otherId = relation.fromId === id ? relation.toId : relation.fromId;
    const entity = getRealityEntity(otherId);
    if (!entity) continue;
    if (options?.types && !options.types.includes(entity.type)) continue;
    hits.push({
      entity,
      relation,
      direction: relation.fromId === id ? "out" : "in",
    });
  }
  return hits;
}

export type GraphPath = {
  readonly nodeIds: readonly RealityEntityId[];
  readonly relationIds: readonly string[];
};

/**
 * BFS shortest path between two entities (undirected over relation edges).
 */
export function findPath(
  fromId: RealityEntityId,
  toId: RealityEntityId,
  options?: { readonly maxDepth?: number },
): GraphPath | null {
  const start = fromId.trim();
  const goal = toId.trim();
  if (start === goal) {
    return { nodeIds: [start], relationIds: [] };
  }
  if (!getRealityEntity(start) || !getRealityEntity(goal)) return null;

  const maxDepth = options?.maxDepth ?? 8;
  const queue: { id: string; path: string[]; rels: string[] }[] = [
    { id: start, path: [start], rels: [] },
  ];
  const seen = new Set<string>([start]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path.length - 1 >= maxDepth) continue;
    for (const rel of listRealityRelations(cur.id)) {
      const nextId = rel.fromId === cur.id ? rel.toId : rel.fromId;
      if (seen.has(nextId)) continue;
      const path = [...cur.path, nextId];
      const rels = [...cur.rels, rel.id];
      if (nextId === goal) {
        return { nodeIds: path, relationIds: rels };
      }
      seen.add(nextId);
      queue.push({ id: nextId, path, rels });
    }
  }
  return null;
}

/**
 * Similar entities via SimilarTo edges, else same-type heuristic on tags/name.
 */
export function findSimilar(
  entityId: RealityEntityId,
  options?: { readonly limit?: number },
): readonly RealityEntity[] {
  const limit = options?.limit ?? 8;
  const origin = getRealityEntity(entityId);
  if (!origin) return [];

  const viaEdge = getRelatedEntities(entityId, { kind: "SimilarTo" }).map(
    (h) => h.entity,
  );
  if (viaEdge.length > 0) return viaEdge.slice(0, limit);

  const originTags = new Set(
    String(origin.properties.tags ?? "")
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase()),
  );
  const originName = String(origin.properties.name ?? origin.properties.title ?? "").toLowerCase();

  return listRealityEntities(origin.type)
    .filter((e) => e.id !== origin.id)
    .map((e) => {
      const tags = String(e.properties.tags ?? "")
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((t) => t.toLowerCase());
      let score = 0;
      for (const t of tags) if (originTags.has(t)) score += 2;
      const name = String(e.properties.name ?? e.properties.title ?? "").toLowerCase();
      if (originName && name && (name.includes(originName) || originName.includes(name))) {
        score += 1;
      }
      if (e.properties.category && e.properties.category === origin.properties.category) {
        score += 2;
      }
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type NearbyEntityHit = {
  readonly entity: RealityEntity;
  readonly meters: number;
  readonly relation: RealityRelation | null;
};

/**
 * Nearby via LocatedNear edges first; else coordinate distance on properties.lat/lng.
 */
export function findNearby(
  entityId: RealityEntityId,
  options?: {
    readonly maxMeters?: number;
    readonly limit?: number;
    readonly types?: readonly RealityEntityType[];
  },
): readonly NearbyEntityHit[] {
  const origin = getRealityEntity(entityId);
  if (!origin) return [];
  const maxMeters = options?.maxMeters ?? 1500;
  const limit = options?.limit ?? 12;

  const viaEdge = getRelatedEntities(entityId, { kind: "LocatedNear" })
    .filter((h) =>
      options?.types ? options.types.includes(h.entity.type) : true,
    )
    .map((h) => ({
      entity: h.entity,
      meters:
        typeof h.relation.properties.meters === "number"
          ? h.relation.properties.meters
          : 0,
      relation: h.relation,
    }))
    .filter((h) => h.meters <= maxMeters || h.meters === 0)
    .slice(0, limit);

  if (viaEdge.length > 0) return viaEdge;

  const olat = Number(origin.properties.lat);
  const olng = Number(origin.properties.lng);
  if (!Number.isFinite(olat) || !Number.isFinite(olng)) return [];

  return listRealityEntities()
    .filter((e) => e.id !== origin.id)
    .filter((e) => (options?.types ? options.types.includes(e.type) : true))
    .map((e) => {
      const lat = Number(e.properties.lat);
      const lng = Number(e.properties.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const meters =
        haversineKm({ lat: olat, lng: olng }, { lat, lng }) * 1000;
      return { entity: e, meters, relation: null as RealityRelation | null };
    })
    .filter((h): h is NearbyEntityHit => h != null && h.meters <= maxMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

/** Convenience: LocatedNear targets only */
export function findLocatedNear(
  entityId: RealityEntityId,
): readonly RelatedEntityHit[] {
  return getRelatedEntities(entityId, { kind: "LocatedNear" });
}

export function listUsedInContexts(
  entityId: RealityEntityId,
): readonly RelatedEntityHit[] {
  return getRelatedEntities(entityId, { kind: "UsedIn" });
}

/** STEP 3 public query aliases */
export const nearby = findNearby;
export const related = getRelatedEntities;
export const path = findPath;
export const similar = findSimilar;

export type ConnectedEntityLine = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly type: string;
  readonly relationKind: RealityRelationKind | "Connected";
};

/**
 * Hotel click UX — Connected list for a Reality Entity.
 * Example: Namba Hotel → Osaka Trip · Namba Station · Restaurant A · USJ Route
 */
export function listConnected(
  entityId: RealityEntityId,
  options?: { readonly limit?: number },
): readonly ConnectedEntityLine[] {
  const limit = options?.limit ?? 16;
  const hits = getRelatedEntities(entityId);
  const lines: ConnectedEntityLine[] = [];
  const seen = new Set<string>();

  for (const h of hits) {
    if (seen.has(h.entity.id)) continue;
    seen.add(h.entity.id);
    lines.push({
      entityId: h.entity.id,
      titleKo: String(
        h.entity.properties.name ?? h.entity.properties.title ?? h.entity.id,
      ),
      type: h.entity.type,
      relationKind: h.relation.kind,
    });
    if (lines.length >= limit) break;
  }
  return lines;
}
