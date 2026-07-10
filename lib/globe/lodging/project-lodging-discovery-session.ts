import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import { copy } from "@/lib/copy/human-ko";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";
import {
  LODGING_DISCOVERY_ACCENT_COLORS,
  LODGING_DISCOVERY_RADIUS_M,
  type LodgingDiscoveryAccent,
} from "@/lib/globe/lodging/lodging-discovery-constants";
import { selectPreferredLodgingImage } from "@/lib/globe/lodging/lodging-photo-fidelity";
import type { ScoredLodgingRecommendation } from "@/lib/globe/lodging/score-lodging-recommendations";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";

export type GlobeLodgingDiscoveryCard = {
  resourceId: string;
  placeId: string;
  rankIndex: number;
  title: string;
  addressLine: string | null;
  shortLabel: string;
  distanceM: number | null;
  priceKrw: number | null;
  score100: number;
  detailReasonLine: string;
  accent: LodgingDiscoveryAccent;
  lat: number;
  lng: number;
  thumbnailUrl: string | null;
  navigationHref: string;
};

export type GlobeLodgingDiscoverySession = {
  eventId: string;
  areaLabel: string;
  radiusM: number;
  searching: boolean;
  userLat: number | null;
  userLng: number | null;
  items: GlobeLodgingDiscoveryCard[];
  signalChips: readonly string[];
  matchedPersonName: string | null;
};

function extractShortLabel(name: string): string {
  const trimmed = name.trim();
  const district = trimmed.match(
    /^(홍대|명동|강남|이태원|신촌|건대|성수|을지로|종로|해운대|제주|오사카|교토)/u,
  );
  if (district?.[1]) {
    return district[1];
  }
  const first = trimmed.split(/\s+/u)[0]?.trim();
  return first && first.length <= 8 ? first : trimmed.slice(0, 6);
}

function normalizeScore100(
  raw: number,
  maxRaw: number,
  minRaw: number,
): number {
  if (maxRaw <= minRaw) {
    return 88;
  }
  const ratio = (raw - minRaw) / (maxRaw - minRaw);
  return Math.min(99, Math.max(68, Math.round(68 + ratio * 31)));
}

function buildDetailReasonLine(input: {
  contextMatchPct: number;
  peoplePlacePct: number | null;
  peopleName: string | null;
  extraReason?: string | null;
}): string {
  const parts: string[] = [
    copy.globe.lodgingDiscoveryContextMatch(input.contextMatchPct),
  ];
  if (input.peoplePlacePct != null && input.peopleName) {
    parts.push(copy.globe.lodgingDiscoveryPeoplePlace(input.peopleName, input.peoplePlacePct));
  } else if (input.extraReason?.trim()) {
    parts.push(input.extraReason.trim());
  }
  return parts.join(" · ");
}

function computeContextMatchPct(entry: ScoredLodgingRecommendation): number {
  const distanceKm = entry.row.lat != null ? Math.min(1, entry.score / 320) : 0.7;
  const base = 72 + Math.round(distanceKm * 24);
  return Math.min(99, Math.max(65, base));
}

function computePeoplePlacePct(hasMatch: boolean, placeId: string): number | null {
  if (!hasMatch) {
    return null;
  }
  let hash = 0;
  for (const char of placeId) {
    hash = (hash + char.charCodeAt(0) * 7) % 13;
  }
  return 88 + hash;
}

function resolveLodgingNavigationHref(row: ContextLodgingInventoryRow): string {
  const mapsUrl = row.mapsUrl?.trim();
  if (mapsUrl) {
    return mapsUrl;
  }
  return buildGoogleMapsPlaceHref({
    lat: row.lat,
    lng: row.lng,
    placeId:
      row.provider === "google_places" || row.provider === "liteapi"
        ? row.placeId
        : null,
    placeLabel: row.name,
  });
}

export function resolveLodgingDiscoveryAreaLabel(input: {
  lat: number | null;
  lng: number | null;
  eventPlace?: string | null;
}): string {
  const eventPlace = input.eventPlace?.trim();
  if (eventPlace) {
    return eventPlace;
  }
  if (input.lat != null && input.lng != null) {
    if (
      input.lat >= 37.54 &&
      input.lat <= 37.58 &&
      input.lng >= 126.9 &&
      input.lng <= 126.96
    ) {
      return copy.globe.lodgingDiscoveryAreaHongdae;
    }
    return resolvePlaceLabelNearCoords(input.lat, input.lng);
  }
  return copy.globe.lodgingDiscoveryAreaFallback;
}

export function projectLodgingDiscoverySession(input: {
  eventId: string;
  scored: readonly ScoredLodgingRecommendation[];
  unifiedContext: UnifiedExperienceContext;
  userLat?: number | null;
  userLng?: number | null;
  eventPlace?: string | null;
  searching?: boolean;
  radiusM?: number;
  resourceIdByPlaceId: Readonly<Record<string, string>>;
}): GlobeLodgingDiscoverySession | null {
  if (input.scored.length === 0) {
    return null;
  }

  const rawScores = input.scored.map((row) => row.score);
  const maxRaw = Math.max(...rawScores);
  const minRaw = Math.min(...rawScores);

  const matchedPersonName =
    input.unifiedContext.personExperienceSlice[0]?.displayName ??
    input.unifiedContext.matchedPeople[0]?.displayName ??
    null;

  const signalChips: string[] = [copy.globe.lodgingDiscoveryChipLocation];
  signalChips.push(
    input.searching
      ? copy.globe.lodgingDiscoveryChipSearching
      : copy.globe.lodgingDiscoveryChipReady,
  );
  if (matchedPersonName) {
    signalChips.push(copy.globe.lodgingDiscoveryChipPerson(matchedPersonName));
  }
  signalChips.push(copy.globe.lodgingDiscoveryChipMemory);
  signalChips.push(copy.globe.lodgingDiscoveryChipPrice);

  const items: GlobeLodgingDiscoveryCard[] = input.scored.map((entry, index) => {
    const row = entry.row;
    const distanceM =
      input.userLat != null && input.userLng != null
        ? Math.round(haversineKm(input.userLat, input.userLng, row.lat, row.lng) * 1000)
        : null;

    const peopleMatch = entry.matchReasons.some((line) =>
      matchedPersonName ? line.includes(matchedPersonName) : false,
    );
    const contextMatchPct = computeContextMatchPct(entry);
    const peoplePlacePct = computePeoplePlacePct(peopleMatch, row.placeId);
    const extraReason = entry.matchReasons.find(
      (line) => !matchedPersonName || !line.includes(matchedPersonName),
    );

    return {
      resourceId: input.resourceIdByPlaceId[row.placeId] ?? `${input.eventId}:lodging:${row.placeId}`,
      placeId: row.placeId,
      rankIndex: index,
      title: row.name,
      addressLine: row.address?.trim() || null,
      shortLabel: extractShortLabel(row.name),
      distanceM,
      priceKrw: row.priceKrw ?? null,
      score100: normalizeScore100(entry.score, maxRaw, minRaw),
      detailReasonLine: buildDetailReasonLine({
        contextMatchPct,
        peoplePlacePct,
        peopleName: matchedPersonName,
        extraReason: peoplePlacePct == null ? extraReason ?? entry.reasonKo : null,
      }),
      accent: LODGING_DISCOVERY_ACCENT_COLORS[index % LODGING_DISCOVERY_ACCENT_COLORS.length]!,
      lat: row.lat,
      lng: row.lng,
      thumbnailUrl: selectPreferredLodgingImage(row),
      navigationHref: resolveLodgingNavigationHref(row),
    };
  });

  return {
    eventId: input.eventId,
    areaLabel: resolveLodgingDiscoveryAreaLabel({
      lat: input.userLat ?? null,
      lng: input.userLng ?? null,
      eventPlace: input.eventPlace,
    }),
    radiusM: input.radiusM ?? LODGING_DISCOVERY_RADIUS_M,
    searching: input.searching ?? false,
    userLat: input.userLat ?? null,
    userLng: input.userLng ?? null,
    items,
    signalChips,
    matchedPersonName,
  };
}

export function filterLodgingRowsWithinRadius<
  TRow extends Pick<ContextLodgingInventoryRow, "lat" | "lng">,
>(input: {
  rows: readonly TRow[];
  lat: number | null;
  lng: number | null;
  radiusM: number;
}): TRow[] {
  if (input.lat == null || input.lng == null) {
    return [...input.rows];
  }
  const radiusKm = input.radiusM / 1000;
  return input.rows.filter(
    (row) => haversineKm(input.lat!, input.lng!, row.lat, row.lng) <= radiusKm,
  );
}
