import type { EventCandidate } from "@/lib/events/event-candidate";
import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import { collectBridgeMediaForAsk, ASK_PHOTO_PREVIEW_CAP } from "@/lib/personal-context-ask/collect-bridge-media-for-ask";
import { enrichBridgeContextFacts } from "@/lib/personal-context-ask/enrich-bridge-context-facts";
import { buildContextAiNarrative } from "@/lib/personal-context-ask/build-context-ai-narrative";
import { parsePersonalContextQuery } from "@/lib/personal-context-ask/parse-personal-context-query";
import {
  resolveBridgeContextSearch,
  shouldUseUnifiedBridgeSearch,
} from "@/lib/personal-context-ask/resolve-bridge-context-search";
import type {
  ParsedPersonalContextQuery,
  PersonalContextAskResult,
  PersonalContextBridgeHit,
} from "@/lib/personal-context-ask/personal-context-ask-types";
import {
  formatEmptyReply,
  formatExternalSoonReply,
} from "@/lib/personal-context-ask/format-personal-context-reply";
import { enrichAskRecallContext } from "@/lib/personal-context-ask/enrich-ask-recall-context";
import { pickAskPrimaryHit } from "@/lib/personal-context-ask/pick-ask-primary-hit";
import {
  buildRecallEventSnapshot,
  type RecallEventSnapshot,
} from "@/lib/recall/recall-event-snapshot";

const MAX_HITS = 5;

function personMatches(snapshot: RecallEventSnapshot, needles: readonly string[]): boolean {
  if (needles.length === 0) {
    return true;
  }
  return needles.some((needle) =>
    snapshot.people.some((person) => peerDisplayNamesMatch(person, needle)),
  );
}

function placeMatches(snapshot: RecallEventSnapshot, needles: readonly string[]): boolean {
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

function yearMatches(snapshot: RecallEventSnapshot, year: number | null): boolean {
  if (year === null) {
    return true;
  }
  return snapshot.year === year;
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

function enrichHitsWithMedia(
  hits: readonly PersonalContextBridgeHit[],
  events: readonly EventCandidate[],
): PersonalContextBridgeHit[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  return hits.map((hit) => {
    const event = byId.get(hit.eventId);
    if (!event) {
      return hit;
    }
    const media = collectBridgeMediaForAsk({
      event,
      previewLimit: ASK_PHOTO_PREVIEW_CAP,
    });
    const facts = enrichBridgeContextFacts(event, hit.place);
    return { ...hit, ...media, ...facts };
  });
}

function sumPhotoCount(hits: readonly PersonalContextBridgeHit[]): number {
  return hits.reduce((sum, hit) => sum + hit.photoCount, 0);
}

function sortByTimeDesc(
  a: RecallEventSnapshot,
  b: RecallEventSnapshot,
): number {
  const aMs = a.atIso ? Date.parse(a.atIso) : 0;
  const bMs = b.atIso ? Date.parse(b.atIso) : 0;
  return bMs - aMs;
}

function sortByTimeAsc(
  a: RecallEventSnapshot,
  b: RecallEventSnapshot,
): number {
  const aMs = a.atIso ? Date.parse(a.atIso) : Number.MAX_SAFE_INTEGER;
  const bMs = b.atIso ? Date.parse(b.atIso) : Number.MAX_SAFE_INTEGER;
  return aMs - bMs;
}

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function readWeekWindow(
  weekOffset: 0 | 1 | null,
  now: Date,
): { start: Date; end: Date } | null {
  if (weekOffset === null) {
    return null;
  }
  const anchor = new Date(now);
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  return {
    start: startOfWeekMonday(anchor),
    end: endOfWeekSunday(anchor),
  };
}

function inWeekWindow(iso: string | null, window: { start: Date; end: Date }): boolean {
  if (!iso) {
    return false;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return false;
  }
  return ms >= window.start.getTime() && ms <= window.end.getTime();
}

function hasScheduleSignal(snapshot: RecallEventSnapshot): boolean {
  return Boolean(snapshot.atIso || snapshot.gcalEventId);
}

function foodRelated(snapshot: RecallEventSnapshot): boolean {
  const blob = [
    snapshot.title,
    snapshot.headline,
    snapshot.place,
    ...snapshot.noteTokens,
  ]
    .join(" ")
    .toLowerCase();
  return /맛집|식당|레스토랑|카페|밥|먹/u.test(blob);
}

function resolveLastMeetPlace(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  const hits = snapshots
    .filter((row) => personMatches(row, parsed.personNeedles))
    .filter((row) => row.place)
    .sort(sortByTimeDesc)
    .slice(0, MAX_HITS)
    .map((row) => toHit(row, "마지막 만남"));
  return hits;
}

function resolveScheduleWeek(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): PersonalContextBridgeHit[] {
  const window = readWeekWindow(parsed.weekOffset ?? 0, now);
  if (!window) {
    return [];
  }
  return snapshots
    .filter((row) => hasScheduleSignal(row))
    .filter((row) => inWeekWindow(row.atIso, window))
    .sort(sortByTimeAsc)
    .slice(0, MAX_HITS)
    .map((row) => toHit(row, "이번 주"));
}

function resolveTravelRecall(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  return snapshots
    .filter((row) => placeMatches(row, parsed.placeNeedles))
    .filter((row) => yearMatches(row, parsed.year))
    .sort(sortByTimeDesc)
    .slice(0, MAX_HITS)
    .map((row) => toHit(row, "여행 기록"));
}

function resolvePlaceWithPerson(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  return snapshots
    .filter((row) => personMatches(row, parsed.personNeedles))
    .filter((row) => foodRelated(row) || row.place)
    .sort(sortByTimeDesc)
    .slice(0, MAX_HITS)
    .map((row) => toHit(row, "함께한 장소"));
}

function resolveFrequentPerson(
  snapshots: RecallEventSnapshot[],
): PersonalContextBridgeHit[] {
  const counts = new Map<string, { count: number; latest: RecallEventSnapshot }>();
  for (const row of snapshots) {
    for (const person of row.people) {
      const key = normalizeMeaningPerson(person);
      if (!key) {
        continue;
      }
      const prev = counts.get(key);
      if (!prev) {
        counts.set(key, { count: 1, latest: row });
        continue;
      }
      const latest =
        sortByTimeDesc(prev.latest, row) < 0 ? prev.latest : row;
      counts.set(key, { count: prev.count + 1, latest });
    }
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || sortByTimeDesc(b[1].latest, a[1].latest))
    .slice(0, MAX_HITS);

  return ranked.map(([person, row]) =>
    toHit(row.latest, `${person} · ${row.count}번`),
  );
}

function resolveGeneral(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
): PersonalContextBridgeHit[] {
  const tokens = [
    ...parsed.personNeedles,
    ...parsed.placeNeedles,
    ...parsed.raw
      .split(/\s+/u)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2),
  ];

  const scored = snapshots
    .map((row) => {
      const blob = [
        row.title,
        row.headline,
        row.place,
        row.city,
        ...row.people,
        ...row.noteTokens,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce(
        (sum, token) => sum + (blob.includes(token.toLowerCase()) ? 1 : 0),
        0,
      );
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || sortByTimeDesc(a.row, b.row),
    )
    .slice(0, MAX_HITS);

  return scored.map((entry) => toHit(entry.row, "맥락 일치"));
}

function resolveHits(
  snapshots: RecallEventSnapshot[],
  parsed: ParsedPersonalContextQuery,
  now: Date,
): PersonalContextBridgeHit[] {
  if (shouldUseUnifiedBridgeSearch(parsed)) {
    return resolveBridgeContextSearch(snapshots, parsed);
  }

  switch (parsed.intent) {
    case "last_meet_place":
      return resolveLastMeetPlace(snapshots, parsed);
    case "schedule_week":
      return resolveScheduleWeek(snapshots, parsed, now);
    case "travel_recall":
      return resolveTravelRecall(snapshots, parsed);
    case "place_with_person":
      return resolvePlaceWithPerson(snapshots, parsed);
    case "frequent_person":
      return resolveFrequentPerson(snapshots);
    default:
      return resolveGeneral(snapshots, parsed);
  }
}

/** Pure resolve — deterministic bridge retrieval from life events. */
export function resolvePersonalContextAsk(input: {
  query: string;
  events: readonly EventCandidate[];
  scope: "personal" | "discovery";
  now?: Date;
}): PersonalContextAskResult {
  const now = input.now ?? new Date();
  const parsed = parsePersonalContextQuery(input.query, now);

  if (input.scope === "discovery") {
    const empty = formatExternalSoonReply();
    return {
      kind: "external_soon",
      intent: parsed.intent,
      hits: [],
      narrativeKo: empty,
      summaryKo: empty,
      totalPhotoCount: 0,
      responseFocus: parsed.responseFocus,
      featuredHitId: null,
      recallContext: null,
    };
  }

  const snapshots = input.events.map((event) =>
    buildRecallEventSnapshot(event, now),
  );
  const rawHits = resolveHits(snapshots, parsed, now);
  const enriched = enrichHitsWithMedia(rawHits, input.events);

  if (enriched.length === 0) {
    const empty = formatEmptyReply();
    return {
      kind: "empty",
      intent: parsed.intent,
      hits: [],
      narrativeKo: empty,
      summaryKo: empty,
      totalPhotoCount: 0,
      responseFocus: parsed.responseFocus,
      featuredHitId: null,
      recallContext: null,
    };
  }

  const hits = enriched;
  const totalPhotoCount = sumPhotoCount(hits);
  const featured = pickAskPrimaryHit(hits);
  const recallContext = enrichAskRecallContext({
    parsed,
    hits,
    events: input.events,
    featuredHitId: featured?.eventId ?? null,
    now,
  });
  const narrative = buildContextAiNarrative({
    parsed,
    hits,
    totalPhotoCount,
    recallContext,
  });
  const kind = parsed.intent === "schedule_week" ? "schedule" : "bridges";
  return {
    kind,
    intent: parsed.intent,
    hits,
    narrativeKo: narrative.narrativeKo,
    summaryKo: narrative.summaryKo,
    totalPhotoCount,
    responseFocus: parsed.responseFocus,
    featuredHitId: featured?.eventId ?? null,
    recallContext,
  };
}
