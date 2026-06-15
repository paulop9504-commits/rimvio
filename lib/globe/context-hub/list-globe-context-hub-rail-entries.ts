import type { EventCandidate } from "@/lib/events/event-candidate";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import {
  listContextHubLinks,
  type ContextHubLink,
} from "@/lib/globe/context-hub/list-context-hub-links";
import { shouldOfferDepartureHub } from "@/lib/globe/should-offer-departure-hub";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { buildRecallMedia } from "@/lib/recall/build-recall-media";
import { matchesGlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import { matchesGlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";

export type GlobeContextHubRailEntry = {
  eventId: string;
  title: string;
  place: string;
  thumbnailUrl: string | null;
  startIso: string | null;
  lat: number;
  lng: number;
  canSuggestHub: boolean;
  hubLinks: ContextHubLink[];
};

function isGlobeContextEvent(event: EventCandidate): boolean {
  if (isGlobeContextRemoved(event)) {
    return false;
  }
  const meta = event.metadata ?? {};
  if (meta.globeManualContext === true || meta.targetingSource === "globe_manual") {
    return true;
  }
  if (findPersonalGlobePinByEventId(event.id)) {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  return Boolean(plan?.place?.trim() && meta.feedPlanEnabled === true);
}

function resolveThumbnailUrl(event: EventCandidate): string | null {
  const recall = buildRecallMedia(event);
  const url = recall.kind === "photo" || recall.kind === "video" ? recall.url?.trim() : null;
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }
  return null;
}

function projectRailEntry(event: EventCandidate): GlobeContextHubRailEntry | null {
  if (!isGlobeContextEvent(event)) {
    return null;
  }

  const hubLinks = listContextHubLinks(event);
  const canSuggestHub = shouldOfferDepartureHub(event);
  if (!canSuggestHub && hubLinks.length === 0) {
    return null;
  }

  const plan = readPlanContextFromEvent(event);
  const pin = findPersonalGlobePinByEventId(event.id);
  const coords = resolveEventGlobeCoords(event);
  const startIso =
    plan?.windowStartIso?.trim() || event.datetime?.trim() || pin?.createdAtIso || null;

  return {
    eventId: event.id,
    title: pin?.experienceTitle?.trim() || plan?.title?.trim() || event.title.trim() || "맥락",
    place: pin?.placeLabel?.trim() || plan?.place?.trim() || event.place?.trim() || coords.placeLabel,
    thumbnailUrl: resolveThumbnailUrl(event),
    startIso,
    lat: pin?.lat ?? coords.lat,
    lng: pin?.lng ?? coords.lng,
    canSuggestHub,
    hubLinks,
  };
}

/** Travel contexts eligible for hubs — for the left globe rail. */
export function listGlobeContextHubRailEntries(input: {
  events: readonly EventCandidate[];
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  now?: Date;
}): GlobeContextHubRailEntry[] {
  const timeFilter = input.timeFilter ?? "all";
  const peopleFilter = input.peopleFilter ?? null;
  const eventsById =
    input.eventsById ??
    new Map(input.events.map((event) => [event.id, event] as const));

  return input.events
    .map((event) => projectRailEntry(event))
    .filter((row): row is GlobeContextHubRailEntry => row !== null)
    .filter((row) => matchesGlobeContextTimeFilter(row.startIso, timeFilter, input.now))
    .filter((row) =>
      matchesGlobeContextPeopleFilter(row.eventId, peopleFilter, eventsById),
    )
    .sort((left, right) => {
      const leftMs = left.startIso ? Date.parse(left.startIso) : 0;
      const rightMs = right.startIso ? Date.parse(right.startIso) : 0;
      const leftSort = Number.isNaN(leftMs) ? 0 : leftMs;
      const rightSort = Number.isNaN(rightMs) ? 0 : rightMs;
      return rightSort - leftSort;
    });
}
