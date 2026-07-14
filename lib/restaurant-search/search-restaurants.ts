import { Client, Language } from "@googlemaps/google-maps-services-js";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  isCanonicalPlaceCountryCompatible,
  type CanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { inferCountryCodeFromCoords, isCoordInKorea } from "@/lib/globe/geo-region-from-coords";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import { mixBibGourmandIntoCandidates } from "@/lib/restaurant-search/bib-gourmand";
import { fetchBibGourmandPlaces } from "@/lib/restaurant-search/fetch-bib-gourmand-places";
import { requestRestaurantSpecialness } from "@/lib/restaurant-search/request-llm-restaurant-specialness";
import type {
  RestaurantSearchCandidate,
  RestaurantSearchCandidateSource,
  RestaurantSearchCountryBias,
  RestaurantSearchInput,
  RestaurantSearchIntent,
  RestaurantSearchResult,
} from "@/lib/restaurant-search/types";

const client = new Client({});
const GOOGLE_RESTAURANT_TYPES = ["restaurant", "cafe", "meal_takeaway", "bakery"] as const;
const KR_PATTERN =
  /(서울|부산|인천|대구|광주|대전|울산|제주|성수|강남|홍대|명동|잠실|해운대|판교|한남|성심당|압구정|seoul|busan|incheon|daegu|gwangju|daejeon|ulsan|jeju|seongsu|gangnam|hongdae|myeongdong|jamsil|haeundae|pangyo|hannam|apgujeong|korea|south\s*korea)/iu;
const JP_PATTERN =
  /(오사카|교토|도쿄|난바|신주쿠|시부야|우메다|후쿠오카|삿포로|나고야|유니버설|도톤보리|긴자|osaka|kyoto|tokyo|namba|shinjuku|shibuya|umeda|fukuoka|sapporo|nagoya|universal|dotonbori|ginza|japan)/iu;
const QUIET_PATTERN = /조용|한적|차분|quiet|calm|work|작업/u;
const LIVELY_PATTERN = /활기|핫플|시끌|분위기|lively|buzz/u;
const OPEN_NOW_PATTERN = /지금\s*열|영업\s*중|open\s*now/u;
const LOCAL_PATTERN = /로컬|현지인|숨겨|골목|동네/u;
const LANDMARK_PATTERN = /인기|유명|핫플|검증|관광/u;
const EXCLUDE_PATTERN = /([가-힣A-Za-z]{2,20})\s*(?:빼고|제외|말고)/gu;
const CUISINE_PATTERN =
  /(라멘|스시|초밥|우동|이자카야|오마카세|카페|브런치|디저트|말차|녹차|아이스크림|소프트크림|젤라토|matcha|맥도날드|맥날|mcdonald|버거킹|스타벅스|한식|양식|중식|일식|해산물|고기|야키니쿠|오코노미야키|타코야키|돈카츠|규카츠|파스타|피자|치킨|국밥|분식)/u;

const SPECIALTY_DESSERT_PATTERN =
  /말차|녹차|matcha|抹茶|아이스\s*크림|아이스크림|소프트|젤라토|ice\s*cream|ソフトクリーム/iu;

const FOOD_BRAND_QUERY_PATTERN =
  /맥도날드|맥날|mcdonald|버거킹|burger\s*king|kfc|스타벅스|starbucks|롯데리아|マクドナルド/iu;

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "640",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function buildAnchoredSearchQuery(input: {
  query: string;
  anchorLabel?: string | null;
  placeProfile?: CanonicalPlaceProfile | null;
}): string {
  const query = input.query.trim();
  const profile = input.placeProfile;
  const searchLabel =
    profile?.searchHints.areaLabel?.trim() ||
    profile?.city?.trim() ||
    input.anchorLabel?.trim() ||
    profile?.label?.trim() ||
    null;
  if (!searchLabel) {
    return query;
  }
  if (KR_PATTERN.test(query) || JP_PATTERN.test(query)) {
    return query;
  }
  if (normalizeToken(query).includes(normalizeToken(searchLabel))) {
    return query;
  }
  if (
    profile?.city &&
    normalizeToken(query).includes(normalizeToken(profile.city))
  ) {
    return query;
  }
  if (
    profile?.district &&
    normalizeToken(query).includes(normalizeToken(profile.district))
  ) {
    return query;
  }
  if (
    profile?.neighborhood &&
    normalizeToken(query).includes(normalizeToken(profile.neighborhood))
  ) {
    return query;
  }
  return `${searchLabel} ${query}`.trim();
}

function isCandidateTooFar(
  candidate: RestaurantSearchCandidate,
  origin: { lat: number; lng: number } | null,
  radiusM: number,
): boolean {
  if (!origin) {
    return false;
  }
  const distanceKm = haversineKm(origin.lat, origin.lng, candidate.lat, candidate.lng);
  const radiusKm = Math.max(radiusM / 1000, 0.35);
  const maxKm = Math.max(radiusKm * 2, 0.8);
  return distanceKm > maxKm;
}

const KR_NAME_IN_JP_PATTERN =
  /(한식|곱창|국밥|삼겹|족발|망원|홍대|강남|명동|서울|부산|대전|대구|인천|제주)/u;

function isCandidateRegionMismatch(
  candidate: RestaurantSearchCandidate,
  countryBias: RestaurantSearchCountryBias,
): boolean {
  if (countryBias !== "jp") {
    return false;
  }
  const blob = [candidate.name, candidate.address, candidate.cuisineHint, candidate.categoryLabel]
    .filter(Boolean)
    .join(" ");
  return KR_NAME_IN_JP_PATTERN.test(blob);
}

function hasLocalityMatch(
  candidate: RestaurantSearchCandidate,
  placeProfile: CanonicalPlaceProfile | null | undefined,
): boolean {
  if (!placeProfile) {
    return false;
  }
  const blob = [
    candidate.name,
    candidate.address,
    candidate.cuisineHint,
    candidate.categoryLabel,
    candidate.description,
  ]
    .filter(Boolean)
    .join(" ");
  const tokens = [
    placeProfile.neighborhood,
    placeProfile.district,
    placeProfile.city,
    placeProfile.searchHints.areaLabel,
  ]
    .filter(Boolean)
    .map((value) => normalizeToken(value!));
  return tokens.some((token) => token && normalizeToken(blob).includes(token));
}

export function resolveRestaurantCountryBias(
  input: Pick<
    RestaurantSearchInput,
    "query" | "anchorLabel" | "countryBias" | "origin" | "placeProfile"
  >,
) {
  if (input.countryBias) {
    return input.countryBias;
  }
  if (
    input.placeProfile?.searchHints.countryBias &&
    input.placeProfile.searchHints.countryBias !== "global"
  ) {
    return input.placeProfile.searchHints.countryBias;
  }
  const origin = input.origin;
  if (origin) {
    const fromCoords = inferCountryCodeFromCoords(origin.lat, origin.lng);
    if (fromCoords === "JP") {
      return "jp" as const;
    }
    if (fromCoords === "KR") {
      return "kr" as const;
    }
  }
  const seed = `${input.anchorLabel ?? ""} ${input.query}`;
  if (JP_PATTERN.test(seed)) {
    return "jp" as const;
  }
  if (KR_PATTERN.test(seed)) {
    return "kr" as const;
  }
  return "global" as const;
}

export function parseRestaurantSearchIntent(query: string): RestaurantSearchIntent {
  const excludes = new Set<string>();
  for (const match of query.matchAll(EXCLUDE_PATTERN)) {
    const token = match[1]?.trim();
    if (token) {
      excludes.add(token);
    }
  }
  const cuisine = query.match(CUISINE_PATTERN)?.[1]?.trim() ?? null;
  const vibe = QUIET_PATTERN.test(query)
    ? "quiet"
    : LIVELY_PATTERN.test(query)
      ? "lively"
      : /작업|노트북/u.test(query)
        ? "work"
        : "unknown";
  const localityMode = LOCAL_PATTERN.test(query)
    ? "local"
    : LANDMARK_PATTERN.test(query)
      ? "landmark"
      : "balanced";
  return {
    query,
    cuisine,
    excludeKeywords: [...excludes],
    vibe,
    openNowOnly: OPEN_NOW_PATTERN.test(query),
    localityMode,
  };
}

function passesExcludes(candidate: RestaurantSearchCandidate, excludeKeywords: readonly string[]): boolean {
  if (excludeKeywords.length === 0) {
    return true;
  }
  const blob = [
    candidate.name,
    candidate.address,
    candidate.cuisineHint,
    candidate.categoryLabel,
    candidate.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return excludeKeywords.every((token) => !blob.includes(token.toLowerCase()));
}

function pickPreferredSource(input: {
  providerBias: CanonicalPlaceProfile["searchHints"]["providerBias"] | "global";
  countryBias: RestaurantSearchCountryBias;
}): RestaurantSearchCandidateSource | null {
  if (input.providerBias === "naver_local") {
    return "naver_local";
  }
  if (input.countryBias === "jp") {
    return "google_places";
  }
  return null;
}

function isLikelySameRestaurant(
  left: RestaurantSearchCandidate,
  right: RestaurantSearchCandidate,
): boolean {
  if (left.source === right.source && left.placeId === right.placeId) {
    return true;
  }
  if (normalizeToken(left.name) !== normalizeToken(right.name)) {
    return false;
  }
  const distanceM =
    haversineKm(left.lat, left.lng, right.lat, right.lng) * 1000;
  if (distanceM <= 160) {
    return true;
  }
  const leftAddress = normalizeToken(left.address ?? "");
  const rightAddress = normalizeToken(right.address ?? "");
  if (!leftAddress || !rightAddress) {
    return false;
  }
  return (
    distanceM <= 420 &&
    (leftAddress.includes(rightAddress) || rightAddress.includes(leftAddress))
  );
}

function scoreCandidateRichness(input: {
  candidate: RestaurantSearchCandidate;
  preferredSource: RestaurantSearchCandidateSource | null;
  origin: { lat: number; lng: number } | null;
  placeProfile: CanonicalPlaceProfile | null | undefined;
}) {
  const { candidate, preferredSource, origin, placeProfile } = input;
  let score =
    (candidate.rating ?? 0) +
    (candidate.images.length > 0 ? 2.2 : 0) +
    (candidate.address ? 0.6 : 0) +
    (candidate.openNow != null ? 0.3 : 0);
  if (preferredSource && candidate.source === preferredSource) {
    score += 1.4;
  }
  if (hasLocalityMatch(candidate, placeProfile)) {
    score += 1.2;
  }
  if (origin) {
    const distanceKm = haversineKm(origin.lat, origin.lng, candidate.lat, candidate.lng);
    if (distanceKm <= 0.35) {
      score += 1.1;
    } else if (distanceKm <= 0.8) {
      score += 0.7;
    } else if (distanceKm > 3) {
      score -= 0.8;
    }
  }
  return score;
}

function mergeCandidateImages(
  candidates: readonly RestaurantSearchCandidate[],
  preferredSource: RestaurantSearchCandidateSource | null,
): string[] {
  const ordered = [...candidates].sort((left, right) => {
    const leftPreferred = preferredSource != null && left.source === preferredSource ? 1 : 0;
    const rightPreferred = preferredSource != null && right.source === preferredSource ? 1 : 0;
    return rightPreferred - leftPreferred;
  });
  const urls: string[] = [];
  for (const candidate of ordered) {
    for (const image of candidate.images) {
      if (!urls.includes(image)) {
        urls.push(image);
      }
    }
  }
  return urls;
}

function mergeDuplicateCandidate(input: {
  existing: RestaurantSearchCandidate;
  incoming: RestaurantSearchCandidate;
  preferredSource: RestaurantSearchCandidateSource | null;
  origin: { lat: number; lng: number } | null;
  placeProfile: CanonicalPlaceProfile | null | undefined;
}): RestaurantSearchCandidate {
  const { existing, incoming, preferredSource, origin, placeProfile } = input;
  const existingScore = scoreCandidateRichness({
    candidate: existing,
    preferredSource,
    origin,
    placeProfile,
  });
  const incomingScore = scoreCandidateRichness({
    candidate: incoming,
    preferredSource,
    origin,
    placeProfile,
  });
  const primary = incomingScore > existingScore ? incoming : existing;
  const secondary = primary === existing ? incoming : existing;
  const images = mergeCandidateImages([primary, secondary], preferredSource);
  return {
    ...primary,
    images,
    address: primary.address ?? secondary.address,
    mapsUrl: primary.mapsUrl ?? secondary.mapsUrl,
    phone: primary.phone ?? secondary.phone,
    cuisineHint: primary.cuisineHint ?? secondary.cuisineHint,
    categoryLabel: primary.categoryLabel ?? secondary.categoryLabel,
    description: primary.description ?? secondary.description,
    rating: primary.rating ?? secondary.rating,
    openNow: primary.openNow ?? secondary.openNow,
    priceLevel: primary.priceLevel ?? secondary.priceLevel,
  };
}

function dedupeCandidates(input: {
  candidates: readonly RestaurantSearchCandidate[];
  preferredSource: RestaurantSearchCandidateSource | null;
  origin: { lat: number; lng: number } | null;
  placeProfile: CanonicalPlaceProfile | null | undefined;
}) {
  const next: RestaurantSearchCandidate[] = [];
  for (const candidate of input.candidates) {
    const existingIndex = next.findIndex((row) =>
      isLikelySameRestaurant(row, candidate),
    );
    if (existingIndex < 0) {
      next.push(candidate);
      continue;
    }
    next[existingIndex] = mergeDuplicateCandidate({
      existing: next[existingIndex]!,
      incoming: candidate,
      preferredSource: input.preferredSource,
      origin: input.origin,
      placeProfile: input.placeProfile,
    });
  }
  return next;
}

function scoreCandidate(input: {
  candidate: RestaurantSearchCandidate;
  intent: RestaurantSearchIntent;
  countryBias: RestaurantSearchCountryBias;
  origin: { lat: number; lng: number } | null;
  placeProfile: CanonicalPlaceProfile | null | undefined;
}) {
  const { candidate, intent, countryBias, origin, placeProfile } = input;
  let score = 50;
  if (candidate.rating != null) {
    score += Math.round(candidate.rating * 8);
  }
  if (candidate.openNow) {
    score += 14;
  }
  if (intent.openNowOnly && candidate.openNow === false) {
    score -= 35;
  }
  if (intent.vibe !== "unknown") {
    const blob = [candidate.name, candidate.description, candidate.categoryLabel].filter(Boolean).join(" ");
    if (intent.vibe === "quiet" && /조용|한적|차분|quiet/u.test(blob)) {
      score += 16;
    }
    if (intent.vibe === "lively" && /핫플|활기|바|이자카야|lively/u.test(blob)) {
      score += 16;
    }
    if (intent.vibe === "work" && /작업|노트북|스터디|work/u.test(blob)) {
      score += 16;
    }
  }
  if (intent.cuisine) {
    const blob = [candidate.name, candidate.cuisineHint, candidate.categoryLabel].filter(Boolean).join(" ");
    if (blob.toLowerCase().includes(intent.cuisine.toLowerCase())) {
      score += 18;
    }
  }
  if (intent.localityMode === "local") {
    if (candidate.source === "naver_local") {
      score += 16;
    }
  } else if (intent.localityMode === "landmark") {
    if ((candidate.rating ?? 0) >= 4.4) {
      score += 10;
    }
  }
  if (countryBias === "kr" && candidate.source === "naver_local") {
    score += 12;
  }
  if (countryBias === "jp" && candidate.source === "google_places") {
    score += 12;
  }
  if (hasLocalityMatch(candidate, placeProfile)) {
    score += 14;
  }
  if (!isCanonicalPlaceCountryCompatible(placeProfile, candidate.address ?? candidate.name)) {
    score -= 120;
  }
  if (origin) {
    const distanceKm = haversineKm(origin.lat, origin.lng, candidate.lat, candidate.lng);
    if (distanceKm <= 0.5) {
      score += 30;
    } else if (distanceKm <= 1.5) {
      score += 20;
    } else if (distanceKm <= 4) {
      score += 8;
    } else if (distanceKm > 12) {
      score -= 22;
    }
  }
  return score;
}

async function searchNaverLocal(input: {
  query: string;
  maxResults: number;
}): Promise<RestaurantSearchCandidate[]> {
  if (!isNaverSearchConfigured()) {
    return [];
  }
  try {
    const hits = await fetchNaverLocalPlaceCandidates({
      query: input.query,
      display: Math.max(6, input.maxResults * 2),
    });
    return hits.map((hit) => ({
      source: "naver_local" as const,
      sourceLabel: "Naver Local",
      placeId: hit.place_id,
      name: hit.name,
      address: hit.address ?? null,
      lat: hit.lat,
      lng: hit.lng,
      rating: hit.rating > 0 ? hit.rating : null,
      openNow: hit.open_now,
      phone: hit.phone ?? null,
      mapsUrl: hit.maps_url ?? null,
      images: hit.photo_urls?.length ? hit.photo_urls : hit.thumbnail_url ? [hit.thumbnail_url] : [],
      cuisineHint: hit.description ?? null,
      categoryLabel: hit.naver_category ?? null,
      description: hit.description ?? null,
      virtualCandidate: true,
    }));
  } catch {
    return [];
  }
}

async function searchGoogleTextQuery(input: {
  query: string;
  origin: { lat: number; lng: number };
  maxResults: number;
  radiusM: number;
  language: Language;
}): Promise<RestaurantSearchCandidate[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }
  try {
    const response = await client.textSearch({
      params: {
        query: input.query,
        location: input.origin,
        radius: Math.min(Math.max(input.radiusM, 2500), 25000),
        language: input.language,
        key,
      },
    });
    const rows: RestaurantSearchCandidate[] = [];
    for (const result of response.data.results ?? []) {
      const placeId = result.place_id?.trim();
      const name = result.name?.trim();
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;
      if (!placeId || !name || typeof lat !== "number" || typeof lng !== "number") {
        continue;
      }
      const photoReference = result.photos?.[0]?.photo_reference;
      rows.push({
        source: "google_places",
        sourceLabel: "Google Places",
        placeId,
        name,
        address: result.formatted_address ?? result.vicinity ?? null,
        lat,
        lng,
        rating: typeof result.rating === "number" ? result.rating : null,
        openNow:
          typeof result.opening_hours?.open_now === "boolean"
            ? result.opening_hours.open_now
            : null,
        phone: null,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        images: photoReference ? [buildPlacePhotoUrl(photoReference, key)] : [],
        cuisineHint: null,
        priceLevel:
          typeof result.price_level === "number" ? result.price_level : null,
        categoryLabel: null,
        description: null,
      });
      if (rows.length >= input.maxResults) {
        break;
      }
    }
    return rows;
  } catch {
    return [];
  }
}

async function searchGooglePlaces(input: {
  query: string;
  origin: { lat: number; lng: number };
  maxResults: number;
  radiusM: number;
  openNowOnly: boolean;
  language: Language;
  countryBias: RestaurantSearchCountryBias;
  intent: RestaurantSearchIntent;
}): Promise<RestaurantSearchCandidate[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }
  const byPlaceId = new Map<string, RestaurantSearchCandidate>();
  const nearbyKeyword =
    input.countryBias === "kr"
      ? input.query
      : input.query.trim() || input.intent.cuisine?.trim() || undefined;
  const specialtyDessert = SPECIALTY_DESSERT_PATTERN.test(input.query);
  const foodBrand = FOOD_BRAND_QUERY_PATTERN.test(input.query);
  const placeTypes =
    specialtyDessert || foodBrand
      ? (["cafe", "restaurant"] as const)
      : GOOGLE_RESTAURANT_TYPES;

  for (const type of placeTypes) {
    try {
      const response = await client.placesNearby({
        params: {
          location: input.origin,
          radius: input.radiusM,
          type,
          language: input.language,
          ...(nearbyKeyword ? { keyword: nearbyKeyword } : {}),
          opennow: input.openNowOnly,
          key,
        },
      });
      for (const result of response.data.results ?? []) {
        const placeId = result.place_id?.trim();
        const name = result.name?.trim();
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        if (!placeId || !name || typeof lat !== "number" || typeof lng !== "number") {
          continue;
        }
        const photoReference = result.photos?.[0]?.photo_reference;
        const images = photoReference ? [buildPlacePhotoUrl(photoReference, key)] : [];
        byPlaceId.set(placeId, {
          source: "google_places",
          sourceLabel: "Google Places",
          placeId,
          name,
          address: result.vicinity ?? null,
          lat,
          lng,
          rating: typeof result.rating === "number" ? result.rating : null,
          openNow:
            typeof result.opening_hours?.open_now === "boolean"
              ? result.opening_hours.open_now
              : null,
          phone: null,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          images,
          cuisineHint: type === "cafe" ? "카페" : null,
          priceLevel:
            typeof result.price_level === "number" ? result.price_level : null,
          categoryLabel: type,
          description: result.types?.slice(0, 3).join(" · ") ?? null,
          virtualCandidate: true,
        });
      }
    } catch {
      // try next nearby type
    }
  }

  return [...byPlaceId.values()]
    .sort(
      (left, right) =>
        haversineKm(input.origin.lat, input.origin.lng, left.lat, left.lng) -
        haversineKm(input.origin.lat, input.origin.lng, right.lat, right.lng),
    )
    .slice(0, Math.max(input.maxResults * 2, 10));
}

function buildFallbackQuestion(input: {
  countryBias: RestaurantSearchCountryBias;
  origin: { lat: number; lng: number } | null;
  intent: RestaurantSearchIntent;
  placeProfile?: CanonicalPlaceProfile | null;
}) {
  if (!input.origin) {
    if (input.countryBias === "jp") {
      const area = input.placeProfile?.city ?? input.placeProfile?.label ?? "오사카";
      return `${area}에서 어느 동네 기준으로 찾을까요? 예: 난바 · 우메다`;
    }
    return input.placeProfile?.searchHints.areaLabel
      ? `${input.placeProfile.searchHints.areaLabel} 기준으로 어느 동네가 좋아요?`
      : "어느 동네 기준으로 찾을까요? 예: 성수 · 강남역";
  }
  if (!input.intent.cuisine && input.intent.localityMode === "balanced") {
    return "로컬한 곳, 검증된 인기, 조용한 곳 중 어떤 느낌이 좋아요?";
  }
  return null;
}

export async function searchRestaurants(
  input: RestaurantSearchInput,
): Promise<RestaurantSearchResult> {
  const query = input.query.trim();
  const intent = parseRestaurantSearchIntent(query);
  const countryBias = resolveRestaurantCountryBias(input);
  const maxResults = input.maxResults ?? 5;
  const radiusM = input.radiusM ?? 2800;
  const origin = input.origin;
  const placeProfile = input.placeProfile ?? null;
  const language =
    countryBias === "jp"
      ? Language.ja
      : countryBias === "kr"
        ? Language.ko
        : Language.en;
  const providerQuery = buildAnchoredSearchQuery({
    query,
    anchorLabel: input.anchorLabel,
    placeProfile,
  });
  const naverQuery = providerQuery;
  const providerBias = placeProfile?.searchHints.providerBias ?? "global";
  const preferredSource = pickPreferredSource({ providerBias, countryBias });
  const originInKorea = origin ? isCoordInKorea(origin.lat, origin.lng) : false;
  const shouldUseNaver =
    countryBias === "kr" &&
    originInKorea &&
    (providerBias === "naver_local" || providerBias === "global");

  const specialtyDessertQuery = SPECIALTY_DESSERT_PATTERN.test(providerQuery);
  const foodBrandQuery = FOOD_BRAND_QUERY_PATTERN.test(providerQuery);
  const preferTextSearch = specialtyDessertQuery || foodBrandQuery;
  const [naverCandidates, googleCandidates, bibCandidates, textCandidates] =
    await Promise.all([
    shouldUseNaver ? searchNaverLocal({
      query: naverQuery,
      maxResults,
    }) : Promise.resolve<RestaurantSearchCandidate[]>([]),
    origin
      ? searchGooglePlaces({
          query: providerQuery,
          origin,
          maxResults,
          radiusM,
          openNowOnly: intent.openNowOnly,
          language,
          countryBias,
          intent,
        })
      : Promise.resolve<RestaurantSearchCandidate[]>([]),
    origin && !preferTextSearch
      ? fetchBibGourmandPlaces({
          origin,
          countryBias,
          areaLabel:
            placeProfile?.searchHints.areaLabel ??
            placeProfile?.city ??
            input.anchorLabel ??
            null,
          radiusM: Math.max(radiusM, 8000),
          maxResults: 4,
          language,
        })
      : Promise.resolve<RestaurantSearchCandidate[]>([]),
    origin && preferTextSearch
      ? searchGoogleTextQuery({
          query: providerQuery,
          origin,
          maxResults: Math.max(maxResults, 8),
          radiusM: Math.max(radiusM, 8000),
          language,
        })
      : Promise.resolve<RestaurantSearchCandidate[]>([]),
  ]);

  let candidates = dedupeCandidates({
    candidates: [...textCandidates, ...naverCandidates, ...googleCandidates],
    preferredSource,
    origin,
    placeProfile,
  }).filter((candidate) => passesExcludes(candidate, intent.excludeKeywords));
  candidates = candidates.filter((candidate) => {
    if (!isCanonicalPlaceCountryCompatible(placeProfile, candidate.address ?? candidate.name)) {
      return false;
    }
    if (isCandidateRegionMismatch(candidate, countryBias)) {
      return false;
    }
    if (isCandidateTooFar(candidate, origin, radiusM)) {
      return false;
    }
    return true;
  });
  if (intent.openNowOnly) {
    candidates = candidates.filter((candidate) => candidate.openNow !== false);
  }

  const bibInRadius = bibCandidates.filter((candidate) => {
    if (!passesExcludes(candidate, intent.excludeKeywords)) {
      return false;
    }
    if (!isCanonicalPlaceCountryCompatible(placeProfile, candidate.address ?? candidate.name)) {
      return false;
    }
    if (isCandidateRegionMismatch(candidate, countryBias)) {
      return false;
    }
    // Bib density is sparse — allow a wider band than the local nearby radius.
    if (isCandidateTooFar(candidate, origin, Math.max(radiusM, 12000))) {
      return false;
    }
    if (intent.openNowOnly && candidate.openNow === false) {
      return false;
    }
    return true;
  });

  candidates = candidates
    .map((candidate) => ({
      ...candidate,
      searchScore: scoreCandidate({
        candidate,
        intent,
        countryBias,
        origin,
        placeProfile,
      }),
    }))
    .sort(
      (left, right) =>
        (right.searchScore ?? 0) - (left.searchScore ?? 0) ||
        left.name.localeCompare(right.name, "ko"),
    )
    .slice(0, Math.max(maxResults, 6));

  const specialness = await requestRestaurantSpecialness({
    query,
    intent,
    countryBias,
    candidates,
  });

  candidates = candidates
    .map((candidate) => {
      const special = specialness.get(candidate.placeId);
      const boost = special?.boost ?? 0;
      return {
        ...candidate,
        specialReasonKo: special?.specialReasonKo ?? candidate.specialReasonKo ?? null,
        specialScore: boost,
        searchScore: (candidate.searchScore ?? 0) + boost,
      };
    })
    .sort(
      (left, right) =>
        (right.searchScore ?? 0) - (left.searchScore ?? 0) ||
        left.name.localeCompare(right.name, "ko"),
    );

  candidates = mixBibGourmandIntoCandidates({
    ranked: candidates,
    bibHits: bibInRadius,
    maxResults,
  });

  const providerBreakdown: RestaurantSearchResult["providerBreakdown"] = {};
  for (const candidate of candidates) {
    providerBreakdown[candidate.source] =
      (providerBreakdown[candidate.source] ?? 0) + 1;
  }

  return {
    intent,
    countryBias,
    candidates,
    providerBreakdown,
    followupQuestionKo: candidates.length === 0
      ? buildFallbackQuestion({ countryBias, origin, intent, placeProfile })
      : buildFallbackQuestion({
          countryBias,
          origin: null,
          intent,
          placeProfile,
        }),
  };
}
