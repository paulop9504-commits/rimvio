/**
 * Smoke: What-if Simulation Engine — Draft only, never Commit.
 */
import assert from "node:assert/strict";
import {
  assertSimulationDoesNotCommit,
  createSimulationDraft,
  markSimulationDraftApplied,
  parseWonAmount,
  runWhatIfSimulation,
  writeSimulationDraft,
  readSimulationDraft,
  clearSimulationDraft,
} from "@/lib/callout/simulation";

assert.equal(parseWonAmount("120,000원"), 120000);
assert.equal(parseWonAmount("86000원"), 86000);

const result = runWhatIfSimulation({
  scenarioKind: "change_hotel",
  current: {
    objectId: "hotel_a",
    title: "Namba Hotel",
    typeLabelKo: "숙소",
    priceWon: 120_000,
    priceLabelKo: "120,000원",
    lat: 34.66,
    lng: 135.5,
    dayLabelKo: "Day 2",
  },
  proposal: {
    objectId: "hotel_b",
    title: "B Hotel",
    priceWon: 86_000,
    priceLabelKo: "86,000원",
    lat: 34.69,
    lng: 135.55,
  },
  anchors: [
    {
      day: 2,
      labelKo: "Day 2",
      lat: 34.665,
      lng: 135.51,
      nodeId: "poi_1",
    },
  ],
});

assert.ok(result.changes.some((c) => c.kind === "object"));
assert.ok(result.changes.some((c) => c.kind === "budget"));
assert.equal(result.impact.budget, -34_000);
assert.ok(result.impact.distance > 0);
assert.ok(result.impact.time !== 0);
assert.ok(result.changes.some((c) => c.kind === "schedule"));

const draft = createSimulationDraft({
  contextId: "ctx_sim",
  scenarioKind: "change_hotel",
  current: {
    objectId: "hotel_a",
    title: "Namba Hotel",
    typeLabelKo: "숙소",
    priceWon: 120_000,
    priceLabelKo: "120,000원",
    lat: 34.66,
    lng: 135.5,
    dayLabelKo: "Day 2",
  },
  proposal: {
    objectId: "hotel_b",
    title: "B Hotel",
    priceWon: 86_000,
    priceLabelKo: "86,000원",
    lat: 34.67,
    lng: 135.52,
  },
  anchors: [
    {
      day: 2,
      labelKo: "Day 2",
      lat: 34.665,
      lng: 135.51,
      nodeId: "poi_1",
    },
  ],
});

assert.equal(draft.status, "preview");
assert.equal(draft.result.impact.budget, -34_000);
writeSimulationDraft(draft);
assert.equal(readSimulationDraft("ctx_sim")?.simulationId, draft.simulationId);

const applied = markSimulationDraftApplied(draft);
assert.equal(applied.status, "applied_to_draft");
assert.ok(applied.appliedAtIso);

assert.throws(() => assertSimulationDoesNotCommit("commit"));
assertSimulationDoesNotCommit("preview");

clearSimulationDraft("ctx_sim");
assert.equal(readSimulationDraft("ctx_sim"), null);

console.log(
  "ok what-if-simulation",
  `budget=${result.impact.budget}`,
  `distance=${result.impact.distance}`,
  `time=${result.impact.time}`,
  result.changes.map((c) => `${c.labelKo}:${c.valueKo}`).join(" | "),
);
