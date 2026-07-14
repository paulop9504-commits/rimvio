#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  applyPinnedContextItemMetadata,
  buildContextPinnedItem,
} from "../lib/globe/context-pinned-item";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import { listLodgingResourcesForEvent } from "../lib/globe/context-hub/read-lodging-resource-inventory";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import { listEateryResourcesForEvent } from "../lib/globe/eatery/read-eatery-resource-inventory";
import { rankEateryResources } from "../lib/globe/resource/rank-eatery-resources";
import { rankLodgingResources } from "../lib/globe/resource/rank-lodging-resources";
import type { EventCandidate } from "../lib/events/event-candidate";

const stamp = "2026-07-01T08:00:00.000Z";
const event: EventCandidate = {
  id: "test-context-pinned-rank",
  title: "도쿄 출장",
  category: "travel",
  source: "manual",
  lifecycle: "candidate",
  datetime: stamp,
  place: "도쿄",
  confidence: 0.95,
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "stay-near",
        name: "긴자 워크업 호텔",
        lat: 35.672,
        lng: 139.763,
        images: [],
      },
      {
        placeId: "stay-pinned",
        name: "도쿄역 미팅 스테이",
        lat: 35.681,
        lng: 139.767,
        images: [],
      },
    ],
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "eatery-near",
        name: "긴자 브런치",
        lat: 35.672,
        lng: 139.763,
        images: [],
      },
      {
        placeId: "eatery-pinned",
        name: "도쿄역 회의 점심",
        lat: 35.681,
        lng: 139.767,
        images: [],
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
};

const viewerLat = 35.672;
const viewerLng = 139.763;

const beforeLodging = rankLodgingResources({
  event,
  resources: listLodgingResourcesForEvent(event),
  lat: viewerLat,
  lng: viewerLng,
  lodgingRankMode: "distance",
});
assert.equal(beforeLodging[0]?.resource.label, "긴자 워크업 호텔");

const lodgingPinned: EventCandidate = {
  ...event,
  metadata: applyPinnedContextItemMetadata({
    metadata: event.metadata,
    item: buildContextPinnedItem({
      kind: "lodging",
      resourceId: `${event.id}:lodging:stay-pinned`,
      placeId: "stay-pinned",
      label: "도쿄역 미팅 스테이",
      lat: 35.681,
      lng: 139.767,
      pinnedAtIso: "2026-07-01T09:00:00.000Z",
    }),
  }),
};

const afterLodging = rankLodgingResources({
  event: lodgingPinned,
  resources: listLodgingResourcesForEvent(lodgingPinned),
  lat: viewerLat,
  lng: viewerLng,
  lodgingRankMode: "distance",
});
assert.equal(afterLodging[0]?.resource.label, "도쿄역 미팅 스테이");

const beforeEatery = rankEateryResources({
  event,
  resources: listEateryResourcesForEvent(event),
  lat: viewerLat,
  lng: viewerLng,
  eateryRankMode: "distance",
});
assert.equal(beforeEatery[0]?.resource.label, "긴자 브런치");

const eateryPinned: EventCandidate = {
  ...event,
  metadata: applyPinnedContextItemMetadata({
    metadata: event.metadata,
    item: buildContextPinnedItem({
      kind: "eatery",
      resourceId: `${event.id}:eatery:eatery-pinned`,
      placeId: "eatery-pinned",
      label: "도쿄역 회의 점심",
      lat: 35.681,
      lng: 139.767,
      pinnedAtIso: "2026-07-01T09:10:00.000Z",
    }),
  }),
};

const afterEatery = rankEateryResources({
  event: eateryPinned,
  resources: listEateryResourcesForEvent(eateryPinned),
  lat: viewerLat,
  lng: viewerLng,
  eateryRankMode: "distance",
});
assert.equal(afterEatery[0]?.resource.label, "도쿄역 회의 점심");

console.log("test-context-pinned-resource-rank: ok");
