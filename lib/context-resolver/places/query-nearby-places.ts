import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { isCoordInKorea } from "@/lib/ontology/geo-region-from-coords";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import {
  DEFAULT_MIN_PLACE_REVIEW_COUNT,
  filterByMinReviewCountProgressive,
  passesMinReviewCountGate,
  readGoogleUserRatingsTotal,
} from "@/lib/places/min-review-count-gate";
import type { PlaceCandidate, PlaceDiscoveryCriteria } from "@/lib/context-resolver/places/types";

const client = new Client({});

/** Demo placeholder ids — never mix into overseas discovery feeds. */
export function isMockPlaceCandidateId(placeId: string): boolean {
  return placeId.startsWith("mock-");
}

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "800",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

/** Korea-only demo activities — overseas must stay empty (Google is SSOT abroad). */
function mockActivityCandidates(input: {
  lat: number;
  lng: number;
}): PlaceCandidate[] {
  if (!isCoordInKorea(input.lat, input.lng)) {
    return [];
  }
  return [
    {
      place_id: "mock-park",
      name: "근처 공원 산책로",
      address: "현재 위치 도보 10분",
      lat: input.lat + 0.002,
      lng: input.lng + 0.001,
      rating: 4.5,
      open_now: true,
      vibes: ["unknown"],
      phone: null,
      maps_url: null,
      google_types: ["park", "tourist_attraction"],
    },
    {
      place_id: "mock-attraction",
      name: "근처 관광명소",
      address: "현재 위치 도보 15분",
      lat: input.lat + 0.003,
      lng: input.lng - 0.0015,
      rating: 4.4,
      open_now: true,
      vibes: ["unknown"],
      phone: null,
      maps_url: null,
      google_types: ["tourist_attraction", "point_of_interest"],
    },
    {
      place_id: "mock-museum",
      name: "지역 박물관",
      address: "현재 위치 도보 20분",
      lat: input.lat - 0.002,
      lng: input.lng + 0.002,
      rating: 4.2,
      open_now: true,
      vibes: ["unknown"],
      phone: null,
      maps_url: null,
      google_types: ["museum", "point_of_interest"],
    },
  ];
}

function resolveGooglePlacesKeyword(criteria: PlaceDiscoveryCriteria): string | undefined {
  const query = criteria.query.trim();
  if (!query) {
    return undefined;
  }
  if (criteria.category === "activity") {
    const stripped = query
      .replace(/놀거리|놀\s*거리|즐길\s*거리/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    return stripped || "관광명소";
  }
  return query;
}

function mockCandidates(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): PlaceCandidate[] {
  if (!isCoordInKorea(input.lat, input.lng)) {
    return [];
  }
  const quiet = input.criteria.vibe === "quiet";
  const base: PlaceCandidate[] = [
    {
      place_id: "mock-cafe-a",
      name: quiet ? "카페 무드 (조용함)" : "카페 무드",
      address: "현재 위치 도보 5분",
      lat: input.lat + 0.0012,
      lng: input.lng + 0.0008,
      rating: 4.6,
      open_now: true,
      vibes: ["quiet", "work"],
      phone: "050-1111-2222",
      maps_url: null,
    },
    {
      place_id: "mock-cafe-b",
      name: "브루잉 라운지",
      address: "현재 위치 도보 8분",
      lat: input.lat + 0.002,
      lng: input.lng - 0.001,
      rating: 4.3,
      open_now: true,
      vibes: quiet ? ["work"] : ["lively"],
      phone: null,
      maps_url: null,
    },
    {
      place_id: "mock-cafe-c",
      name: "테라스 커피",
      address: "현재 위치 도보 12분",
      lat: input.lat - 0.0015,
      lng: input.lng + 0.0015,
      rating: 4.1,
      open_now: true,
      vibes: ["quiet"],
      phone: "050-3333-4444",
      maps_url: null,
    },
    {
      place_id: "mock-cafe-d",
      name: "스터디 카페 247",
      address: "현재 위치 도보 15분",
      lat: input.lat + 0.003,
      lng: input.lng + 0.002,
      rating: 3.8,
      open_now: false,
      vibes: ["quiet", "work"],
      phone: null,
      maps_url: null,
    },
  ];

  return base;
}

export async function queryNearbyPlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const originInKorea = isCoordInKorea(input.lat, input.lng);
  let candidates: PlaceCandidate[] = [];

  if (isGooglePlacesConfigured()) {
    candidates = await queryGooglePlaces(input);
    if (
      candidates.length === 0 &&
      !originInKorea &&
      (input.criteria.category === "activity" ||
        input.criteria.category === "amenity")
    ) {
      // Nearby keyword miss abroad → text search biased to the context anchor.
      candidates = await queryGoogleTextPlaces(input);
    }
  }

  // Naver Local is Korea-index only — never query it from a Tokyo/Osaka anchor
  // or Korean POIs bleed into overseas discovery clusters.
  if (candidates.length === 0 && originInKorea && isNaverSearchConfigured()) {
    candidates = await queryNaverLocalPlaces(input);
  }

  if (candidates.length === 0) {
    candidates =
      input.criteria.category === "activity" || input.criteria.category === "amenity"
        ? mockActivityCandidates(input)
        : mockCandidates(input);
  }

  return filterPlaceCandidates(candidates, input.criteria);
}

async function queryNaverLocalPlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const categoryLabel = input.criteria.category === "cafe" ? "카페" : "장소";
  const query = [input.criteria.query.trim(), categoryLabel].filter(Boolean).join(" ");

  try {
    return await fetchNaverLocalPlaceCandidates({
      query,
      display: Math.min(input.criteria.max_results, 5),
    });
  } catch {
    return [];
  }
}

function mapGooglePlaceResult(
  result: {
    place_id?: string;
    name?: string;
    vicinity?: string;
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: { open_now?: boolean };
    types?: string[];
    photos?: Array<{ photo_reference?: string }>;
  },
  key: string,
): PlaceCandidate | null {
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const photoUrls = (result.photos ?? [])
    .map((photo) => photo.photo_reference)
    .filter((ref): ref is string => Boolean(ref?.trim()))
    .slice(0, 6)
    .map((ref) => buildPlacePhotoUrl(ref, key));

  return {
    place_id: result.place_id ?? `place-${result.name}`,
    name: result.name ?? "장소",
    address: result.vicinity ?? result.formatted_address ?? null,
    lat,
    lng,
    rating: result.rating ?? 0,
    review_count: readGoogleUserRatingsTotal(result.user_ratings_total),
    open_now: result.opening_hours?.open_now ?? true,
    vibes: inferVibesFromName(result.name ?? ""),
    phone: null as string | null,
    maps_url: result.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
      : null,
    google_types: result.types?.map((type) => String(type)) ?? null,
    thumbnail_url: photoUrls[0] ?? null,
    photo_urls: photoUrls,
  };
}

async function queryGooglePlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: input.lat, lng: input.lng },
        radius: input.criteria.radius_m,
        type: input.criteria.category === "cafe" ? "cafe" : "point_of_interest",
        opennow: input.criteria.only_open_now,
        keyword: resolveGooglePlacesKeyword(input.criteria),
        language: Language.ko,
        key,
      },
    });

    return (response.data.results ?? [])
      .map((result) => mapGooglePlaceResult(result, key))
      .filter((item): item is PlaceCandidate => item !== null);
  } catch {
    return [];
  }
}

async function queryGoogleTextPlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const key = googlePlacesApiKey();
  const query = resolveGooglePlacesKeyword(input.criteria) ?? input.criteria.query.trim();
  if (!key || !query) {
    return [];
  }

  try {
    const response = await client.textSearch({
      params: {
        query,
        location: { lat: input.lat, lng: input.lng },
        radius: Math.min(Math.max(input.criteria.radius_m, 3000), 50000),
        language: Language.ko,
        key,
      },
    });

    const originLat = input.lat;
    const originLng = input.lng;
    const maxM = Math.min(Math.max(input.criteria.radius_m, 3000), 50000);

    return (response.data.results ?? [])
      .map((result) => mapGooglePlaceResult(result, key))
      .filter((item): item is PlaceCandidate => item !== null)
      .filter((item) => haversineMeters(originLat, originLng, item.lat, item.lng) <= maxM);
  } catch {
    return [];
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

function inferVibesFromName(name: string): PlaceCandidate["vibes"] {
  const vibes: PlaceCandidate["vibes"] = [];
  if (/조용|study|스터디|무드|book/i.test(name)) {
    vibes.push("quiet", "work");
  }
  if (/라운지|lounge|바|bar/i.test(name)) {
    vibes.push("lively");
  }
  if (vibes.length === 0) {
    vibes.push("unknown");
  }
  return vibes;
}

export function filterPlaceCandidates(
  candidates: PlaceCandidate[],
  criteria: PlaceDiscoveryCriteria
): PlaceCandidate[] {
  const minReview =
    criteria.min_review_count ?? DEFAULT_MIN_PLACE_REVIEW_COUNT;
  const rated = candidates
    .filter((place) => place.rating >= criteria.min_rating)
    .filter((place) => (criteria.only_open_now ? place.open_now : true))
    .filter((place) => {
      if (criteria.vibe === "unknown") {
        return true;
      }
      return place.vibes.includes(criteria.vibe) || place.vibes.includes("unknown");
    });
  const reviewFiltered = filterByMinReviewCountProgressive(rated, (place) => ({
    reviewCount: place.review_count,
    source: place.place_id.startsWith("mock-")
      ? "mock"
      : place.naver_category
        ? "naver_local"
        : place.google_types?.length
          ? "google_places"
          : null,
  })).filter((place) => {
    // Honor explicit higher floor when caller set min_review_count > default soft.
    if (minReview > DEFAULT_MIN_PLACE_REVIEW_COUNT) {
      return passesMinReviewCountGate({
        reviewCount: place.review_count,
        source: place.google_types?.length ? "google_places" : "naver_local",
        minCount: minReview,
        allowUnknown: false,
      });
    }
    return true;
  });
  return reviewFiltered
    .sort((a, b) => b.rating - a.rating)
    .slice(0, criteria.max_results);
}
