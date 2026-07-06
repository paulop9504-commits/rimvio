import assert from "node:assert/strict";
import { buildExperienceScenarioFromOutcome } from "../lib/globe/experience-simulation/build-experience-scenario";
import { diffItinerary } from "../lib/globe/experience-simulation/schedule-scenario-nodes";
import { orderScenarioCandidates } from "../lib/globe/experience-simulation/order-scenario-nodes";

const baseSpec = {
  version: 1 as const,
  resourceTypes: ["restaurant", "hotel"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 800,
};

const recommendations = [
  {
    kind: "eatery" as const,
    title: "Ramen A",
    reasonKo: "popular",
    rank: 1,
    placeId: "e1",
    lat: 34.701,
    lng: 135.501,
  },
  {
    kind: "lodging" as const,
    title: "Hotel B",
    reasonKo: "close",
    rank: 2,
    placeId: "h1",
    lat: 34.702,
    lng: 135.502,
  },
];

const scenario = buildExperienceScenarioFromOutcome({
  contextEventId: "ev-sim",
  anchorTitle: "오사카",
  anchorLat: 34.7,
  anchorLng: 135.5,
  startAt: new Date("2026-07-06T18:00:00+09:00"),
  outcome: {
    batchId: "batch-sim",
    lodgingCount: 1,
    eateryCount: 1,
    summaryKo: "ok",
    pinPoints: recommendations.map((row) => ({ lat: row.lat, lng: row.lng })),
    radiusM: 800,
    recommendations,
    spec: baseSpec,
  },
});

assert.ok(scenario);
assert.equal(scenario!.branches.length, 3);
assert.equal(scenario!.activeBranchId, "B");

const quick = orderScenarioCandidates({
  mode: "quick",
  anchorLat: 34.7,
  anchorLng: 135.5,
  recommendations,
});
assert.equal(quick[0]?.placeId, "e1");

const stayLast = orderScenarioCandidates({
  mode: "stay_last",
  anchorLat: 34.7,
  anchorLng: 135.5,
  recommendations,
});
assert.equal(stayLast.at(-1)?.placeId, "h1");

const diff = diffItinerary(
  ["scenario-node:e1", "scenario-node:h1"],
  ["scenario-node:e1", "scenario-node:x1", "scenario-node:h1"],
);
assert.equal(diff.inserted.length, 1);

import { isSimulationTerminalLodgingStop } from "../lib/globe/experience-simulation/resolve-active-simulation-target";
assert.equal(
  isSimulationTerminalLodgingStop(scenario!, scenario!.branches[2]!.nodes.length - 1),
  true,
);

console.log("test-experience-simulation: ok");
