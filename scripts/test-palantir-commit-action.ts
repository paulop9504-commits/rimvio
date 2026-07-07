import assert from "node:assert/strict";
import type { ContextConditionRecommendation } from "../lib/globe/context-condition-ai/local-discovery-action-types";
import { resolvePalantirCommitAction } from "../lib/globe/spatial-semantic/resolve-palantir-commit-action";

function rec(kind: "eatery" | "lodging"): ContextConditionRecommendation {
  return {
    kind,
    title: "테스트 피자",
    reasonKo: "가까워요",
    rank: 1,
    placeId: "p1",
    lat: 34.7,
    lng: 135.5,
  };
}

const navigate = resolvePalantirCommitAction({
  recommendation: rec("eatery"),
  anchorPlaceName: "오사카",
});
assert.equal(navigate.kind, "navigate");
assert.equal(navigate.featureId, "navigate");
assert.ok(navigate.href.length > 0);
assert.ok(navigate.labelKo.includes("테스트 피자"));

const schedule = resolvePalantirCommitAction({
  recommendation: rec("eatery"),
  anchorPlaceName: "오사카",
  triggerMessage: "저녁 일정 잡아줘",
});
assert.equal(schedule.kind, "schedule");
assert.equal(schedule.featureId, "schedule");
assert.ok(schedule.href.includes("calendar.google.com"));

const scheduleFromEvent = resolvePalantirCommitAction({
  recommendation: rec("lodging"),
  anchorPlaceName: "교토",
  eventDatetime: "2026-07-10T18:00:00.000Z",
});
assert.equal(scheduleFromEvent.kind, "schedule");

console.log("test-palantir-commit-action: ok");
