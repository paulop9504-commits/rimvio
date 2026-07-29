import { detectEaterySearchIntent } from "@/lib/globe/eatery/detect-eatery-search-intent";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { copy } from "@/lib/copy/human-ko";
import {
  extractTravelDestination,
  isTravelTripAnnouncement,
} from "@/lib/experience-run/extract-travel-destination";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  isBusinessTravelMessage,
  isLeisureTravelMessage,
  nextTravelSlot,
  parseTravelSlotsFromMessage,
  questionForTravelSlot,
  travelProfileForMessage,
} from "@/lib/experience-run/travel-context-slots";

const BUSINESS_TRIP =
  /(?:출장|business\s*trip|biz\s*trip|워크|업무\s*여행|미팅|회의)/iu;

export type ExperienceRunIntent = {
  profile: ExperienceRunProfile;
  destination: string | null;
  needsClarify: boolean;
  clarifyPromptKo: string | null;
};

function isBusinessTripMessage(message: string): boolean {
  return isBusinessTravelMessage(message);
}

export function extractRunDestination(message: string): string | null {
  const fromTrip = extractTravelDestination(message);
  if (fromTrip) {
    return fromTrip;
  }
  const overseas = classifyOverseasManualPlace(message);
  if (overseas) {
    return overseas.label;
  }
  const anchored = resolveRunPlaceFromText(message);
  if (anchored) {
    return anchored.placeLabel;
  }
  const cityTrip = message.match(
    /([가-힣A-Za-z][가-힣A-Za-z\s'.-]{1,30})\s+(?:출장|여행|trip|vacation)/iu,
  );
  if (cityTrip?.[1]) {
    return cityTrip[1].trim();
  }
  return null;
}

/** Infer whether CaptureSheet should run an agent pipeline (not plain recall ask). */
export function classifyExperienceRunIntent(
  message: string,
  referenceDate?: string,
): ExperienceRunIntent | null {
  const text = message.trim();
  if (!text) {
    return null;
  }

  const travelProfile = travelProfileForMessage(text);
  const travelSignal =
    Boolean(travelProfile) ||
    isBusinessTripMessage(text) ||
    isLeisureTravelMessage(text) ||
    isTravelTripAnnouncement(text);

  if (travelSignal && detectEaterySearchIntent(text)) {
    const profile =
      travelProfile ??
      (BUSINESS_TRIP.test(text) ? "business_trip" : "leisure_travel");
    if (profile === "business_trip") {
      const destination = extractRunDestination(text);
      return {
        profile,
        destination,
        needsClarify: !destination && !RUN_PLACE_HINT.test(text),
        clarifyPromptKo: !destination
          ? copy.globe.experienceRun.clarifyBusinessTripPlace
          : null,
      };
    }
    const ref = referenceDate ?? new Date().toISOString().slice(0, 10);
    const slots = parseTravelSlotsFromMessage(text, ref);
    const destination = slots.destination ?? extractRunDestination(text);
    const mergedSlots = { ...slots, destination: destination ?? slots.destination };
    const missing = nextTravelSlot(mergedSlots);
    return {
      profile,
      destination: destination ?? null,
      needsClarify: Boolean(missing),
      clarifyPromptKo: missing ? questionForTravelSlot(missing, mergedSlots) : null,
    };
  }

  if (detectLodgingSearchIntent(text)) {
    const destination = extractRunDestination(text);
    return {
      profile: "lodging_search",
      destination,
      needsClarify: !destination && !RUN_PLACE_HINT.test(text),
      clarifyPromptKo: !destination
        ? copy.globe.experienceRun.clarifyLodgingPlace
        : null,
    };
  }

  if (detectEaterySearchIntent(text)) {
    const destination = extractRunDestination(text);
    return {
      profile: "eatery_search",
      destination,
      needsClarify: !destination && !RUN_PLACE_HINT.test(text),
      clarifyPromptKo: !destination
        ? copy.globe.experienceRun.clarifyEateryPlace
        : null,
    };
  }

  if (!travelSignal) {
    if (!isTravelTripAnnouncement(text)) {
      return null;
    }
  }

  const profile =
    travelProfile ??
    (BUSINESS_TRIP.test(text) ? "business_trip" : "leisure_travel");

  if (profile === "business_trip") {
    const destination = extractRunDestination(text);
    return {
      profile,
      destination,
      needsClarify: !destination && !RUN_PLACE_HINT.test(text),
      clarifyPromptKo: !destination
        ? copy.globe.experienceRun.clarifyBusinessTripPlace
        : null,
    };
  }

  const ref = referenceDate ?? new Date().toISOString().slice(0, 10);
  const slots = parseTravelSlotsFromMessage(text, ref);
  const destination = slots.destination ?? extractRunDestination(text);
  const mergedSlots = { ...slots, destination: destination ?? slots.destination };
  const missing = nextTravelSlot(mergedSlots);

  if (missing) {
    return {
      profile,
      destination: destination ?? null,
      needsClarify: true,
      clarifyPromptKo: questionForTravelSlot(missing, mergedSlots),
    };
  }

  return {
    profile,
    destination: destination ?? null,
    needsClarify: false,
    clarifyPromptKo: null,
  };
}

const RUN_PLACE_HINT =
  /(?:부산|서울|제주|도쿄|오사카|해운대|강남|판교|여의도|둔산|둔산동|[가-힣]{2,8}(?:역|동|구|시)|근처|쪽|주변)/iu;

export function mergeSituationMessages(seed: string, reply: string): string {
  const a = seed.trim();
  const b = reply.trim();
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return `${a} ${b}`;
}
