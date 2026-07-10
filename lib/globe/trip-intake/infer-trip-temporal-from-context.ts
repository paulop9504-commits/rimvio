import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  buildLodgingStayWindow,
  resolveLodgingStayPhase,
} from "@/lib/globe/context-hub/lodging-stay-window";
import { inferLodgingContextMode } from "@/lib/globe/lodging/build-lodging-dynamic-tags";
import { matchKoreaKnownCity } from "@/lib/globe/korea-known-places";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { TripBudgetBand } from "@/lib/globe/trip-intake/types";

const ON_TRIP_NOW =
  /(?:지금|현재|오늘).{0,12}(?:출장|여행|체류)|(?:출장|여행).{0,8}중|on\s+(?:a\s+)?business\s+trip|currently\s+(?:on\s+)?(?:trip|travel)/iu;

const BUSINESS_TRIP =
  /(?:출장|미팅|회의|meeting|business\s*trip|업무)/iu;

export type TripTemporalInferenceSource =
  | "message_on_trip"
  | "stay_phase_mid"
  | "calendar_plan"
  | "gps_near_destination";

export type TripTemporalInference = {
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly originLabel: string | null;
  readonly guestCount: number | null;
  readonly budgetBand: TripBudgetBand | null;
  readonly onTripNow: boolean;
  readonly source: TripTemporalInferenceSource | null;
  readonly confidence: number;
};

function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const parsed = new Date(`${ymd}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return toLocalYmd(parsed);
}

export function isOnTripNowMessage(message: string | null | undefined): boolean {
  const text = message?.trim() ?? "";
  if (!text) {
    return false;
  }
  return ON_TRIP_NOW.test(text);
}

function isBusinessTripMessage(message: string | null | undefined): boolean {
  const text = message?.trim() ?? "";
  if (!text) {
    return false;
  }
  return BUSINESS_TRIP.test(text);
}

function resolveOriginFromGps(input: {
  userLat: number;
  userLng: number;
}): string | null {
  const cities = [
    { label: "서울", lat: 37.5665, lng: 126.978 },
    { label: "부산", lat: 35.1796, lng: 129.0756 },
    { label: "대구", lat: 35.8714, lng: 128.6014 },
    { label: "인천", lat: 37.4563, lng: 126.7052 },
    { label: "광주", lat: 35.1595, lng: 126.8526 },
    { label: "대전", lat: 36.3504, lng: 127.3845 },
    { label: "울산", lat: 35.5384, lng: 129.3114 },
    { label: "제주", lat: 33.4996, lng: 126.5312 },
  ];
  let best: { label: string; distanceKm: number } | null = null;
  for (const city of cities) {
    const distanceKm = haversineKm(input.userLat, input.userLng, city.lat, city.lng);
    if (distanceKm > 35) {
      continue;
    }
    if (!best || distanceKm < best.distanceKm) {
      best = { label: city.label, distanceKm };
    }
  }
  return best?.label ?? null;
}

function isGpsNearDestination(input: {
  event: EventCandidate;
  userLat: number;
  userLng: number;
}): boolean {
  const destination =
    input.event.place?.trim() ||
    matchKoreaKnownCity(`${input.event.title} ${input.event.place ?? ""}`)?.label;
  if (!destination) {
    return false;
  }
  const city = matchKoreaKnownCity(destination);
  if (!city) {
    return false;
  }
  return haversineKm(input.userLat, input.userLng, city.lat, city.lng) <= 40;
}

function defaultNights(message: string | null | undefined, event: EventCandidate): number {
  if (isBusinessTripMessage(message) || inferLodgingContextMode(event) === "business_trip") {
    return 1;
  }
  return 1;
}

function defaultBudgetBand(
  message: string | null | undefined,
  event: EventCandidate,
): TripBudgetBand {
  if (isBusinessTripMessage(message) || inferLodgingContextMode(event) === "business_trip") {
    return "balanced";
  }
  return "balanced";
}

/** Infer check-in/out · origin · solo guest from GPS · calendar · 「지금 출장중」. */
export function inferTripTemporalFromContext(input: {
  event: EventCandidate | null | undefined;
  message?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): TripTemporalInference {
  const empty: TripTemporalInference = {
    checkInIso: null,
    checkOutIso: null,
    originLabel: null,
    guestCount: null,
    budgetBand: null,
    onTripNow: false,
    source: null,
    confidence: 0,
  };

  const event = input.event;
  if (!event) {
    return empty;
  }

  const now = input.now ?? new Date();
  const messageOnTrip = isOnTripNowMessage(input.message);
  const stayWindow = buildLodgingStayWindow({ event });
  const stayPhase = resolveLodgingStayPhase(stayWindow, now);
  const midStay =
    stayPhase === "mid_stay" ||
    stayPhase === "check_in_day" ||
    stayPhase === "last_night";

  const plan = readPlanContextFromEvent(event);
  const planActive =
    plan?.windowStartIso != null &&
    plan.windowEndIso != null &&
    Date.parse(plan.windowStartIso) <= now.getTime() &&
    Date.parse(plan.windowEndIso) > now.getTime();

  const gpsReady =
    input.userLat != null &&
    input.userLng != null &&
    Number.isFinite(input.userLat) &&
    Number.isFinite(input.userLng);

  const gpsNearDestination =
    gpsReady && isGpsNearDestination({ event, userLat: input.userLat!, userLng: input.userLng! });

  const onTripNow = messageOnTrip || midStay || planActive || gpsNearDestination;
  if (!onTripNow) {
    return empty;
  }

  let source: TripTemporalInferenceSource | null = null;
  let confidence = 0.55;

  if (messageOnTrip) {
    source = "message_on_trip";
    confidence = 0.88;
  } else if (midStay) {
    source = "stay_phase_mid";
    confidence = 0.82;
  } else if (planActive) {
    source = "calendar_plan";
    confidence = 0.78;
  } else if (gpsNearDestination) {
    source = "gps_near_destination";
    confidence = 0.72;
  }

  const todayYmd = toLocalYmd(now);
  const nights = defaultNights(input.message, event);
  const checkInIso =
    stayWindow?.checkInIso?.slice(0, 10) ??
    plan?.windowStartIso?.slice(0, 10) ??
    todayYmd;
  const checkOutIso =
    stayWindow?.checkOutIso?.slice(0, 10) ??
    plan?.windowEndIso?.slice(0, 10) ??
    addDaysYmd(checkInIso, nights);

  let originLabel: string | null = null;
  if (gpsReady) {
    originLabel = resolveOriginFromGps({
      userLat: input.userLat!,
      userLng: input.userLng!,
    });
  }

  return {
    checkInIso,
    checkOutIso,
    originLabel,
    guestCount: 1,
    budgetBand: defaultBudgetBand(input.message, event),
    onTripNow: true,
    source,
    confidence,
  };
}
