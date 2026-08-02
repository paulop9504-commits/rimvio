/**
 * ObjectRelation API — Explore Context Graph from a Rimvio Object.
 * getRelations(objectId, relationType) → grounded graph neighbors.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ContextWorkspaceRelationshipEdge } from "@/lib/context-workspace/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

export const OBJECT_RELATION_TYPES = [
  "nearby",
  "similar",
  "connected",
  "route",
] as const;

export type ObjectRelationType = (typeof OBJECT_RELATION_TYPES)[number];

/** Role of related node in Explore results (not hardcoded hotel UI). */
export type ObjectRelationRole =
  | "restaurant"
  | "cafe"
  | "transport"
  | "place"
  | "lodging"
  | "peer"
  | "other";

export type ObjectRelation = {
  readonly id: string;
  readonly relationType: ObjectRelationType;
  readonly fromObjectId: string;
  readonly toObjectId: string;
  readonly title: string;
  readonly role: ObjectRelationRole;
  readonly roleLabelKo: string;
  readonly meters: number | null;
  readonly edgeId: string | null;
  readonly lat: number;
  readonly lng: number;
  /** Line from origin → target for map edge highlight [lng,lat][] */
  readonly lineCoords: readonly [number, number][];
};

export type ObjectRelationContext = {
  readonly origin: ContextWorkspaceNode;
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly edges: readonly ContextWorkspaceRelationshipEdge[];
  /** Optional itinerary order for route relations */
  readonly routeNodeIds?: readonly string[] | null;
};

const ROLE_LABEL_KO: Record<ObjectRelationRole, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  transport: "Transport",
  place: "Place",
  lodging: "Lodging",
  peer: "Similar",
  other: "Node",
};

export const OBJECT_RELATION_TYPE_LABEL_KO: Record<ObjectRelationType, string> = {
  nearby: "Nearby",
  similar: "Similar",
  connected: "Connected",
  route: "Route",
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function resolveObjectRelationRole(
  node: ContextWorkspaceNode,
): ObjectRelationRole {
  const blob = `${node.title} ${node.summaryKo} ${node.tags.join(" ")}`.toLowerCase();
  if (node.kind === "lodging") return "lodging";
  if (node.kind === "eatery") {
    if (/cafe|커피|카페|coffee|bakery|디저트/i.test(blob)) return "cafe";
    return "restaurant";
  }
  if (node.kind === "amenity") {
    if (
      /subway|station|transit|metro|버스|역|교통|transport|편의점|편의/i.test(
        blob,
      ) ||
      node.tags.some((t) => /transit|station|subway/i.test(t))
    ) {
      return "transport";
    }
    return "transport";
  }
  if (node.kind === "poi") return "place";
  return "other";
}

function toRelation(input: {
  origin: ContextWorkspaceNode;
  target: ContextWorkspaceNode;
  relationType: ObjectRelationType;
  meters: number | null;
  edgeId: string | null;
  roleOverride?: ObjectRelationRole;
}): ObjectRelation {
  const role =
    input.roleOverride ??
    (input.relationType === "similar"
      ? "peer"
      : resolveObjectRelationRole(input.target));
  return {
    id: `${input.relationType}:${input.origin.id}:${input.target.id}`,
    relationType: input.relationType,
    fromObjectId: input.origin.id,
    toObjectId: input.target.id,
    title: input.target.title,
    role,
    roleLabelKo: ROLE_LABEL_KO[role],
    meters: input.meters,
    edgeId: input.edgeId,
    lat: input.target.lat,
    lng: input.target.lng,
    lineCoords: [
      [input.origin.lng, input.origin.lat],
      [input.target.lng, input.target.lat],
    ],
  };
}

function uniqueByTarget(
  relations: readonly ObjectRelation[],
): ObjectRelation[] {
  const seen = new Set<string>();
  const out: ObjectRelation[] = [];
  for (const r of relations) {
    if (seen.has(r.toObjectId)) continue;
    seen.add(r.toObjectId);
    out.push(r);
  }
  return out;
}

function nearbyRelations(ctx: ObjectRelationContext): ObjectRelation[] {
  const { origin, nodes, edges } = ctx;
  const fromEdges: ObjectRelation[] = [];
  for (const e of edges) {
    if (e.kind !== "nearby" && e.kind !== "route") continue;
    if (e.fromId !== origin.id && e.toId !== origin.id) continue;
    const otherId = e.fromId === origin.id ? e.toId : e.fromId;
    const target = nodes.find((n) => n.id === otherId);
    if (!target || !target.visible) continue;
    fromEdges.push(
      toRelation({
        origin,
        target,
        relationType: "nearby",
        meters: e.meters,
        edgeId: e.id,
      }),
    );
  }
  if (fromEdges.length > 0) {
    return uniqueByTarget(fromEdges).slice(0, 8);
  }

  return uniqueByTarget(
    nodes
      .filter((n) => n.id !== origin.id && n.visible)
      .map((n) => {
        const meters = Math.round(
          haversineMeters(
            { lat: origin.lat, lng: origin.lng },
            { lat: n.lat, lng: n.lng },
          ),
        );
        return toRelation({
          origin,
          target: n,
          relationType: "nearby",
          meters,
          edgeId: `nearby:${origin.id}:${n.id}`,
        });
      })
      .filter((r) => r.meters == null || r.meters <= 1500)
      .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0))
      .slice(0, 8),
  );
}

function similarRelations(ctx: ObjectRelationContext): ObjectRelation[] {
  const { origin, nodes } = ctx;
  return uniqueByTarget(
    nodes
      .filter((n) => n.id !== origin.id && n.visible && n.kind === origin.kind)
      .map((n) =>
        toRelation({
          origin,
          target: n,
          relationType: "similar",
          meters: Math.round(
            haversineMeters(
              { lat: origin.lat, lng: origin.lng },
              { lat: n.lat, lng: n.lng },
            ),
          ),
          edgeId: `similar:${origin.id}:${n.id}`,
          roleOverride: "peer",
        }),
      )
      .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0))
      .slice(0, 6),
  );
}

function connectedRelations(ctx: ObjectRelationContext): ObjectRelation[] {
  const { origin, nodes, edges } = ctx;
  const fromEdges: ObjectRelation[] = [];
  for (const e of edges) {
    if (e.fromId !== origin.id && e.toId !== origin.id) continue;
    const otherId = e.fromId === origin.id ? e.toId : e.fromId;
    const target = nodes.find((n) => n.id === otherId);
    if (!target) continue;
    fromEdges.push(
      toRelation({
        origin,
        target,
        relationType: "connected",
        meters: e.meters,
        edgeId: e.id,
      }),
    );
  }
  if (fromEdges.length > 0) return uniqueByTarget(fromEdges).slice(0, 8);

  // Soft connected: selected / bookmarked / compare peers
  return uniqueByTarget(
    nodes
      .filter(
        (n) =>
          n.id !== origin.id &&
          n.visible &&
          (n.selected || n.bookmarked),
      )
      .map((n) =>
        toRelation({
          origin,
          target: n,
          relationType: "connected",
          meters: Math.round(
            haversineMeters(
              { lat: origin.lat, lng: origin.lng },
              { lat: n.lat, lng: n.lng },
            ),
          ),
          edgeId: `connected:${origin.id}:${n.id}`,
        }),
      )
      .slice(0, 6),
  );
}

function routeRelations(ctx: ObjectRelationContext): ObjectRelation[] {
  const { origin, nodes, edges, routeNodeIds } = ctx;
  const fromEdges: ObjectRelation[] = [];
  for (const e of edges) {
    if (e.kind !== "route") continue;
    if (e.fromId !== origin.id && e.toId !== origin.id) continue;
    const otherId = e.fromId === origin.id ? e.toId : e.fromId;
    const target = nodes.find((n) => n.id === otherId);
    if (!target) continue;
    fromEdges.push(
      toRelation({
        origin,
        target,
        relationType: "route",
        meters: e.meters,
        edgeId: e.id,
      }),
    );
  }
  if (fromEdges.length > 0) return uniqueByTarget(fromEdges).slice(0, 8);

  const order = routeNodeIds ?? [];
  const idx = order.indexOf(origin.id);
  if (idx < 0) return [];
  const neighborIds = [order[idx - 1], order[idx + 1]].filter(
    (id): id is string => Boolean(id),
  );
  return uniqueByTarget(
    neighborIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is ContextWorkspaceNode => Boolean(n))
      .map((n) =>
        toRelation({
          origin,
          target: n,
          relationType: "route",
          meters: Math.round(
            haversineMeters(
              { lat: origin.lat, lng: origin.lng },
              { lat: n.lat, lng: n.lng },
            ),
          ),
          edgeId: `route:${origin.id}:${n.id}`,
        }),
      ),
  );
}

/**
 * Explore graph from an object.
 * relationType: nearby | similar | connected | route
 */
export function getRelations(
  objectId: string,
  relationType: ObjectRelationType,
  ctx: ObjectRelationContext,
): readonly ObjectRelation[] {
  if (ctx.origin.id !== objectId) {
    const origin = ctx.nodes.find((n) => n.id === objectId);
    if (!origin) return [];
    return getRelations(objectId, relationType, { ...ctx, origin });
  }

  switch (relationType) {
    case "nearby":
      return nearbyRelations(ctx);
    case "similar":
      return similarRelations(ctx);
    case "connected":
      return connectedRelations(ctx);
    case "route":
      return routeRelations(ctx);
  }
}

export function getAllRelationBuckets(
  objectId: string,
  ctx: ObjectRelationContext,
): Record<ObjectRelationType, readonly ObjectRelation[]> {
  return {
    nearby: getRelations(objectId, "nearby", ctx),
    similar: getRelations(objectId, "similar", ctx),
    connected: getRelations(objectId, "connected", ctx),
    route: getRelations(objectId, "route", ctx),
  };
}

export function buildObjectRelationContextFromWorkspace(
  state: ContextWorkspaceState,
  objectId: string,
): ObjectRelationContext | null {
  const origin = state.nodes.find((n) => n.id === objectId);
  if (!origin) return null;
  const routeNodeIds = state.nodes
    .filter((n) => n.visible)
    .map((n) => n.id);
  return {
    origin,
    nodes: state.nodes,
    edges: state.relationshipEdges ?? [],
    routeNodeIds,
  };
}
