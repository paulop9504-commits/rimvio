/**
 * Entity Retrieval — discover target entities near Anchor (Workspace-scoped).
 * Stub seeds when no inventory yet — pipeline continues to relations/projection.
 */

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

/** Demo inventory relative to Namba — retrieval placeholder until live maps wire. */
function seedInventory(
  target: SpatialTargetEntity,
  center: { lat: number; lng: number },
): readonly { id: string; title: string; lat: number; lng: number }[] {
  if (target === "restaurant" || target === "cafe") {
    return [
      {
        id: "ent_rest_ichiran",
        title: "Ichiran",
        lat: center.lat + 0.004,
        lng: center.lng + 0.002,
      },
      {
        id: "ent_rest_kukuru",
        title: "Kukuru Takoyaki",
        lat: center.lat + 0.002,
        lng: center.lng - 0.003,
      },
      {
        id: "ent_rest_sushi",
        title: "Sushiro Namba",
        lat: center.lat - 0.003,
        lng: center.lng + 0.001,
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
      },
    ];
  }
  return [
    {
      id: "ent_attr_1",
      title: "Dotonbori",
      lat: center.lat + 0.005,
      lng: center.lng,
    },
  ];
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
  }[];
}): readonly SpatialRetrievedEntity[] {
  const { query } = input;
  const center = query.center;
  if (!center) return [];

  const raw =
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
          }))
      : seedInventory(query.targetEntity, center);

  const out: SpatialRetrievedEntity[] = [];
  for (const e of raw) {
    if (e.id === query.anchor.entityId) continue;
    const meters = Math.round(
      haversineMeters(center, { lat: e.lat, lng: e.lng }),
    );
    if (meters > query.radiusMeters) continue;
    out.push({
      entityId: e.id,
      titleKo: e.title,
      kind: query.targetEntity,
      lat: e.lat,
      lng: e.lng,
      metersFromAnchor: meters,
      walkMinutes: Math.max(1, Math.round(meters / 80)),
    });
  }
  return out.slice(0, 12);
}
