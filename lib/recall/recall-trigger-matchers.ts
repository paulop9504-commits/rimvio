import type { RecallTrigger } from "@/lib/recall/recall-types";
import type {
  RecallEventSnapshot,
} from "@/lib/recall/recall-event-snapshot";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";

export type RecallTriggerMatch = {
  trigger: RecallTrigger;
  weight: number;
  detail: string;
};

function peopleOverlap(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const hits: string[] = [];
  for (const a of left) {
    for (const b of right) {
      if (peerDisplayNamesMatch(a, b) || a === b) {
        hits.push(a);
        break;
      }
    }
  }
  return [...new Set(hits)];
}

function noteTokenOverlap(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token));
}

/** Match past snapshot against anchor — returns fired triggers. */
export function matchRecallTriggers(
  anchor: Pick<
    RecallEventSnapshot,
    | "people"
    | "place"
    | "city"
    | "monthDay"
    | "year"
    | "gcalEventId"
    | "titleFingerprint"
    | "dayOfWeek"
    | "hourBucket"
    | "planMode"
    | "noteTokens"
  >,
  past: RecallEventSnapshot,
): RecallTriggerMatch[] {
  const matches: RecallTriggerMatch[] = [];

  const sharedPeople = peopleOverlap(anchor.people, past.people);
  if (sharedPeople.length > 0) {
    matches.push({
      trigger: "same_person",
      weight: 28,
      detail: sharedPeople.slice(0, 2).join(", "),
    });
  }

  if (anchor.place && past.place && anchor.place === past.place) {
    matches.push({
      trigger: "same_place",
      weight: 24,
      detail: past.place,
    });
  }

  if (
    anchor.monthDay &&
    past.monthDay &&
    anchor.monthDay === past.monthDay &&
    anchor.year !== null &&
    past.year !== null &&
    anchor.year !== past.year
  ) {
    matches.push({
      trigger: "same_date",
      weight: 22,
      detail: anchor.monthDay,
    });
  }

  if (anchor.city && past.city && anchor.city === past.city && anchor.place !== past.place) {
    matches.push({
      trigger: "same_city",
      weight: 18,
      detail: past.city,
    });
  } else if (anchor.city && past.city && anchor.city === past.city && !anchor.place) {
    matches.push({
      trigger: "same_city",
      weight: 16,
      detail: past.city,
    });
  }

  if (
    anchor.gcalEventId &&
    past.gcalEventId &&
    anchor.gcalEventId === past.gcalEventId
  ) {
    matches.push({
      trigger: "same_calendar_event",
      weight: 35,
      detail: anchor.gcalEventId,
    });
  } else if (
    anchor.titleFingerprint &&
    past.titleFingerprint &&
    anchor.titleFingerprint.length >= 4 &&
    anchor.titleFingerprint === past.titleFingerprint
  ) {
    matches.push({
      trigger: "same_calendar_event",
      weight: 20,
      detail: past.title,
    });
  }

  if (
    anchor.dayOfWeek !== null &&
    past.dayOfWeek !== null &&
    anchor.hourBucket !== null &&
    past.hourBucket !== null &&
    anchor.dayOfWeek === past.dayOfWeek &&
    anchor.hourBucket === past.hourBucket
  ) {
    matches.push({
      trigger: "similar_time_of_week",
      weight: 16,
      detail: `${anchor.dayOfWeek}:${anchor.hourBucket}`,
    });
  }

  if (
    anchor.planMode &&
    past.planMode &&
    anchor.planMode === past.planMode
  ) {
    matches.push({
      trigger: "plan_mode_match",
      weight: 12,
      detail: past.planMode,
    });
  }

  const sharedNoteTokens = noteTokenOverlap(anchor.noteTokens, past.noteTokens);
  if (sharedNoteTokens.length > 0) {
    matches.push({
      trigger: "context_note_echo",
      weight: 18,
      detail: sharedNoteTokens.slice(0, 2).join(", "),
    });
  }

  return matches;
}
