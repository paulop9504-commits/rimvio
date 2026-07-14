import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import type { TravelFilledSlots } from "@/lib/experience-run/travel-context-slots";
import { computeWindowEndIso } from "@/lib/experience-run/travel-context-slots";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { stampCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { stampPlanContextMetadata } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Agent step — create or refresh travel/business context event (SSOT). */
export function ensureTripContextEvent(input: {
  message: string;
  referenceDate?: string;
  existingEventId?: string | null;
  profile?: ExperienceRunProfile;
  travelSlots?: TravelFilledSlots | null;
}): EventCandidate {
  const message = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const slots = input.travelSlots ?? null;
  const destination =
    slots?.destination?.trim() || extractRunDestination(message);
  const destinationAnchor = resolveTripContextAnchor(destination);
  const resolvedDestination = destinationAnchor?.placeLabel ?? destination ?? null;
  const profile = input.profile ?? "business_trip";
  const isBusiness =
    profile === "business_trip" &&
    /(?:출장|business|미팅|회의|업무)/iu.test(message);
  const label = resolvedDestination ?? (isBusiness ? "출장" : "여행");
  let title: string;
  if (profile === "lodging_search") {
    title = resolvedDestination ? `${resolvedDestination} 숙소` : "숙소 맥락";
  } else if (profile === "eatery_search") {
    title = resolvedDestination ? `${resolvedDestination} 맛집` : "맛집 맥락";
  } else if (profile === "leisure_travel") {
    title = `${label} 여행`;
  } else {
    title = isBusiness ? `${label} 출장` : `${label} 여행`;
  }
  const datetime =
    slots?.anchorTimeIso?.trim() ||
    parseRelativeDateTimeFromText(message, referenceDate) ||
    toLocalEventIso(new Date());

  const windowEndIso =
    slots?.durationDays && slots.anchorTimeIso
      ? computeWindowEndIso(slots.anchorTimeIso, slots.durationDays)
      : slots?.durationDays
        ? computeWindowEndIso(datetime, slots.durationDays)
        : null;

  const eventId =
    input.existingEventId?.trim() || `ctx-plan:${Date.now()}`;

  const metadataSeed = {
    feedPlanEnabled: true,
    globeManualContext: true,
    targetingSource: "experience_run",
    /** Preserve original utterance so TravelBrain companion/aesthetic survive city confirm. */
    sourceMessage: message,
    executionProfileId:
      profile === "lodging_search"
        ? "lodging_search"
        : profile === "eatery_search"
          ? "eatery_search"
          : profile === "leisure_travel"
            ? "leisure_travel"
            : isBusiness
              ? "business_trip"
              : "leisure_travel",
    ...(slots?.originLat != null && slots.originLng != null
      ? {
          travelOriginLat: slots.originLat,
          travelOriginLng: slots.originLng,
          travelOriginLabel: slots.originLabel ?? "출발",
        }
      : {}),
    ...(destinationAnchor
      ? {
          globePlaceConfirmed: true,
          globePlaceLat: destinationAnchor.lat,
          globePlaceLng: destinationAnchor.lng,
          globePlaceLabel: destinationAnchor.placeLabel,
          globePlaceCardLat: destinationAnchor.lat,
          globePlaceCardLng: destinationAnchor.lng,
          globePlaceCardLabel: destinationAnchor.placeLabel,
        }
      : {}),
  };
  const baseMetadata = destinationAnchor
    ? stampCanonicalPlaceProfile(metadataSeed, destinationAnchor.profile)
    : metadataSeed;

  const companionGroup =
    /(?:연인|커플|남친|여친|신혼|허니문|친구|가족|부모님|엄마|아빠)/u.test(message);
  const metadata = stampPlanContextMetadata(
    baseMetadata,
    {
      planId: eventId,
      title,
      windowStartIso: datetime,
      windowEndIso,
      windowConfidence: windowEndIso ? "confirmed" : "open",
      nights: slots?.durationDays ?? undefined,
      place: resolvedDestination,
      peerDisplayName: null,
      peerThreadId: null,
      attachMode: "new",
      planMode: companionGroup ? "group" : "solo",
    },
  );

  const event = commitEventUpsert({
    id: eventId,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime,
    place: resolvedDestination ?? undefined,
    confidence: 0.92,
    metadata,
  });

  createPersonalGlobePinFromEvent({
    event,
    experienceTitle: title,
  });

  return event;
}
