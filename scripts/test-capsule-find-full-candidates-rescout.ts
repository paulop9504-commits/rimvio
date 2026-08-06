#!/usr/bin/env npx tsx
/**
 * Even with a full lodging candidate map, clear intent 「캡슐호텔 찾아」
 * must set needsRescout so the agent re-runs Scout (replace).
 */
import assert from "node:assert/strict";
import { applyWorkspaceRealityPatch } from "@/lib/context-workspace/apply-workspace-reality-patch";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";

const eventId = "ws-capsule-find-full-candidates";
clearContextWorkspace(eventId);

const candidates = Array.from({ length: 8 }, (_, i) => ({
  id: `maps:hotel-${i}`,
  labelKo: `APA Hotel ${i + 1}`,
  domain: "lodging" as const,
  lat: 34.66 + i * 0.001,
  lng: 135.5 + i * 0.001,
  rating: 8.0,
  priceBand: 3,
  amountLabel: "120,000원",
  reservable: true,
  localFavorite: false,
  source: "maps" as const,
}));

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "오사카 여행",
  source: "nl_open",
  candidates,
});

const before = readContextWorkspace(eventId);
assert.ok(before);
assert.ok(
  before!.nodes.filter((n) => n.kind === "lodging" && n.visible).length >= 6,
);

const applied = applyWorkspaceRealityPatch({
  contextEventId: eventId,
  utterance: "캡슐호텔 찾아",
});

assert.equal(applied.handled, true);
assert.equal(applied.needsRescout, true, "full map must still rescout on find");
assert.ok(applied.scoutQuery);
assert.match(applied.scoutQuery!, /캡슐/);
assert.equal(applied.plan?.stayType, "capsule");

// Same stayType already capsule + explicit find → still rescout
const live = readContextWorkspace(eventId)!;
writeContextWorkspace({
  ...live,
  realityPlan: {
    stayType: "capsule",
    maxPriceBand: null,
    minRating: null,
    stationNear: false,
    onsenRequired: false,
    editCount: 2,
    lastEditKo: "캡슐",
    updatedAtIso: new Date().toISOString(),
  },
});

const again = applyWorkspaceRealityPatch({
  contextEventId: eventId,
  utterance: "캡슐호텔 찾아줘",
});
assert.equal(again.handled, true);
assert.equal(
  again.needsRescout,
  true,
  "explicit find must rescout even when stayType unchanged",
);

clearContextWorkspace(eventId);
console.log("ok — full candidates still force rescout on capsule find");
