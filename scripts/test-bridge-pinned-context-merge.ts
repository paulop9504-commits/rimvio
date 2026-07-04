#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
  mergePinnedContextItemFromRemote,
  readPinnedContextItem,
  CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
} from "../lib/globe/context-pinned-item";

function baseEvent(metadata?: Record<string, unknown>): EventCandidate {
  return {
    id: "evt-bridge-pin",
    title: "도쿄 출장",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    confidence: 0.93,
    datetime: "2026-07-01T08:00:00.000Z",
    place: "도쿄",
    lifecycleUpdatedAt: "2026-07-01T08:00:00.000Z",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    metadata: {
      experienceBridgeParticipant: true,
      ...metadata,
    },
  };
}

const localPinned = buildContextPinnedItem({
  kind: "eatery",
  resourceId: "evt-bridge-pin:eatery:1",
  placeId: "eatery-1",
  label: "긴자 점심",
  lat: 35.67,
  lng: 139.76,
  pinnedAtIso: "2026-07-01T09:00:00.000Z",
});

const remotePinned = buildContextPinnedItem({
  kind: "lodging",
  resourceId: "evt-bridge-pin:lodging:2",
  placeId: "lodging-2",
  label: "도쿄 역 스테이",
  lat: 35.681,
  lng: 139.767,
  mapsUrl: "https://maps.example.com/stay",
  previewUrl: "https://cdn.example.com/stay.jpg",
  pinnedAtIso: "2026-07-01T09:30:00.000Z",
});

const merged = mergePinnedContextItemFromRemote({
  event: baseEvent(applyPinnedContextItemMetadata({ metadata: {}, item: localPinned })),
  remoteEvent: baseEvent(applyPinnedContextItemMetadata({ metadata: {}, item: remotePinned })),
});

assert.ok(merged);
assert.deepEqual(readPinnedContextItem(merged!), remotePinned);
assert.equal(
  merged!.metadata?.[CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY],
  remotePinned.resourceId,
);
assert.equal(merged!.metadata?.contextEateryPinnedResourceId, undefined);

const staleRemote = mergePinnedContextItemFromRemote({
  event: baseEvent(applyPinnedContextItemMetadata({ metadata: {}, item: remotePinned })),
  remoteEvent: baseEvent(applyPinnedContextItemMetadata({ metadata: {}, item: localPinned })),
});

assert.equal(staleRemote, null);

console.log("test-bridge-pinned-context-merge: ok");
