import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { matchKoreaKnownNeighborhood } from "@/lib/globe/korea-known-neighborhoods";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";
import { type CountryCode, isCountryCode } from "@/lib/links/spark-locale";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveRegionalProfile } from "@/lib/preferences/regional-profile";

export type CanonicalPlaceCountryBias = "kr" | "jp" | "global";
export type CanonicalPlaceProviderBias = "naver_local" | "google_places" | "global";

export type CanonicalPlaceAnchorSource =
  | "explicit_destination"
  | "manual_geocode"
  | "known_place"
  | "gps_live"
  | "gps_dwell"
  | "event_pin"
  | "legacy_globe_place"
  | "fallback";

export type CanonicalPlaceProfile = {
  lat: number;
  lng: number;
  label: string;
  formattedAddress: string | null;
  countryCode: CountryCode | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  timezone: string | null;
  anchorSource: CanonicalPlaceAnchorSource;
  confidence: number;
  searchHints: {
    countryBias: CanonicalPlaceCountryBias;
    providerBias: CanonicalPlaceProviderBias;
    searchLocale: string;
    areaLabel: string;
    localityQuery: string;
  };
};

type CanonicalPlaceBuildInput = {
  lat: number;
  lng: number;
  label: string;
  formattedAddress?: string | null;
  anchorSource: CanonicalPlaceAnchorSource;
  confidence?: number;
};

const PROFILE_META_KEY = "globePlaceProfile";

const COUNTRY_LABELS: Record<CountryCode, string> = {
  KR: "대한민국",
  US: "미국",
  PH: "필리핀",
  JP: "일본",
  TH: "태국",
  VN: "베트남",
  TW: "대만",
  SG: "싱가포르",
  ID: "인도네시아",
  AU: "호주",
  GB: "영국",
  FR: "프랑스",
  IT: "이탈리아",
  ES: "스페인",
  DE: "독일",
  CN: "중국",
};

const COUNTRY_PATTERNS: ReadonlyArray<{
  code: CountryCode;
  pattern: RegExp;
}> = [
  { code: "JP", pattern: /japan|osaka|tokyo|kyoto|namba|umeda|shinjuku|shibuya|도쿄|오사카|교토|난바|우메다|일본/iu },
  { code: "KR", pattern: /south\s*korea|korea(?!n barbecue)|seoul|busan|incheon|daejeon|daegu|ulsan|jeju|서울|부산|인천|대전|대구|울산|제주|대한민국|한국/iu },
  { code: "US", pattern: /united\s*states|america|usa|new york|los angeles|hawaii|미국/iu },
  { code: "CN", pattern: /china|beijing|shanghai|hong\s*kong|중국|베이징|상하이|홍콩/iu },
  { code: "TH", pattern: /thailand|bangkok|phuket|태국|방콕|푸켓/iu },
  { code: "VN", pattern: /vietnam|hanoi|ho chi minh|danang|베트남|하노이|호치민|다낭/iu },
  { code: "PH", pattern: /philippines|manila|cebu|보라카이|필리핀|마닐라|세부/iu },
  { code: "TW", pattern: /taiwan|taipei|대만|타이페이/iu },
  { code: "SG", pattern: /singapore|싱가포르/iu },
  { code: "ID", pattern: /indonesia|jakarta|bali|인도네시아|자카르타|발리/iu },
  { code: "AU", pattern: /australia|sydney|melbourne|호주|시드니|멜버른/iu },
  { code: "GB", pattern: /united\s*kingdom|england|london|영국|런던/iu },
  { code: "FR", pattern: /france|paris|프랑스|파리/iu },
  { code: "IT", pattern: /italy|rome|milan|이탈리아|로마|밀라노/iu },
  { code: "ES", pattern: /spain|barcelona|madrid|스페인|바르셀로나|마드리드/iu },
  { code: "DE", pattern: /germany|berlin|munich|독일|베를린|뮌헨/iu },
];

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function clampConfidence(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0.7;
  }
  return Math.max(0, Math.min(1, value));
}

function detectCountryCodeFromText(text: string): CountryCode | null {
  const hay = normalizeText(text);
  if (!hay) {
    return null;
  }
  for (const { code, pattern } of COUNTRY_PATTERNS) {
    if (pattern.test(hay)) {
      return code;
    }
  }
  return null;
}

function parseKoreanSemanticLabel(label: string): {
  region: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
} | null {
  const hood = matchKoreaKnownNeighborhood(label);
  if (hood) {
    const parts = hood.label.trim().split(/\s+/u);
    return {
      region: parts[0] ?? null,
      city: parts[0] ?? null,
      district: parts[1] ? `${parts[1]}구` : null,
      neighborhood: parts[2] ?? null,
    };
  }

  const metro = matchKoreaMetroDistrict(label);
  if (metro) {
    return {
      region: metro.city,
      city: metro.city,
      district: metro.district,
      neighborhood: null,
    };
  }

  const known = matchKoreaKnownPlace(label);
  if (!known) {
    return null;
  }

  const parts = known.label.trim().split(/\s+/u);
  return {
    region: parts[0] ?? null,
    city: parts[0] ?? null,
    district: parts[1]?.endsWith("구") ? parts[1] : null,
    neighborhood:
      parts[1] && !parts[1].endsWith("구")
        ? parts[1]
        : parts[2] ?? null,
  };
}

function parseInternationalAddress(input: {
  label: string;
  formattedAddress: string | null;
  countryCode: CountryCode | null;
  city: string | null;
}): { district: string | null; neighborhood: string | null } {
  const formattedParts = normalizeText(input.formattedAddress)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (formattedParts.length === 0) {
    return { district: null, neighborhood: null };
  }

  const tailCountry = formattedParts.at(-1) ?? null;
  const detectedTailCountry = tailCountry ? detectCountryCodeFromText(tailCountry) : null;
  const hasTailCountry =
    detectedTailCountry != null &&
    (input.countryCode == null || detectedTailCountry === input.countryCode);

  const cityMatch = classifyOverseasManualPlace(
    `${input.formattedAddress ?? ""} ${input.label}`,
  );
  const cityLabel = cityMatch?.kind === "city" ? cityMatch.label : input.city;

  const usable = hasTailCountry ? formattedParts.slice(0, -1) : formattedParts;
  if (usable.length === 0) {
    return { district: null, neighborhood: null };
  }

  const cityIndex = cityLabel
    ? usable.findIndex((part) => classifyOverseasManualPlace(part)?.label === cityLabel)
    : -1;

  const district =
    cityIndex > 0
      ? usable[cityIndex - 1] ?? null
      : usable.length >= 2
        ? usable.at(-2) ?? null
        : null;

  const neighborhood =
    cityIndex > 1
      ? usable[cityIndex - 2] ?? null
      : usable.length >= 3
        ? usable.at(-3) ?? null
        : usable.length === 2 && cityIndex < 0
          ? usable[0] ?? null
          : null;

  return {
    district: district && district !== neighborhood ? district : null,
    neighborhood: neighborhood ?? null,
  };
}

function resolveCountryName(code: CountryCode | null, fallback: string | null): string | null {
  if (code && COUNTRY_LABELS[code]) {
    return COUNTRY_LABELS[code];
  }
  return fallback;
}

function resolveSearchHints(input: {
  label: string;
  countryCode: CountryCode | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
}): CanonicalPlaceProfile["searchHints"] {
  const countryCode = input.countryCode;
  const regional = resolveRegionalProfile(countryCode ?? "KR");
  const areaLabel =
    input.neighborhood ??
    input.district ??
    input.city ??
    input.label;
  const localityQuery = [
    input.neighborhood,
    input.district,
    input.city,
    areaLabel !== input.label ? input.label : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    countryBias:
      countryCode === "KR" ? "kr" : countryCode === "JP" ? "jp" : "global",
    providerBias:
      countryCode === "KR"
        ? "naver_local"
        : countryCode != null
          ? "google_places"
          : "global",
    searchLocale: regional.numberLocale,
    areaLabel,
    localityQuery: localityQuery || input.label,
  };
}

export function buildCanonicalPlaceProfile(
  input: CanonicalPlaceBuildInput,
): CanonicalPlaceProfile {
  const label = normalizePlaceLabel(input.label) || normalizeText(input.label);
  const formattedAddress = normalizeText(input.formattedAddress) || null;
  const semanticSeed = `${label} ${formattedAddress ?? ""}`.trim();

  let countryCode = detectCountryCodeFromText(semanticSeed);
  let countryName: string | null = null;
  let region: string | null = null;
  let city: string | null = null;
  let district: string | null = null;
  let neighborhood: string | null = null;

  const korea = parseKoreanSemanticLabel(semanticSeed);
  if (korea) {
    countryCode = "KR";
    countryName = COUNTRY_LABELS.KR;
    region = korea.region;
    city = korea.city;
    district = korea.district;
    neighborhood = korea.neighborhood;
  } else {
    const overseas = classifyOverseasManualPlace(semanticSeed);
    if (overseas) {
      countryCode =
        detectCountryCodeFromText(`${overseas.countryLabel} ${overseas.label}`) ??
        countryCode;
      countryName = overseas.countryLabel;
      city = overseas.kind === "city" ? overseas.label : null;
    }
  }

  if (formattedAddress && (countryCode != null || city != null)) {
    const parsed = parseInternationalAddress({
      label,
      formattedAddress,
      countryCode,
      city,
    });
    district = district ?? parsed.district;
    neighborhood = neighborhood ?? parsed.neighborhood;
  }

  countryName = resolveCountryName(countryCode, countryName);
  region = region ?? city ?? countryName;

  const timezone =
    countryCode != null ? resolveRegionalProfile(countryCode).timeZone : null;

  return {
    lat: input.lat,
    lng: input.lng,
    label,
    formattedAddress,
    countryCode,
    countryName,
    region,
    city,
    district,
    neighborhood,
    timezone,
    anchorSource: input.anchorSource,
    confidence: clampConfidence(input.confidence),
    searchHints: resolveSearchHints({
      label,
      countryCode,
      city,
      district,
      neighborhood,
    }),
  };
}

function readProfileObject(value: unknown): CanonicalPlaceProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const lat = row.lat;
  const lng = row.lng;
  const label = normalizeText(typeof row.label === "string" ? row.label : "");
  const anchorSource = row.anchorSource;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng) || !label || typeof anchorSource !== "string") {
    return null;
  }
  const formattedAddress =
    typeof row.formattedAddress === "string" ? row.formattedAddress : null;
  const confidence =
    typeof row.confidence === "number" ? row.confidence : undefined;
  const source = anchorSource as CanonicalPlaceAnchorSource;
  return buildCanonicalPlaceProfile({
    lat,
    lng,
    label,
    formattedAddress,
    anchorSource: source,
    confidence,
  });
}

export function stampCanonicalPlaceProfile(
  metadata: Record<string, unknown> | undefined,
  profile: CanonicalPlaceProfile,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [PROFILE_META_KEY]: profile,
  };
}

export function readCanonicalPlaceProfileFromEvent(
  event: EventCandidate,
): CanonicalPlaceProfile | null {
  const meta = event.metadata ?? {};
  const stored = readProfileObject(meta[PROFILE_META_KEY]);
  if (stored) {
    return stored;
  }

  const confirmedLat = isFiniteCoord(meta.globePlaceLat) ? meta.globePlaceLat : null;
  const confirmedLng = isFiniteCoord(meta.globePlaceLng) ? meta.globePlaceLng : null;
  const confirmedLabel =
    normalizeText(typeof meta.globePlaceLabel === "string" ? meta.globePlaceLabel : "") ||
    normalizeText(event.place) ||
    normalizeText(event.title);

  if (
    meta.globePlaceConfirmed === true &&
    confirmedLat != null &&
    confirmedLng != null &&
    confirmedLabel
  ) {
    return buildCanonicalPlaceProfile({
      lat: confirmedLat,
      lng: confirmedLng,
      label: confirmedLabel,
      anchorSource: "legacy_globe_place",
      confidence: 0.92,
    });
  }

  const dwellLat = isFiniteCoord(meta.gpsDwellLat) ? meta.gpsDwellLat : null;
  const dwellLng = isFiniteCoord(meta.gpsDwellLng) ? meta.gpsDwellLng : null;
  const dwellLabel =
    normalizeText(
      typeof meta.gpsDwellPlaceLabel === "string" ? meta.gpsDwellPlaceLabel : "",
    ) || confirmedLabel;
  if (dwellLat != null && dwellLng != null && dwellLabel) {
    return buildCanonicalPlaceProfile({
      lat: dwellLat,
      lng: dwellLng,
      label: dwellLabel,
      anchorSource: "gps_dwell",
      confidence: 0.55,
    });
  }

  const plan = readPlanContextFromEvent(event);
  const fallbackLabel =
    normalizeText(plan?.place) ||
    normalizeText(event.place) ||
    normalizeText(event.title);
  if (!fallbackLabel) {
    return null;
  }

  const fallback = resolvePlaceCoordinates(fallbackLabel);
  return buildCanonicalPlaceProfile({
    lat: fallback.lat,
    lng: fallback.lng,
    label: fallback.label || fallbackLabel,
    anchorSource: "fallback",
    confidence: 0.65,
  });
}

export function serializeCanonicalPlaceProfile(
  profile: CanonicalPlaceProfile | null | undefined,
): string | null {
  if (!profile) {
    return null;
  }
  return JSON.stringify(profile);
}

export function parseCanonicalPlaceProfile(
  value: string | null | undefined,
): CanonicalPlaceProfile | null {
  const raw = normalizeText(value);
  if (!raw) {
    return null;
  }
  try {
    return readProfileObject(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function resolveCanonicalPlaceAreaLabel(
  profile: CanonicalPlaceProfile | null | undefined,
): string | null {
  if (!profile) {
    return null;
  }
  return profile.searchHints.areaLabel || profile.label;
}

export function detectCountryCodeInPlaceText(text: string): CountryCode | null {
  return detectCountryCodeFromText(text);
}

export function isCanonicalPlaceCountryCompatible(
  profile: CanonicalPlaceProfile | null | undefined,
  text: string | null | undefined,
): boolean {
  if (!profile?.countryCode) {
    return true;
  }
  const candidateCountry = detectCountryCodeFromText(normalizeText(text));
  if (!candidateCountry) {
    return true;
  }
  return candidateCountry === profile.countryCode;
}

export function readCountryCode(value: unknown): CountryCode | null {
  return typeof value === "string" && isCountryCode(value) ? value : null;
}
