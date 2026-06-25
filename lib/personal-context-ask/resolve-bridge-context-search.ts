import type {
  ParsedPersonalContextQuery,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";

const MAX_HITS = 5;

function personMatches(
  snapshot: RecallEventSnapshot,
  needles: readonly string[],
): boolean {
  if (needles.length === 0) {
    return true;
  }
  return needles.some((needle) =>
    snapshot.people.some((person) => peerDisplayNamesMatch(person, needle)),
  );
}

function placeMatches(
  snapshot: RecallEventSnapshot,
  needles: readonly string[],
): boolean {
  if (needles.length === 0) {
    return true;
  }
  const haystack = [
    snapshot.place,
    snapshot.city,
    snapshot.title,
    snapshot.headline,
    ...snapshot.noteTokens,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function yearMatches(
  snapshot: RecallEventSnapshot,
  year: number | null,
): boolean {
  if (year === null) {
    return true;
  }
  return snapshot.year === year;
}

function sortByTimeDesc(
  a: RecallEventSnapshot,
  b: RecallEventSnapshot,
): number {
  const aMs = a.atIso ? Date.parse(a.atIso) : 0;
  const bMs = b.atIso ? Date.parse(b.atIso) : 0;
  return bMs - aMs;
}

function toHit(
  snapshot: RecallEventSnapshot,
  reasonKo: string,
): PersonalContextBridgeHit {
  return {
    eventId: snapshot.eventId,
    title: snapshot.title,
    headline: snapshot.headline,
    place: snapshot.place,
    atIso: snapshot.atIso,
    people: snapshot.people,
    reasonKo,
    photoCount: 0,
    dwellDays: null,
    photoPreviews: [],
    contextKind: null,
    spotLabels: [],
    periodEndIso: null,
  };
}

/** Person + place (+ year) bridge search — SSOT for anchored context asks. */
export function resolveBridgeContextSearch(
  snapshots: readonly RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  return snapshots
    .filter((row) => personMatches(row, parsed.personNeedles))
    .filter((row) => placeMatches(row, parsed.placeNeedles))
    .filter((row) => yearMatches(row, parsed.year))
    .sort(sortByTimeDesc)
    .slice(0, MAX_HITS)
    .map((row) => toHit(row, "맥락 일치"));
}

export function hasBridgeSearchAnchors(
  parsed: ParsedPersonalContextQuery,
): boolean {
  return (
    parsed.personNeedles.length > 0 || parsed.placeNeedles.length > 0
  );
}

export function shouldUseUnifiedBridgeSearch(
  parsed: ParsedPersonalContextQuery,
): boolean {
  if (
    parsed.intent === "schedule_week" ||
    parsed.intent === "frequent_person" ||
    parsed.intent === "last_meet_place"
  ) {
    return false;
  }
  return hasBridgeSearchAnchors(parsed);
}
