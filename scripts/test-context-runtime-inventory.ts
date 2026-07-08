import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listContextRuntimeInventory } from "@/lib/globe/context-runtime/list-context-runtime-inventory";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
} from "@/lib/globe/context-pinned-item";
import { upsertPersonalGlobePin } from "@/lib/globe/personal-globe-pin-store";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import { replaceMediaGuidesForExperience } from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

function baseEvent(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: "ec-runtime-test",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "confirmed",
    datetime: "2026-07-10T09:00:00.000Z",
    place: "제주",
    description: null,
    containerId: null,
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const eventId = "ec-runtime-test";
const event = baseEvent({
  metadata: applyPinnedContextItemMetadata({
    metadata: {},
    item: buildContextPinnedItem({
      kind: "lodging",
      resourceId: `${eventId}:lodging:place-hotel`,
      placeId: "place-hotel",
      label: "해변 호텔",
      lat: 33.45,
      lng: 126.92,
      pinnedAtIso: "2026-07-01T00:00:00.000Z",
    }),
  }),
});

upsertPersonalGlobePin({
  pinId: `pgpin:${eventId}`,
  eventId,
  lat: 33.45,
  lng: 126.92,
  placeLabel: "제주",
  experienceTitle: "제주 여행",
  photoCount: 1,
  videoCount: 0,
  createdAtIso: "2026-07-01T00:00:00.000Z",
  acl: { viewerPeerThreadIds: [] },
});

upsertPersonalGlobePin({
  pinId: `pgpin:${eventId}:ctxcond:batch1:eatery:place-cafe`,
  eventId: `${eventId}:ctxcond:batch1:eatery:place-cafe`,
  lat: 33.46,
  lng: 126.93,
  placeLabel: "바다 카페",
  experienceTitle: "바다 카페",
  photoCount: 2,
  videoCount: 0,
  createdAtIso: "2026-07-02T00:00:00.000Z",
  acl: { viewerPeerThreadIds: [] },
  source: "context_condition_ai",
  contextConditionBatchId: "batch1",
  contextConditionKind: "eatery",
  parentContextEventId: eventId,
});

upsertPersonalGlobePin({
  pinId: `pgpin:${eventId}:ctxcond:batch2:activity:place-mall`,
  eventId: `${eventId}:ctxcond:batch2:activity:place-mall`,
  lat: 33.47,
  lng: 126.94,
  placeLabel: "제주 아울렛",
  experienceTitle: "제주 아울렛",
  photoCount: 0,
  videoCount: 0,
  createdAtIso: "2026-07-03T00:00:00.000Z",
  acl: { viewerPeerThreadIds: [] },
  source: "context_condition_ai",
  contextConditionBatchId: "batch2",
  contextConditionKind: "activity",
  contextConditionActivitySubtype: "shopping",
  parentContextEventId: eventId,
});

const guide: MediaGuideNode = {
  guideNodeId: "guide:test",
  title: "제주 맛집 브이로그",
  sourceKind: "youtube",
  sourceLabelKo: "YouTube",
  trustLevel: "video",
  trustLabelKo: "영상",
  canonicalUrl: "https://www.youtube.com/watch?v=test",
  openUrl: "https://www.youtube.com/watch?v=test",
  embedUrl: "https://www.youtube.com/embed/test",
  thumbnailUrl: "https://img.youtube.com/vi/test/hqdefault.jpg",
  description: null,
  providerName: "YouTube",
  domain: "youtube.com",
  durationSeconds: 600,
  moments: [],
  primaryMoment: null,
  relatedExperienceEntityId: asRimvioEntityId("experience", eventId),
  relatedPlaceEntityId: null,
  relatedPlaceLabel: null,
  relatedCaptureId: null,
  whyRelevantKo: "제주 여행 맥락",
  relevanceScore: 0.8,
  inferredPlaceCandidates: [],
};

replaceMediaGuidesForExperience({
  experienceEntityId: asRimvioEntityId("experience", eventId),
  guides: [guide],
});

const inventory = listContextRuntimeInventory(event);
assert.ok(inventory);
assert.equal(inventory!.totalCount, 5);
assert.equal(inventory!.sections.find((row) => row.key === "pinned")?.items.length, 1);
assert.equal(inventory!.sections.find((row) => row.key === "pins")?.items.length, 3);
assert.equal(inventory!.sections.find((row) => row.key === "media")?.items.length, 1);
assert.equal(
  inventory!.sections
    .find((row) => row.key === "pins")
    ?.items.find((row) => row.label === "제주 아울렛")
    ?.subtitle,
  "쇼핑 탐색",
);

console.log("test-context-runtime-inventory: ok");
