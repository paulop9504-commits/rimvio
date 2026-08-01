#!/usr/bin/env npx tsx
/**
 * Workspace Reality Patch — stay preference edits (not user-facing filters).
 */
import assert from "node:assert/strict";
import {
  describeWorkspaceRealityPatch,
  mergeWorkspaceRealityPlan,
  parseWorkspaceRealityPatch,
  stayTypeTag,
} from "../lib/context-workspace/workspace-reality-patch";
import { applyWorkspaceRealityPatch } from "../lib/context-workspace/apply-workspace-reality-patch";
import { openMapContextWorkspace } from "../lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "../lib/context-workspace/workspace-store";

const capsule = parseWorkspaceRealityPatch("캡슐호텔 위주로");
assert.ok(capsule);
assert.equal(capsule.stayType, "capsule");
assert.equal(
  describeWorkspaceRealityPatch(capsule),
  "숙소 선호 → 캡슐호텔",
);

const ryokan = parseWorkspaceRealityPatch("료칸으로 바꿔");
assert.ok(ryokan);
assert.equal(ryokan.stayType, "ryokan");

const cheap = parseWorkspaceRealityPatch("좀 더 싸게");
assert.ok(cheap);
assert.equal(cheap.maxPriceBand, 2);

const station = parseWorkspaceRealityPatch("역 근처로");
assert.ok(station);
assert.equal(station.stationNear, true);

const onsen = parseWorkspaceRealityPatch("온천 있는 곳");
assert.ok(onsen);
assert.equal(onsen.onsenRequired, true);

const merged = mergeWorkspaceRealityPlan(null, capsule!, "숙소 선호 → 캡슐호텔");
assert.equal(merged.stayType, "capsule");
assert.equal(merged.editCount, 1);
const merged2 = mergeWorkspaceRealityPlan(merged, cheap!, "예산 비중 ↑");
assert.equal(merged2.stayType, "capsule");
assert.equal(merged2.maxPriceBand, 2);
assert.equal(merged2.editCount, 2);

assert.equal(stayTypeTag("capsule"), "stay:capsule");

const eventId = "ws-reality-patch-test";
clearContextWorkspace(eventId);
openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "오사카 여행",
  source: "nl_open",
  candidates: [
    {
      id: "maps:apa",
      labelKo: "APA Hotel Namba",
      domain: "lodging",
      lat: 34.66,
      lng: 135.5,
      rating: 8.0,
      priceBand: 3,
      amountLabel: "120,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "maps:capsule",
      labelKo: "난바 캡슐호텔",
      domain: "lodging",
      lat: 34.665,
      lng: 135.502,
      rating: 7.8,
      priceBand: 1,
      amountLabel: "45,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "maps:livemax",
      labelKo: "HOTEL LiVEMAX",
      domain: "lodging",
      lat: 34.67,
      lng: 135.51,
      rating: 8.2,
      priceBand: 2,
      amountLabel: "90,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

const applied = applyWorkspaceRealityPatch({
  contextEventId: eventId,
  utterance: "캡슐호텔 위주로",
});
assert.equal(applied.handled, true);
assert.ok(applied.replyKo?.includes("캡슐"));
assert.ok(!applied.replyKo?.includes("필터"));
assert.equal(applied.plan?.stayType, "capsule");
assert.ok(applied.scoutQuery?.includes("캡슐"));

const state = readContextWorkspace(eventId);
assert.ok(state);
assert.equal(state.realityPlan?.stayType, "capsule");
const visible = state.nodes.filter((n) => n.visible);
assert.ok(visible.some((n) => /캡슐|capsule/iu.test(n.title)));
assert.ok(visible.every((n) => n.tags.includes("stay:capsule") || /캡슐|capsule/iu.test(n.title)));

clearContextWorkspace(eventId);
console.log("ok — workspace reality patch");
