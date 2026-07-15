/**
 * Match a Research candidate against an inventory list (placeId → name → nearest).
 */

export type InventoryHitRow = {
  placeId?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceKrw?: number | null;
  address?: string | null;
};

function tokenize(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameClose(a: string, b: string): boolean {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta || !tb) return false;
  if (ta === tb) return true;
  if (ta.includes(tb.slice(0, Math.min(8, tb.length))) || tb.includes(ta.slice(0, Math.min(8, ta.length)))) {
    return true;
  }
  return false;
}

function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(s));
}

/** Pick best inventory row for a surgical tool target. */
export function matchInventoryHit<T extends InventoryHitRow>(
  rows: readonly T[],
  input: {
    title: string;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
): T | null {
  if (rows.length === 0) return null;
  const placeId = input.placeId?.trim();
  if (placeId) {
    const byId = rows.find((r) => (r.placeId ?? "").trim() === placeId);
    if (byId) return byId;
  }
  const byName = rows.find((r) => nameClose(r.name ?? "", input.title));
  if (byName) return byName;

  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    let best: T | null = null;
    let bestM = Infinity;
    for (const row of rows) {
      if (row.lat == null || row.lng == null) continue;
      const m = haversineM(input.lat, input.lng, row.lat, row.lng);
      if (m < bestM) {
        bestM = m;
        best = row;
      }
    }
    if (best && bestM <= 350) return best;
  }
  return null;
}

/** Infer discovery surface from Research candidate domain. */
export function resolveResearchToolSurface(
  domain: string | null | undefined,
): "lodging" | "eatery" | "activity" | "amenity" {
  const d = (domain ?? "").toLowerCase();
  if (/eatery|restaurant|food|맛집|식당/.test(d)) return "eatery";
  if (/amenity|편의|편의시설/.test(d)) return "amenity";
  if (/activity|play|tourist|attraction|놀|명소|랜드마크/.test(d)) {
    return "activity";
  }
  if (/lodging|hotel|宿|숙소|capsule/.test(d)) return "lodging";
  return "lodging";
}
