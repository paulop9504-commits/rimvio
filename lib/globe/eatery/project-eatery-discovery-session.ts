import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import { copy } from "@/lib/copy/human-ko";
import {
  LODGING_DISCOVERY_ACCENT_COLORS,
  LODGING_DISCOVERY_RADIUS_M,
  type LodgingDiscoveryAccent,
} from "@/lib/globe/lodging/lodging-discovery-constants";
import type { ScoredEateryRecommendation } from "@/lib/globe/eatery/score-eatery-recommendations";
import { resolveLodgingDiscoveryAreaLabel } from "@/lib/globe/lodging/project-lodging-discovery-session";

export type GlobeEateryDiscoveryCard = {
  resourceId: string;
  placeId: string;
  rankIndex: number;
  title: string;
  shortLabel: string;
  providerLabel: string | null;
  distanceM: number | null;
  priceLabel: string | null;
  score100: number;
  detailReasonLine: string;
  accent: LodgingDiscoveryAccent;
  lat: number;
  lng: number;
  thumbnailUrl: string | null;
};

export type GlobeEateryDiscoverySession = {
  eventId: string;
  areaLabel: string;
  radiusM: number;
  searching: boolean;
  userLat: number | null;
  userLng: number | null;
  items: GlobeEateryDiscoveryCard[];
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

function normalizeScore100(raw: number, maxRaw: number, minRaw: number): number {
  if (maxRaw <= minRaw) {
    return 88;
  }
  const ratio = (raw - minRaw) / (maxRaw - minRaw);
  return Math.min(99, Math.max(68, Math.round(68 + ratio * 31)));
}

function formatPriceLevel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const level = Math.min(4, Math.max(1, Math.round(value)));
  return "₩".repeat(level);
}

function buildDetailReasonLine(input: {
  contextMatchPct: number;
  peoplePlacePct: number | null;
  peopleName: string | null;
  extraReason?: string | null;
}): string {
  const parts: string[] = [copy.globe.eateryDiscoveryContextMatch(input.contextMatchPct)];
  if (input.peoplePlacePct != null && input.peopleName) {
    parts.push(copy.globe.eateryDiscoveryPeoplePlace(input.peopleName, input.peoplePlacePct));
  } else if (input.extraReason?.trim()) {
    parts.push(input.extraReason.trim());
  }
  return parts.join(" · ");
}

function computeContextMatchPct(entry: ScoredEateryRecommendation): number {
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

export function projectEateryDiscoverySession(input: {
  eventId: string;
  scored: readonly ScoredEateryRecommendation[];
  unifiedContext: UnifiedExperienceContext;
  userLat?: number | null;
  userLng?: number | null;
  eventPlace?: string | null;
  searching?: boolean;
  radiusM?: number;
  resourceIdByPlaceId: Readonly<Record<string, string>>;
}): GlobeEateryDiscoverySession | null {
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

  const signalChips: string[] = [copy.globe.eateryDiscoveryChipLocation];
  signalChips.push(
    input.searching
      ? copy.globe.eateryDiscoveryChipSearching
      : copy.globe.eateryDiscoveryChipReady,
  );
  if (matchedPersonName) {
    signalChips.push(copy.globe.eateryDiscoveryChipPerson(matchedPersonName));
  }
  signalChips.push(copy.globe.eateryDiscoveryChipMemory);
  signalChips.push(copy.globe.eateryDiscoveryChipTaste);

  const items: GlobeEateryDiscoveryCard[] = input.scored.map((entry, index) => {
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
      resourceId: input.resourceIdByPlaceId[row.placeId] ?? `${input.eventId}:eatery:${row.placeId}`,
      placeId: row.placeId,
      rankIndex: index,
      title: row.name,
      shortLabel: extractShortLabel(row.name),
      providerLabel: row.providerLabel?.trim() || null,
      distanceM,
      priceLabel: row.cuisineHint?.trim() || formatPriceLevel(row.priceLevel),
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
      thumbnailUrl: row.images[0] ?? null,
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
