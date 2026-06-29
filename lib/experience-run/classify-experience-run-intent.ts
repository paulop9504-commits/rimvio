import { detectEaterySearchIntent } from "@/lib/globe/eatery/detect-eatery-search-intent";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { copy } from "@/lib/copy/human-ko";
import {
  extractTravelDestination,
  isTravelTripAnnouncement,
} from "@/lib/action-chat/try-travel-trip-announcement";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";

const BUSINESS_TRIP =
  /(?:출장|business\s*trip|biz\s*trip|워크|업무\s*여행|미팅|회의)/iu;

export type ExperienceRunIntent = {
  profile: ExperienceRunProfile;
  destination: string | null;
  needsClarify: boolean;
  clarifyPromptKo: string | null;
};

function isBusinessTripMessage(message: string): boolean {
  return BUSINESS_TRIP.test(message) || isTravelTripAnnouncement(message);
}

export function extractRunDestination(message: string): string | null {
  const anchored = resolveRunPlaceFromText(message);
  if (anchored) {
    return anchored.placeLabel;
  }
  const fromTrip = extractTravelDestination(message);
  if (fromTrip) {
    return fromTrip;
  }
  const cityTrip = message.match(/([가-힣]{2,10})\s+(?:출장|여행)/iu);
  if (cityTrip?.[1]) {
    return cityTrip[1].trim();
  }
  return null;
}

/** Infer whether CaptureSheet should run an agent pipeline (not plain recall ask). */
export function classifyExperienceRunIntent(message: string): ExperienceRunIntent | null {
  const text = message.trim();
  if (!text) {
    return null;
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

  if (!isBusinessTripMessage(text)) {
    return null;
  }

  const destination = extractRunDestination(text);
  const needsClarify = destination == null;

  return {
    profile: "business_trip",
    destination,
    needsClarify,
    clarifyPromptKo: needsClarify
      ? copy.globe.experienceRun.clarifyBusinessTripPlace
      : null,
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
