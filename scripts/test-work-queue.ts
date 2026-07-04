#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyGlobeWorkSurface } from "../lib/work-queue/classify-globe-work-surface";
import { clearWorkQueueForTests, listWorkQueueItems } from "../lib/work-queue/work-queue-store";
import { syncWorkQueueFromActiveRuns } from "../lib/work-queue/sync-work-queue-from-runs";
import { writePortalComposeRunState, resetPortalComposeRunStoreForTests } from "../lib/portal/portal-compose-run-store";
import { writePendingSituationLock, clearPendingSituationLock } from "../lib/experience-run/situation-lock";

const storage = new Map<string, string>();
(globalThis as { sessionStorage?: Storage }).sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, value);
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
};

clearWorkQueueForTests();
resetPortalComposeRunStoreForTests();
clearPendingSituationLock();

const sell = classifyGlobeWorkSurface("아이폰 팔아야 함");
assert.ok(sell);
assert.equal(sell!.surface, "outer");
assert.equal(sell!.kind, "portal_compose");

const travel = classifyGlobeWorkSurface("나 내일 제주도 놀러가");
assert.ok(travel);
assert.equal(travel!.surface, "inner");
assert.equal(travel!.kind, "travel_context");

writePortalComposeRunState({
  graphId: "graph-sell-iphone",
  intentId: "offer",
  categoryId: "used_goods",
  composeSeed: "아이폰 팔아야 함",
  accumulatedText: "아이폰 팔아야 함",
  eventId: "ev-sell-iphone",
  pendingSlotId: "priceKrw",
  askedCount: 1,
  status: "waiting_slot",
  composeSchemaId: "sell_item",
  composeDraft: { productName: "아이폰", role: "listing" },
  updatedAt: new Date().toISOString(),
});

const portalItems = syncWorkQueueFromActiveRuns();
assert.equal(portalItems.length, 1);
assert.equal(portalItems[0]?.surface, "outer");
assert.equal(portalItems[0]?.titleKo, "아이폰");

writePendingSituationLock({
  profile: "leisure_travel",
  seedMessage: "나 내일 제주도 놀러가",
  destination: "제주",
  askedAt: new Date().toISOString(),
  pendingSlot: "duration",
  filledSlots: { destination: "제주" },
});

const mixed = syncWorkQueueFromActiveRuns();
assert.equal(mixed.length, 2);

clearPendingSituationLock();
const portalOnly = syncWorkQueueFromActiveRuns();
assert.equal(portalOnly.length, 1);

console.log("test-work-queue: ok");
