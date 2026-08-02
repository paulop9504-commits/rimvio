/**
 * Entity Retrieval — discover targets near Anchor, then Context-Score rank.
 * Stub seeds until live maps wire — never treat as bare Google POI list SSOT.
 */

import {
  applySpatialQueryRanking,
} from "@/lib/spatial-retrieval/spatial-query-builder";
import type {
  SpatialQuerySpec,
  SpatialRetrievedEntity,
  SpatialTargetEntity,
} from "@/lib/spatial-retrieval/types";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

type SeedHit = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  rating: number;
  budgetBand: string;
  scheduleTags: readonly string[];
};

/** Demo inventory relative to Anchor — Context Score attributes included. */
function seedInventory(
  target: SpatialTargetEntity,
  center: { lat: number; lng: number },
): readonly SeedHit[] {
  if (target === "restaurant" || target === "cafe") {
    return [
      {
        id: "ent_rest_ichiran",
        title: "Ichiran",
        lat: center.lat + 0.004,
        lng: center.lng + 0.002,
        rating: 4.4,
        budgetBand: "mid",
        scheduleTags: ["lunch", "dinner"],
      },
      {
        id: "ent_rest_kukuru",
        title: "Kukuru Takoyaki",
        lat: center.lat + 0.002,
        lng: center.lng - 0.003,
        rating: 4.1,
        budgetBand: "low",
        scheduleTags: ["snack", "dinner"],
      },
      {
        id: "ent_rest_sushi",
        title: "Sushiro Namba",
        lat: center.lat - 0.003,
        lng: center.lng + 0.001,
        rating: 4.0,
        budgetBand: "mid",
        scheduleTags: ["lunch", "dinner"],
      },
    ];
  }
  if (target === "hotel") {
    return [
      {
        id: "ent_hotel_near_1",
        title: "Station Capsule",
        lat: center.lat + 0.001,
        lng: center.lng + 0.001,
        rating: 3.8,
        budgetBand: "low",
        scheduleTags: ["night"],
      },
    ];
  }
  return [
    {
      id: "ent_attr_1",
      title: "Dotonbori",
      lat: center.lat + 0.005,
      lng: center.lng,
      rating: 4.6,
      budgetBand: "mid",
      scheduleTags: ["day", "evening"],
    },
  ];
}

function passesRelationFilter(
  query: SpatialQuerySpec,
  meters: number,
): boolean {
  const r = query.radius;
  switch (query.relation) {
    case "nearby":
      return meters <= r;
    case "walking_distance":
      // Prefer walkable band (≤ ~12 min ≈ 960m when default)
      return meters <= r && meters / 80 <= 15;
    case "route_along":
      return meters <= r;
    case "same_area":
      return meters <= r;
    case "inside":
      return meters <= Math.min(r, 600);
    default:
      return meters <= r;
  }
}

export function retrieveSpatialEntities(input: {
  readonly query: SpatialQuerySpec;
  /** Optional live inventory from Workspace / maps */
  readonly inventory?: readonly {
    readonly entityId: string;
    readonly titleKo: string;
    readonly kind: string;
    readonly lat: number;
    readonly lng: number;
    readonly rating?: number | null;
    readonly budgetBand?: string | null;
    readonly scheduleTags?: readonly string[];
  }[];
}): readonly SpatialRetrievedEntity[] {
  const { query } = input;
  const center = query.center;
  if (!center) return [];

  const raw: SeedHit[] =
    input.inventory && input.inventory.length > 0
      ? input.inventory
          .filter((e) => {
            const k = e.kind.toLowerCase();
            if (query.targetEntity === "restaurant") {
              return k === "restaurant" || k === "eatery" || k === "cafe";
            }
            if (query.targetEntity === "cafe") return k === "cafe";
            if (query.targetEntity === "hotel") {
              return k === "hotel" || k === "lodging";
            }
            return true;
          })
          .map((e) => ({
            id: e.entityId,
            title: e.titleKo,
            lat: e.lat,
            lng: e.lng,
            rating: e.rating ?? 3.5,
            budgetBand: e.budgetBand ?? "mid",
            scheduleTags: e.scheduleTags ?? ["any"],
          }))
      : [...seedInventory(query.targetEntity, center)];

  const out: SpatialRetrievedEntity[] = [];
  for (const e of raw) {
    if (e.id === query.anchor.entityId) continue;
    const meters = Math.round(
      haversineMeters(center, { lat: e.lat, lng: e.lng }),
    );
    if (!passesRelationFilter(query, meters)) continue;
    out.push({
      entityId: e.id,
      titleKo: e.title,
      kind: query.targetEntity,
      lat: e.lat,
      lng: e.lng,
      metersFromAnchor: meters,
      walkMinutes: Math.max(1, Math.round(meters / 80)),
      rating: e.rating,
      budgetBand: e.budgetBand,
      scheduleTags: e.scheduleTags,
    });
  }

  // Context Score ranking — not distance-only sort
  return applySpatialQueryRanking({ query, entities: out }).slice(0, 12);
}
