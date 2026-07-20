/**
 * Scout quality gate · replan formation · feed merge · Field exhaust.
 */

import assert from "node:assert/strict";
import {
  evaluateScoutQualityGate,
  mergeDiscoveryRetryIntoActiveFeed,
  resolveQualityReplanFormation,
  bumpScoutQualityAttempt,
  readScoutQualityAttemptsUsed,
} from "../lib/globe/discovery-quality";
import {
  clearActiveDiscoveryExecution,
  writeActiveDiscoveryExecution,
} from "../lib/globe/discovery-execution";

assert.equal(
  evaluateScoutQualityGate({
    recommendationCount: 5,
    attemptsUsed: 0,
  }).verdict,
  "sufficient",
);

assert.equal(
  evaluateScoutQualityGate({
    recommendationCount: 1,
    attemptsUsed: 0,
  }).verdict,
  "insufficient",
);

assert.equal(
  evaluateScoutQualityGate({
    recommendationCount: 1,
    attemptsUsed: 2,
  }).verdict,
  "exhausted",
);

assert.equal(
  evaluateScoutQualityGate({
    recommendationCount: 0,
    attemptsUsed: 0,
  }).verdict,
  "insufficient",
);

assert.equal(
  evaluateScoutQualityGate({
    recommendationCount: 2,
    lodgingCount: 2,
    eateryCount: 0,
    activityCount: 0,
    amenityCount: 0,
    attemptsUsed: 2,
  }).verdict,
  "sufficient",
);

let meta: Record<string, unknown> = {};
meta = bumpScoutQualityAttempt({
  metadata: meta,
  engineId: "lodging_search",
  verdict: "insufficient",
});
assert.equal(readScoutQualityAttemptsUsed(meta, "lodging_search"), 1);

const widen = resolveQualityReplanFormation({
  fromEngineId: "lodging_search",
  contextEventId: "evt-quality",
  attemptsUsedAfterBump: 1,
  seedUtterance: "오사카 숙소 찾아줘",
});
assert.equal(widen.mode, "widen_same");
assert.equal(widen.toEngineId, "lodging_search");
assert.ok(widen.seedUtterance.length > 0);

const alternate = resolveQualityReplanFormation({
  fromEngineId: "lodging_search",
  contextEventId: "evt-quality",
  attemptsUsedAfterBump: 2,
  seedUtterance: "오사카 숙소 찾아줘",
});
assert.equal(alternate.mode, "alternate_engine");
assert.equal(alternate.toEngineId, "eatery_search");

const ctx = "evt-quality-merge";
clearActiveDiscoveryExecution(ctx);
writeActiveDiscoveryExecution(
  ctx,
  {
    batchId: "batch-a",
    count: 1,
    summaryKo: "첫 배치",
    atIso: "2026-07-15T00:00:00.000Z",
    recommendations: [
      {
        kind: "lodging",
        title: "호텔 A",
        reasonKo: "가깝다",
        placeId: "p1",
        lat: 35,
        lng: 135,
      },
    ],
  },
  { archivePrior: false },
);

const merged = mergeDiscoveryRetryIntoActiveFeed({
  contextEventId: ctx,
  incoming: {
    batchId: "batch-b",
    summaryKo: "재시도",
    recommendations: [
      {
        kind: "lodging",
        title: "호텔 A",
        reasonKo: "가깝다",
        rank: 1,
        placeId: "p1",
        lat: 35,
        lng: 135,
      },
      {
        kind: "eatery",
        title: "스시 B",
        reasonKo: "맛있다",
        rank: 1,
        placeId: "p2",
        lat: 35.1,
        lng: 135.1,
      },
    ],
  },
});
assert.equal(merged.addedCount, 1);
assert.equal(merged.totalCount, 2);
assert.equal(merged.merged.batchId, "batch-a");

console.log("test-discovery-quality-gate: ok");
