import {
  getWorldGeoNode,
  listWorldGeoChildren,
  listWorldGeoSeed,
} from "@/lib/reality-graph/world-geo-seed";
import type {
  RealityGraphResolveHit,
  WorldGeoEntityId,
  WorldGeoNode,
} from "@/lib/reality-graph/types";

function normalizeAlias(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function nodeAliases(node: WorldGeoNode): string[] {
  const raw = [
    node.labels.ko,
    node.labels.en,
    node.labels.local ?? "",
    ...(node.labels.aliases ?? []),
  ];
  return raw.map(normalizeAlias).filter(Boolean);
}

/** Longest alias wins — Shinjuku before Tokyo when both appear. */
export function resolveWorldGeoEntity(text: string): RealityGraphResolveHit | null {
  const normalized = normalizeAlias(text);
  if (!normalized) {
    return null;
  }

  let best: { node: WorldGeoNode; alias: string; score: number } | null = null;

  for (const node of listWorldGeoSeed()) {
    if (node.kind === "world" || node.kind === "continent") {
      continue;
    }
    for (const alias of nodeAliases(node)) {
      if (!alias || alias.length < 2) {
        continue;
      }
      if (!normalized.includes(alias) && alias !== normalized) {
        continue;
      }
      const score = alias.length * 10 + kindBias(node);
      if (!best || score > best.score) {
        best = { node, alias, score };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    node: best.node,
    ancestors: walkAncestors(best.node.id),
    children: listWorldGeoChildren(best.node.id),
    matchAlias: best.alias,
    confidence: Math.min(0.98, 0.7 + best.alias.length / 40),
  };
}

export function resolveWorldGeoById(id: WorldGeoEntityId): RealityGraphResolveHit | null {
  const node = getWorldGeoNode(id);
  if (!node) {
    return null;
  }
  return {
    node,
    ancestors: walkAncestors(id),
    children: listWorldGeoChildren(id),
    matchAlias: node.labels.en,
    confidence: 1,
  };
}

/** Root → parent → … (excludes self). */
export function walkAncestors(id: WorldGeoEntityId): WorldGeoNode[] {
  const chain: WorldGeoNode[] = [];
  let current = getWorldGeoNode(id);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.parentId)) {
    guard.add(current.parentId);
    const parent = getWorldGeoNode(current.parentId);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Full path including self: World → … → node */
export function walkHierarchyPath(id: WorldGeoEntityId): WorldGeoNode[] {
  const node = getWorldGeoNode(id);
  if (!node) {
    return [];
  }
  return [...walkAncestors(id), node];
}

function kindBias(node: WorldGeoNode): number {
  switch (node.kind) {
    case "neighborhood":
      return 50;
    case "district":
      return 40;
    case "ward":
      return 35;
    case "city":
      return 25;
    case "metropolis":
      return 20;
    case "prefecture":
      return 18;
    case "country":
      return 10;
    default:
      return 0;
  }
}

/** Nearest seed node by Haversine (V1 reverse geocode stub — no polygons). */
export function resolveWorldGeoNearCoords(
  lat: number,
  lng: number,
): RealityGraphResolveHit | null {
  let best: { node: WorldGeoNode; distKm: number } | null = null;
  for (const node of listWorldGeoSeed()) {
    if (node.kind === "world" || node.kind === "continent" || node.kind === "country") {
      continue;
    }
    const distKm = haversineKm(lat, lng, node.centroid.lat, node.centroid.lng);
    if (!best || distKm < best.distKm) {
      best = { node, distKm };
    }
  }
  if (!best || best.distKm > 80) {
    return null;
  }
  return {
    node: best.node,
    ancestors: walkAncestors(best.node.id),
    children: listWorldGeoChildren(best.node.id),
    matchAlias: "gps",
    confidence: Math.max(0.55, 1 - best.distKm / 80),
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
