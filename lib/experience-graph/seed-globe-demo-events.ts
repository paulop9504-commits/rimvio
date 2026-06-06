import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  listEventCandidates,
  upsertEventCandidate,
} from "@/lib/events/event-store";

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

function buildDemoDrafts(now = new Date()): EventCandidate[] {
  const jejuStart = new Date(now);
  jejuStart.setDate(jejuStart.getDate() + 10);
  jejuStart.setHours(15, 0, 0, 0);
  const jejuEnd = new Date(jejuStart);
  jejuEnd.setDate(jejuEnd.getDate() + 2);
  jejuEnd.setHours(19, 0, 0, 0);

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
      lifecycle: "scheduled",
      datetime: toLocalEventIso(jejuStart),
      place: "제주 애월",
      confidence: 0.9,
      metadata: {
        feedPlanEnabled: true,
        planWindowEndIso: toLocalEventIso(jejuEnd),
        planNights: 2,
        planPeerDisplayName: "민수",
        globeDemo: true,
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
