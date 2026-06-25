import type { EventCandidate } from "@/lib/events/event-candidate";
import { projectRelationshipMeaningLine } from "@/lib/copy/project-relationship-meaning-line";
import {
  bridgeWeatherMatchesExperience,
  readBridgeWeatherFromEvent,
} from "@/lib/globe/bridge-weather/bridge-weather-metadata";
import { formatBridgeWeatherLine } from "@/lib/globe/bridge-weather/format-bridge-weather-line";
import { resolveBridgeEventTime } from "@/lib/globe/bridge-weather/resolve-bridge-event-time";
import { buildPeopleGraph } from "@/lib/people-graph/build-people-graph";
import { findPersonNode } from "@/lib/people-graph/rank-people-graph";
import { buildBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";
import type {
  ParsedPersonalContextQuery,
  PersonalContextAskRecallContext,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";

const EMPTY_RECALL: PersonalContextAskRecallContext = {
  relationshipLine: null,
  relationshipAnchor: null,
  weatherLine: null,
  weatherTemperature: null,
  coExperienceCount: 0,
  peerThreadId: null,
  contextTalkThreadId: null,
};

function readFeaturedEvent(
  events: readonly EventCandidate[],
  featuredHitId: string | null,
): EventCandidate | null {
  const key = featuredHitId?.trim();
  if (!key) {
    return null;
  }
  return events.find((event) => event.id === key) ?? null;
}

function readWeatherForEvent(event: EventCandidate | null): {
  line: string | null;
  temperature: number | null;
} {
  if (!event) {
    return { line: null, temperature: null };
  }

  const eventTime = resolveBridgeEventTime(event);
  const stamped = readBridgeWeatherFromEvent(event);
  if (
    stamped &&
    eventTime &&
    bridgeWeatherMatchesExperience({
      stored: stamped,
      eventDate: eventTime.eventDate,
      location:
        event.place?.trim() ||
        stamped.location,
    })
  ) {
    return {
      line: formatBridgeWeatherLine(stamped),
      temperature: stamped.temperature,
    };
  }

  return { line: null, temperature: null };
}

/** MEANING + weather + people graph — recall emotional spine for ask. */
export function enrichAskRecallContext(input: {
  parsed: ParsedPersonalContextQuery;
  hits: readonly PersonalContextBridgeHit[];
  events: readonly EventCandidate[];
  featuredHitId: string | null;
  now?: Date;
}): PersonalContextAskRecallContext {
  if (input.hits.length === 0) {
    return EMPTY_RECALL;
  }

  const now = input.now ?? new Date();
  const featured = readFeaturedEvent(input.events, input.featuredHitId);
  const primaryPerson =
    input.parsed.personNeedles[0] ??
    input.hits[0]?.people[0] ??
    null;

  const graph = buildPeopleGraph({
    contacts: [],
    events: input.events,
    now,
  });

  const personNode = primaryPerson
    ? findPersonNode(graph, { displayName: primaryPerson })
    : null;

  const meaning = primaryPerson
    ? projectRelationshipMeaningLine({
        displayName: primaryPerson,
        events: input.events,
        now,
      })
    : null;

  const weather = readWeatherForEvent(featured);
  const featuredId = featured?.id ?? input.featuredHitId;

  return {
    relationshipLine: meaning?.line ?? null,
    relationshipAnchor: meaning?.factAnchor ?? null,
    weatherLine: weather.line,
    weatherTemperature: weather.temperature,
    coExperienceCount: personNode?.relationshipScore.coExperienceCount ?? 0,
    peerThreadId: personNode?.peerThreadId ?? null,
    contextTalkThreadId: featuredId
      ? buildBridgeContextThreadId(featuredId)
      : null,
  };
}
