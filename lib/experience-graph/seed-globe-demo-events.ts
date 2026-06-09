import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listEventCandidates,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import {
  FEED_CAPTURES_META_KEY,
  FEED_CAPTURE_STATS_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import { stockPhotosForPlaceLabel } from "@/lib/globe/place-stock-photos";

export const GLOBE_DEMO_EVENT_IDS = {
  jeju: "rimvio-globe-demo-jeju",
  dunsan: "rimvio-globe-demo-dunsan",
  gangnam: "rimvio-globe-demo-gangnam",
} as const;

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

function buildJejuWowWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  if (start.getTime() > now.getTime()) {
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  end.setHours(20, 0, 0, 0);
  return { start, end };
}

function jejuDemoNeedsRefresh(existing: EventCandidate, now = new Date()): boolean {
  const endIso =
    typeof existing.metadata?.planWindowEndIso === "string"
      ? existing.metadata.planWindowEndIso
      : null;
  const startMs = existing.datetime ? Date.parse(existing.datetime) : Number.NaN;
  const endMs = endIso ? Date.parse(endIso) : Number.NaN;
  const nowMs = now.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return true;
  }
  return nowMs < startMs - 3_600_000 || nowMs > endMs + 3_600_000;
}

function demoCaptures(
  prefix: string,
  placeLabel: string,
  capturedAtIso: string,
): FeedCaptureFragment[] {
  return stockPhotosForPlaceLabel(placeLabel)
    .slice(0, 5)
    .map((url, index) => ({
      id: `${prefix}-photo-${index + 1}`,
      kind: "photo" as const,
      capturedAtIso,
      placeLabel,
      label: placeLabel,
      url,
      verified: true,
    }));
}

function buildDemoDrafts(now = new Date()): EventCandidate[] {
  const { start: jejuStart, end: jejuEnd } = buildJejuWowWindow(now);

  const dunsanStart = new Date(now);
  dunsanStart.setDate(dunsanStart.getDate() - 14);
  dunsanStart.setHours(19, 30, 0, 0);

  const gangnamStart = new Date(now);
  gangnamStart.setHours(gangnamStart.getHours() + 4, 0, 0, 0);

  const stamp = now.toISOString();

  return [
    {
      id: GLOBE_DEMO_EVENT_IDS.jeju,
      title: "제주 여행",
      category: "travel",
      source: "manual",
      lifecycle: "active",
      datetime: toLocalEventIso(jejuStart),
      place: "제주",
      confidence: 0.9,
      metadata: {
        feedPlanEnabled: true,
        planKind: "plan",
        planWindowEndIso: toLocalEventIso(jejuEnd),
        planNights: 2,
        planPeerDisplayName: "민수",
        planPeerThreadId: "rimvio-feed-demo-minsu",
        planMode: "group",
        experiencePeerNames: ["민수"],
        sourceMessageId: "feed-demo-jeju-thread-msg",
        peerMessageCount: 8,
        experienceConversationSnippets: [
          { speakerName: "민수", body: "성산일출봉 일출 보러 갈까?" },
          { speakerName: "나", body: "좋아, 5시에 출발하자" },
          { speakerName: "민수", body: "애월 카페도 들르자" },
        ],
        [FEED_CAPTURES_META_KEY]: demoCaptures(
          "jeju",
          "제주",
          toLocalEventIso(jejuStart),
        ),
        [FEED_CAPTURE_STATS_META_KEY]: {
          photos: 5,
          videos: 0,
          links: 0,
          memos: 0,
        },
        globeDemo: true,
        contextWowDemo: true,
      },
      lifecycleUpdatedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: GLOBE_DEMO_EVENT_IDS.dunsan,
      title: "둔산동 저녁",
      category: "food",
      source: "manual",
      lifecycle: "completed",
      datetime: toLocalEventIso(dunsanStart),
      place: "대전 둔산동",
      confidence: 0.86,
      metadata: {
        globeDemo: true,
        [FEED_CAPTURES_META_KEY]: demoCaptures(
          "dunsan",
          "대전 둔산동",
          toLocalEventIso(dunsanStart),
        ),
        [FEED_CAPTURE_STATS_META_KEY]: {
          photos: 5,
          videos: 0,
          links: 0,
          memos: 0,
        },
      },
      lifecycleUpdatedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: GLOBE_DEMO_EVENT_IDS.gangnam,
      title: "강남역 미팅",
      category: "schedule",
      source: "manual",
      lifecycle: "active",
      datetime: toLocalEventIso(gangnamStart),
      place: "강남역",
      confidence: 0.88,
      metadata: {
        feedPlanEnabled: true,
        planPeerDisplayName: "지연",
        globeDemo: true,
        [FEED_CAPTURES_META_KEY]: demoCaptures(
          "gangnam",
          "강남역",
          toLocalEventIso(gangnamStart),
        ),
        [FEED_CAPTURE_STATS_META_KEY]: {
          photos: 4,
          videos: 0,
          links: 0,
          memos: 0,
        },
      },
      lifecycleUpdatedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

/** Globe tab demo — seeds multi-place volumes when the user has none yet. */
export function ensureGlobeDemoEvents(now = new Date()): EventCandidate[] {
  if (typeof window === "undefined") {
    return [];
  }

  const existing = listEventCandidates();
  const hasUserEvents = existing.some(
    (item) => !Object.values(GLOBE_DEMO_EVENT_IDS).includes(item.id as (typeof GLOBE_DEMO_EVENT_IDS)[keyof typeof GLOBE_DEMO_EVENT_IDS]),
  );
  if (hasUserEvents) {
    return [];
  }
  const drafts = buildDemoDrafts(now);
  const seeded: EventCandidate[] = [];

  for (const draft of drafts) {
    const found = existing.find((item) => item.id === draft.id);
    if (found && draft.id === GLOBE_DEMO_EVENT_IDS.jeju && jejuDemoNeedsRefresh(found, now)) {
      const saved = upsertEventCandidate({
        id: draft.id,
        title: draft.title,
        category: draft.category,
        source: draft.source,
        lifecycle: draft.lifecycle,
        datetime: draft.datetime,
        place: draft.place,
        confidence: draft.confidence,
        metadata: draft.metadata,
      });
      seeded.push(saved);
      continue;
    }
    if (found) {
      seeded.push(found);
      continue;
    }
    const saved = upsertEventCandidate({
      id: draft.id,
      title: draft.title,
      category: draft.category,
      source: draft.source,
      lifecycle: draft.lifecycle,
      datetime: draft.datetime,
      place: draft.place,
      confidence: draft.confidence,
      metadata: draft.metadata,
    });
    seeded.push(saved);
  }

  return seeded;
}
