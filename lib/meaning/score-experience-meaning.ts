import type { EventCandidate } from "@/lib/events/event-candidate";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readPinContextNote } from "@/lib/globe/pin-context-note";
import type { MeaningGraph } from "@/lib/meaning/meaning-graph-types";
import { readExperienceBehaviorScore } from "@/lib/meaning/experience-behavior-store";
import {
  readExperienceMeaningTags,
  scoreExperienceMeaningTags,
} from "@/lib/meaning/read-experience-meaning-tags";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";

export type ExperienceMeaningWeight = {
  eventId: string;
  total: number;
  density: number;
  behavior: number;
  graphBoost: number;
  tags: number;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreExperienceDensity(event: EventCandidate): number {
  const captures = readFeedCaptureFragments(event);
  const verifiedCount = captures.filter((row) => row.verified).length;
  const plan = readPlanContextFromEvent(event);
  const peopleCount = projectExperienceRoom({ primaryEvent: event }).participants
    .length;
  const hasNote = Boolean(readPinContextNote(event)?.trim());
  const meta = event.metadata ?? {};
  const bridgeLinked = Boolean(
    meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId]?.trim() ||
      meta[EXPERIENCE_BRIDGE_META_KEYS.hostUserId]?.trim(),
  );
  const calendarLinked = Boolean(
    meta.gcalEventId?.trim() || plan?.feedPlanEnabled,
  );

  const raw =
    captures.length * 6 +
    verifiedCount * 4 +
    peopleCount * 8 +
    (hasNote ? 10 : 0) +
    (bridgeLinked ? 12 : 0) +
    (calendarLinked ? 10 : 0);

  return clampScore(raw);
}

function scoreGraphBoost(
  eventId: string,
  graph: MeaningGraph | null | undefined,
): number {
  if (!graph) {
    return 0;
  }
  let max = 0;
  for (const edge of graph.edges) {
    if (!edge.eventIds.includes(eventId)) {
      continue;
    }
    max = Math.max(max, edge.score.total);
  }
  return clampScore(max);
}

export function scoreExperienceMeaning(
  event: EventCandidate,
  input?: {
    graph?: MeaningGraph | null;
    now?: Date;
  },
): ExperienceMeaningWeight {
  void input?.now;
  const density = scoreExperienceDensity(event);
  const behavior = readExperienceBehaviorScore(event.id);
  const tags = scoreExperienceMeaningTags(readExperienceMeaningTags(event));
  const graphBoost = scoreGraphBoost(event.id, input?.graph ?? null);
  const total = clampScore(
    density * 0.5 + behavior * 0.25 + graphBoost * 0.15 + tags * 0.1,
  );

  return {
    eventId: event.id,
    total,
    density,
    behavior,
    graphBoost,
    tags,
  };
}
