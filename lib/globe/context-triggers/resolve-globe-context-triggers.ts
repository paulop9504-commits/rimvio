import type { EventCandidate } from "@/lib/events/event-candidate";
import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";
import {
  buildRecallEventSnapshot,
  type RecallEventSnapshot,
} from "@/lib/recall/recall-event-snapshot";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeContextTriggerKind } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { enrichGlobeContextTriggerMedia } from "@/lib/globe/context-triggers/enrich-globe-context-trigger-media";
import {
  compareTriggerMediaRichness,
  promoteMediaRichTriggers,
  scoreEventMediaRichness,
} from "@/lib/globe/context-triggers/score-context-trigger-media";
import { copy } from "@/lib/copy/human-ko";

const FOOD_SIGNAL =
  /(?:맛집|식당|카페|레스토랑|갈비|삼겹|라면|초밥|파스타|브런치|food|restaurant|cafe)/iu;

const TRAVEL_SIGNAL =
  /(?:여행|출국|여정|관광|투어|trip|travel|vacation|제주|부산|오사카|상하이|파리|런던|뉴욕|해외|공항|호텔|숙소)/iu;

const TRIGGER_KIND_PRIORITY: readonly GlobeContextTriggerKind[] = [
  "time_recall",
  "travel_recall",
  "person_recall",
  "place_recall",
];

function readMonthDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function yearsAgoLabel(year: number, nowYear: number): string {
  const delta = nowYear - year;
  if (delta <= 0) {
    return "그때";
  }
  if (delta === 1) {
    return "1년 전 오늘";
  }
  return `${delta}년 전 오늘`;
}

function sortByTimeDesc(a: RecallEventSnapshot, b: RecallEventSnapshot): number {
  const aMs = a.atIso ? Date.parse(a.atIso) : 0;
  const bMs = b.atIso ? Date.parse(b.atIso) : 0;
  return bMs - aMs;
}

function sortByRichnessDesc(a: RecallEventSnapshot, b: RecallEventSnapshot): number {
  const captureDelta = b.captureCount - a.captureCount;
  if (captureDelta !== 0) {
    return captureDelta;
  }
  return sortByTimeDesc(a, b);
}

function sortSnapshotsByRecallQuality(
  a: RecallEventSnapshot,
  b: RecallEventSnapshot,
  eventById: ReadonlyMap<string, EventCandidate>,
): number {
  const mediaDelta =
    scoreEventMediaRichness(eventById.get(b.eventId)).score -
    scoreEventMediaRichness(eventById.get(a.eventId)).score;
  if (mediaDelta !== 0) {
    return mediaDelta;
  }
  return sortByRichnessDesc(a, b);
}

function dayRotationOffset(now: Date, poolSize: number): number {
  if (poolSize <= 1) {
    return 0;
  }
  const start = new Date(now.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  return dayOfYear % poolSize;
}

function isTravelSnapshot(snapshot: RecallEventSnapshot): boolean {
  const blob = [snapshot.title, snapshot.headline, snapshot.place, ...snapshot.noteTokens]
    .join(" ")
    .toLowerCase();
  return TRAVEL_SIGNAL.test(blob);
}

function foodRelated(snapshot: RecallEventSnapshot): boolean {
  const blob = [snapshot.title, snapshot.headline, snapshot.place, ...snapshot.noteTokens]
    .join(" ")
    .toLowerCase();
  return FOOD_SIGNAL.test(blob);
}

function resolveTimeRecallTrigger(
  snapshots: readonly RecallEventSnapshot[],
  now: Date,
  eventById: ReadonlyMap<string, EventCandidate>,
): GlobeContextTrigger | null {
  const today = readMonthDay(now);
  const nowYear = now.getFullYear();
  const hits = snapshots
    .filter((row) => row.monthDay === today && row.year !== null && row.year < nowYear)
    .sort((a, b) => sortSnapshotsByRecallQuality(a, b, eventById));
  const best = hits[0];
  if (!best?.year) {
    return null;
  }
  const place = best.place || best.city || "그때 거기";
  return {
    id: `time-${best.eventId}`,
    kind: "time_recall",
    eventId: best.eventId,
    emoji: "📅",
    title: `${yearsAgoLabel(best.year, nowYear)}, ${best.title}`,
    body: copy.globe.contextTriggerBodyTimeRecall(place),
    ctaLabel: copy.globe.contextTriggerCtaExploreMemory,
  };
}

function resolveTravelRecallTriggers(
  snapshots: readonly RecallEventSnapshot[],
  eventById: ReadonlyMap<string, EventCandidate>,
): GlobeContextTrigger[] {
  return snapshots
    .filter(isTravelSnapshot)
    .sort((a, b) => sortSnapshotsByRecallQuality(a, b, eventById))
    .slice(0, 3)
    .map((row) => {
      const place = row.place || row.city || "그때 거기";
      const person = row.people[0];
      const title = person
        ? `${person}와 ${place} 여행`
        : row.title.trim() || `${place} 여행`;
      return {
        id: `travel-${row.eventId}`,
        kind: "travel_recall" as const,
        eventId: row.eventId,
        emoji: "🧳",
        title,
        body:
          row.captureCount > 0
            ? copy.globe.contextTriggerBodyTravelMoments(row.captureCount)
            : copy.globe.contextTriggerBodyTravelRecall,
        ctaLabel: copy.globe.contextTriggerCtaExploreMemory,
      };
    });
}

function scorePersonMediaPool(
  events: readonly EventCandidate[],
  personKey: string,
  snapshots: readonly RecallEventSnapshot[],
): number {
  const eventById = new Map(events.map((event) => [event.id, event]));
  return snapshots
    .filter((row) =>
      row.people.some((person) => normalizeMeaningPerson(person) === personKey),
    )
    .reduce(
      (sum, row) => sum + scoreEventMediaRichness(eventById.get(row.eventId)).score,
      0,
    );
}

function resolvePersonRecallTrigger(
  snapshots: readonly RecallEventSnapshot[],
  events: readonly EventCandidate[],
): GlobeContextTrigger | null {
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
      const latest = sortByTimeDesc(prev.latest, row) < 0 ? prev.latest : row;
      counts.set(key, { count: prev.count + 1, latest });
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => {
    const mediaDelta =
      scorePersonMediaPool(events, b[0], snapshots) -
      scorePersonMediaPool(events, a[0], snapshots);
    if (mediaDelta !== 0) {
      return mediaDelta;
    }
    return b[1].count - a[1].count || sortByTimeDesc(b[1].latest, a[1].latest);
  });
  const top = ranked[0];
  if (!top || top[1].count < 2) {
    return null;
  }
  const [person, row] = top;
  return {
    id: `person-${person}`,
    kind: "person_recall",
    eventId: row.latest.eventId,
    personKey: person,
    emoji: "👥",
    title: copy.globe.contextTriggerTitlePerson(person),
    body: copy.globe.contextTriggerBodyPersonRecall(person),
    ctaLabel: copy.globe.contextTriggerCtaRestoreTalk,
  };
}

function resolvePlaceRecallTrigger(
  snapshots: readonly RecallEventSnapshot[],
  excludeEventIds: ReadonlySet<string>,
  eventById: ReadonlyMap<string, EventCandidate>,
): GlobeContextTrigger | null {
  const withPlace = snapshots.filter(
    (row) => row.place?.trim() && !excludeEventIds.has(row.eventId) && !isTravelSnapshot(row),
  );
  const sortSnapshots = (a: RecallEventSnapshot, b: RecallEventSnapshot) =>
    sortSnapshotsByRecallQuality(a, b, eventById);
  const food = withPlace.filter(foodRelated).sort(sortSnapshots);
  const best = food[0] ?? [...withPlace].sort(sortSnapshots)[0];
  if (!best?.place) {
    return null;
  }
  const person = best.people[0];
  const title = person ? `${person}랑 갔던 ${best.place}` : best.place;
  return {
    id: `place-${best.eventId}`,
    kind: "place_recall",
    eventId: best.eventId,
    emoji: "🍜",
    title,
    body: copy.globe.contextTriggerBodyPlaceRecall,
    ctaLabel: copy.globe.contextTriggerCtaCheckPlace,
  };
}

function resolveRecentMemoryTriggers(
  snapshots: readonly RecallEventSnapshot[],
  excludeEventIds: ReadonlySet<string>,
  max: number,
  eventById: ReadonlyMap<string, EventCandidate>,
): GlobeContextTrigger[] {
  return snapshots
    .filter((row) => !excludeEventIds.has(row.eventId))
    .sort((a, b) => sortSnapshotsByRecallQuality(a, b, eventById))
    .slice(0, max)
    .map((row) => {
      const place = row.place || row.city;
      const title = place ? `${row.title || place}` : row.title || "그때 거기";
      return {
        id: `recent-${row.eventId}`,
        kind: "place_recall" as const,
        eventId: row.eventId,
        emoji: row.captureCount > 0 ? "📷" : "📍",
        title,
        body: row.captureCount > 0
          ? copy.globe.contextTriggerBodyTravelMoments(row.captureCount)
          : place
            ? copy.globe.contextTriggerBodyRecentPlace(place)
            : copy.globe.contextTriggerBodyRecent,
        ctaLabel: copy.globe.contextTriggerCtaExploreMemory,
      };
    });
}

function mixContextTriggers(
  candidates: readonly GlobeContextTrigger[],
  limit: number,
  now: Date,
): GlobeContextTrigger[] {
  const byKind = new Map<GlobeContextTriggerKind, GlobeContextTrigger[]>();
  for (const trigger of candidates) {
    const pool = byKind.get(trigger.kind) ?? [];
    pool.push(trigger);
    byKind.set(trigger.kind, pool);
  }

  const picked: GlobeContextTrigger[] = [];
  const usedEventIds = new Set<string>();

  const takeFromPool = (pool: readonly GlobeContextTrigger[]) => {
    if (pool.length === 0) {
      return null;
    }
    const ranked = [...pool].sort(compareTriggerMediaRichness);
    const offset = dayRotationOffset(now, ranked.length);
    for (let index = 0; index < ranked.length; index += 1) {
      const trigger = ranked[(offset + index) % ranked.length]!;
      const eventId = trigger.eventId?.trim();
      if (eventId && usedEventIds.has(eventId)) {
        continue;
      }
      picked.push(trigger);
      if (eventId) {
        usedEventIds.add(eventId);
      }
      return trigger;
    }
    return null;
  };

  for (const kind of TRIGGER_KIND_PRIORITY) {
    if (picked.length >= limit) {
      break;
    }
    takeFromPool(byKind.get(kind) ?? []);
  }

  for (const trigger of [...candidates].sort(compareTriggerMediaRichness)) {
    if (picked.length >= limit) {
      break;
    }
    const eventId = trigger.eventId?.trim();
    if (eventId && usedEventIds.has(eventId)) {
      continue;
    }
    if (picked.some((row) => row.id === trigger.id)) {
      continue;
    }
    picked.push(trigger);
    if (eventId) {
      usedEventIds.add(eventId);
    }
  }

  return picked;
}

/** Deterministic 맥락 트리거 — no LLM. */
export function resolveGlobeContextTriggers(input: {
  events: readonly EventCandidate[];
  layerMode: GlobeLayerMode;
  now?: Date;
  limit?: number;
}): GlobeContextTrigger[] {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 3;
  if (input.layerMode === "discovery") {
    return [];
  }

  const eventById = new Map(input.events.map((event) => [event.id, event]));

  const snapshots = input.events
    .map((event) => buildRecallEventSnapshot(event, now))
    .filter((row) => row.lifecycle !== "archived");

  const travel = resolveTravelRecallTriggers(snapshots, eventById);
  const travelEventIds = new Set(travel.map((row) => row.eventId).filter(Boolean) as string[]);

  const candidates: GlobeContextTrigger[] = [];
  const time = resolveTimeRecallTrigger(snapshots, now, eventById);
  const person = resolvePersonRecallTrigger(snapshots, input.events);
  const place = resolvePlaceRecallTrigger(snapshots, travelEventIds, eventById);

  if (time) {
    candidates.push(time);
  }
  candidates.push(...travel);
  if (person) {
    candidates.push(person);
  }
  if (place) {
    candidates.push(place);
  }
  candidates.push(
    ...resolveRecentMemoryTriggers(
      snapshots,
      new Set([...travelEventIds]),
      Math.max(2, limit),
      eventById,
    ),
  );

  const enriched = enrichGlobeContextTriggerMedia({
    triggers: candidates,
    events: input.events,
    now,
  });

  const mixed = mixContextTriggers(enriched, limit, now);
  return promoteMediaRichTriggers(mixed, enriched, limit);
}
