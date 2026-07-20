import type {
  BloomRelationKind,
  ContextBloomCandidate,
  ContextBloomRelatedHit,
} from "@/lib/visual-projection/context-bloom-types";

const EARTH_KM = 6371;

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function relationKindForPair(
  from: ContextBloomCandidate["pinKind"],
  to: ContextBloomCandidate["pinKind"],
): BloomRelationKind {
  if (from === "lodging" && (to === "eatery" || to === "activity")) {
    return "booking_order";
  }
  if (to === "amenity" || from === "amenity") {
    return "travel";
  }
  if (from === "activity" || to === "activity") {
    return "recommend";
  }
  return "recommend";
}

/** Type affinity 0–1 for nearby ranking. */
function typeAffinity(
  from: ContextBloomCandidate["pinKind"],
  to: ContextBloomCandidate["pinKind"],
): number {
  if (from === to) {
    return 0.55;
  }
  const key = `${from}>${to}`;
  const table: Record<string, number> = {
    "activity>eatery": 0.93,
    "activity>amenity": 0.91,
    "activity>lodging": 0.89,
    "eatery>lodging": 0.88,
    "eatery>activity": 0.9,
    "eatery>amenity": 0.72,
    "lodging>eatery": 0.9,
    "lodging>activity": 0.86,
    "lodging>amenity": 0.8,
    "amenity>activity": 0.7,
    "amenity>eatery": 0.65,
    "amenity>lodging": 0.7,
  };
  return table[key] ?? 0.42;
}

/**
 * Rank nearby objects for Context Bloom — top 3–5 only.
 * Score blends type affinity + proximity (never draw every edge).
 */
export function rankContextBloomRelations(input: {
  selected: ContextBloomCandidate;
  candidates: readonly ContextBloomCandidate[];
  maxRelated?: number;
  maxDistanceKm?: number;
}): ContextBloomRelatedHit[] {
  const maxRelated = input.maxRelated ?? 4;
  const maxKm = input.maxDistanceKm ?? 8;
  const selected = input.selected;

  const scored = input.candidates
    .filter((row) => row.id !== selected.id && row.resourceId !== selected.resourceId)
    .map((row) => {
      const km = haversineKm(selected, row);
      if (km > maxKm) {
        return null;
      }
      const affinity = typeAffinity(selected.pinKind, row.pinKind);
      // 0km → 1, maxKm → 0
      const proximity = Math.max(0, 1 - km / maxKm);
      const score = affinity * 0.62 + proximity * 0.38;
      if (score < 0.42) {
        return null;
      }
      return {
        id: row.id,
        resourceId: row.resourceId,
        label: row.label,
        lat: row.lat,
        lng: row.lng,
        pinKind: row.pinKind,
        score,
        relationKind: relationKindForPair(selected.pinKind, row.pinKind),
        bloomDelayMs: 0,
      } satisfies ContextBloomRelatedHit;
    })
    .filter((row): row is ContextBloomRelatedHit => row != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRelated)
    .map((row, index) => ({
      ...row,
      bloomDelayMs: 100 * (index + 1),
    }));

  return scored;
}
