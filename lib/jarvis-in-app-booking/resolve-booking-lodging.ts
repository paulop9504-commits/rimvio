/**
 * Curated lodging catalog for in-app booking draft (Tier C).
 */

import { OSAKA_APA_BRANCHES } from "@/lib/search-engine/osaka-demo-catalog";

export type BookingLodgingCandidate = {
  readonly id: string;
  readonly labelKo: string;
  readonly cityId: string;
  readonly lat: number;
  readonly lng: number;
  readonly amountLabel?: string | null;
  readonly aliases: readonly string[];
};

export const BOOKING_LODGING_CATALOG: readonly BookingLodgingCandidate[] = [
  ...OSAKA_APA_BRANCHES.map((row) => ({
    id: row.id,
    labelKo: row.labelKo,
    cityId: "osaka",
    lat: row.lat,
    lng: row.lng,
    amountLabel: row.amountLabel ?? null,
    aliases: row.aliases,
  })),
  {
    id: "lodging:tokyo:shibuya-granbell",
    labelKo: "시부야 그란벨 호텔",
    cityId: "tokyo",
    lat: 35.658,
    lng: 139.7016,
    amountLabel: "₩18만/박",
    aliases: ["그란벨", "시부야 호텔", "Granbell", "シブヤ グランベル"],
  },
  {
    id: "lodging:seoul:gangnam-novotel",
    labelKo: "강남 노보텔 앰배서더",
    cityId: "seoul",
    lat: 37.505,
    lng: 127.024,
    amountLabel: "₩22만/박",
    aliases: ["노보텔", "강남 호텔", "Novotel", "앰배서더"],
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

export function resolveBookingLodging(
  query: string,
): BookingLodgingCandidate | null {
  const q = normalize(query);
  if (!q) return null;

  for (const row of BOOKING_LODGING_CATALOG) {
    const label = normalize(row.labelKo);
    if (q === label || q.includes(label) || label.includes(q)) {
      return row;
    }
    for (const alias of row.aliases) {
      const a = normalize(alias);
      if (q === a || q.includes(a) || a.includes(q)) {
        return row;
      }
    }
    if (q.includes(normalize(row.id))) {
      return row;
    }
  }
  return null;
}

export function searchBookingLodgingCandidates(input: {
  readonly query: string;
  readonly limit?: number;
}): readonly BookingLodgingCandidate[] {
  const q = normalize(input.query);
  if (!q) return [];
  const limit = input.limit ?? 4;
  const scored = BOOKING_LODGING_CATALOG.map((row) => {
    const label = normalize(row.labelKo);
    let score = 0;
    if (q === label) score += 100;
    if (label.includes(q) || q.includes(label)) score += 50;
    for (const alias of row.aliases) {
      const a = normalize(alias);
      if (q === a) score += 80;
      if (a.includes(q) || q.includes(a)) score += 30;
    }
    return { row, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.row);
}
