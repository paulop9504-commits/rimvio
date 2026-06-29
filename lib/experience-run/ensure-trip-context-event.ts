import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { stampPlanContextMetadata } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

const BUSINESS_TRIP = /(?:출장|business|미팅|회의|업무)/iu;

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
}): EventCandidate {
  const message = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const destination = extractRunDestination(message);
  const profile = input.profile ?? "business_trip";
  const isBusiness = BUSINESS_TRIP.test(message) && profile === "business_trip";
  const label = destination ?? (isBusiness ? "출장" : "여행");
  let title: string;
  if (profile === "lodging_search") {
    title = destination ? `${destination} 숙소` : "숙소 맥락";
  } else if (profile === "eatery_search") {
    title = destination ? `${destination} 맛집` : "맛집 맥락";
  } else {
    title = isBusiness ? `${label} 출장` : `${label} 여행`;
  }
  const datetime =
    parseRelativeDateTimeFromText(message, referenceDate) ?? toLocalEventIso(new Date());

  const eventId =
    input.existingEventId?.trim() || `ctx-plan:${Date.now()}`;

  const metadata = stampPlanContextMetadata(
    {
      feedPlanEnabled: true,
      globeManualContext: true,
      targetingSource: "experience_run",
      executionProfileId:
        profile === "lodging_search"
          ? "lodging_search"
          : profile === "eatery_search"
            ? "eatery_search"
            : isBusiness
              ? "business_trip"
              : "leisure_travel",
    },
    {
      planId: eventId,
      title,
      windowStartIso: datetime,
      windowEndIso: null,
      windowConfidence: "open",
      place: destination,
      peerDisplayName: null,
      peerThreadId: null,
      attachMode: "new",
      planMode: "solo",
    },
  );

  const event = commitEventUpsert({
    id: eventId,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime,
    place: destination ?? undefined,
    confidence: 0.92,
    metadata,
  });

  createPersonalGlobePinFromEvent({
    event,
    experienceTitle: title,
  });

  return event;
}
