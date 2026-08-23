import { CITY_ANCHORS, resolvePlaceAnchor } from "@/lib/fact-query/data/city-anchors";
import { OSAKA_HOTSPOTS } from "@/lib/fact-query/data/osaka-hotspot-ssot";
import { SEOUL_HOTSPOTS } from "@/lib/fact-query/data/seoul-hotspot-ssot";
import { TOKYO_HOTSPOTS } from "@/lib/fact-query/data/tokyo-hotspot-ssot";

export type FactPlace = {
  readonly id: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly source: string;
};

const HOTSPOT_ROWS: readonly {
  readonly id: string;
  readonly nameKo: string;
  readonly nameJa: string;
  readonly lat: number;
  readonly lng: number;
  readonly source: string;
}[] = [
  ...TOKYO_HOTSPOTS.map((row) => ({
    id: row.id,
    nameKo: row.nameKo,
    nameJa: row.nameJa,
    lat: row.lat,
    lng: row.lng,
    source: "tokyo_hotspot_ssot",
  })),
  ...OSAKA_HOTSPOTS.map((row) => ({
    id: row.id,
    nameKo: row.nameKo,
    nameJa: row.nameJa,
    lat: row.lat,
    lng: row.lng,
    source: "osaka_hotspot_ssot",
  })),
  ...SEOUL_HOTSPOTS.map((row) => ({
    id: row.id,
    nameKo: row.nameKo,
    nameJa: row.nameEn,
    lat: row.lat,
    lng: row.lng,
    source: "seoul_hotspot_ssot",
  })),
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function rowMatchesQuery(
  query: string,
  row: { readonly nameKo: string; readonly nameJa: string; readonly id: string },
): boolean {
  const q = normalize(query);
  if (!q) return false;
  const ko = normalize(row.nameKo);
  const ja = normalize(row.nameJa);
  const id = normalize(row.id);
  if (q === ko || q.includes(ko) || ko.includes(q)) return true;
  if (ja && (q === ja || q.includes(ja) || ja.includes(q))) return true;
  if (q === id || q.includes(id)) return true;
  if (/usj|유니버설|ユニバ/u.test(q) && row.id === "usj") return true;
  return false;
}

/** Resolve anchor / activity from city anchors + hotspot SSOT. */
export function resolveFactPlace(query: string): FactPlace | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const anchor = resolvePlaceAnchor(trimmed);
  if (anchor) {
    return {
      id: anchor.id,
      labelKo: anchor.labelKo,
      lat: anchor.lat,
      lng: anchor.lng,
      source: "city_anchors",
    };
  }

  for (const row of HOTSPOT_ROWS) {
    if (rowMatchesQuery(trimmed, row)) {
      return {
        id: row.id,
        labelKo: row.nameKo,
        lat: row.lat,
        lng: row.lng,
        source: row.source,
      };
    }
  }

  if (/호텔|숙소|hotel/u.test(trimmed)) {
    for (const row of CITY_ANCHORS) {
      if (rowMatchesQuery(trimmed, { ...row, nameJa: "" })) {
        return {
          id: row.id,
          labelKo: row.labelKo,
          lat: row.lat,
          lng: row.lng,
          source: "city_anchors",
        };
      }
    }
  }

  return null;
}
