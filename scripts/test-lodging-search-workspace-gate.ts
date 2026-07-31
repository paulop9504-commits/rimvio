/**
 * Reality OS — lodging inventory maps to Workspace hits, not Globe pins.
 */
import assert from "node:assert/strict";
import { syncAccommodationSearchPins } from "../lib/globe/accommodation/create-accommodation-search-pins";
import { DAEJEON_LODGING_MOCK } from "../lib/globe/context-hub/lodging-mock-inventory";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { lodgingInventoryRowsToPlaceHits } from "../lib/context-workspace/lodging-inventory-to-place-hits";
import {
  clearContextWorkspace,
  openLodgingContextWorkspace,
  readContextWorkspace,
} from "../lib/context-workspace";

const CTX = "test:lodging-workspace-not-globe";

resetPersonalGlobePinsForTests();
clearContextWorkspace(CTX);

const rows = DAEJEON_LODGING_MOCK.slice(0, 3);
const hits = lodgingInventoryRowsToPlaceHits(rows);
assert.equal(hits.length, 3);
assert.equal(hits[0]!.domain, "lodging");
assert.ok(Number.isFinite(hits[0]!.lat));

const fakeEvent = {
  id: CTX,
  title: "대전 호텔",
  category: "travel" as const,
  source: "manual" as const,
  lifecycle: "planned" as const,
  datetime: "2026-08-22T09:00:00.000Z",
  place: "대전",
  description: "",
  metadata: {},
  confidence: 0.9,
  lifecycleUpdatedAt: "2026-06-20T08:00:00.000Z",
  createdAt: "2026-06-20T08:00:00.000Z",
  updatedAt: "2026-06-20T08:00:00.000Z",
};

assert.equal(
  syncAccommodationSearchPins({ contextEvent: fakeEvent, rows }).length,
  0,
);

const ws = openLodgingContextWorkspace({
  contextEventId: CTX,
  query: "대전 유성 호텔",
  summaryKo: "숙소 후보",
  hits,
  source: "hotel_search",
});
assert.ok(ws.nodes.filter((n) => n.visible && n.kind === "lodging").length >= 2);
assert.equal(readContextWorkspace(CTX)?.domain, "lodging");

clearContextWorkspace(CTX);
console.log("ok: lodging search → Workspace, not Globe pins");
