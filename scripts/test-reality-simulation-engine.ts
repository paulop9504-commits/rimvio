/**
 * Smoke: Reality Simulation Engine — Draft → Simulation → Impact.
 * UX: 호텔 변경하면? · 가격 -3만원 · 이동 +5분 · 일정 영향
 * SIMULATION_ONLY — Reality 변경 금지.
 */
import assert from "node:assert/strict";
import { createDraft, clearDraftsForTests } from "@/lib/draft";
import {
  assertSimulationOnly,
  buildRealityStateSlice,
  clearSimulationsForTests,
  formatHotelChangeSimulationUxKo,
  formatPriceManwonUx,
  listSimulations,
  readSimulation,
  rejectRealityMutationFromSimulation,
  runRealitySimulation,
  simulateFromDraft,
  simulateHotelChange,
  simulateHotelChangeFromSlices,
  SIMULATION_STATUS,
} from "@/lib/simulation-engine";

clearSimulationsForTests();
clearDraftsForTests();

assert.equal(formatPriceManwonUx(-30_000), "가격 -3만원");
assert.equal(formatPriceManwonUx(50_000), "가격 +5만원");

// STEP 9 UX scenario: -3만원 · +5분 · 일정 영향
const hotelA = buildRealityStateSlice({
  objectId: "hotel_a",
  title: "Namba Hotel",
  kind: "hotel",
  priceWon: 150_000,
  priceLabelKo: "150,000원",
  rating: 4.5,
  travelMinutes: 20,
  lat: 34.665,
  lng: 135.5,
  attrs: {
    relatedPlaceIds: ["food_1", "usj"],
    scheduleLoadMinutes: 40,
  },
});

const hotelB = buildRealityStateSlice({
  objectId: "hotel_b",
  title: "Budget Capsule",
  kind: "hotel",
  priceWon: 120_000,
  priceLabelKo: "120,000원",
  rating: 4.3,
  travelMinutes: 25,
  lat: 34.67,
  lng: 135.51,
  attrs: {
    relatedPlaceIds: ["food_1", "dotonbori"],
    scheduleLoadMinutes: 48,
  },
});

const result = simulateHotelChange({
  workspaceId: "ws-sim-step9",
  current: hotelA,
  candidate: hotelB,
});

assert.equal(result.status, SIMULATION_STATUS);
assert.equal(result.status, "SIMULATION_ONLY");
assert.equal(result.draftId, null);
assert.equal(result.impact.priceWonDelta, -30_000);
assert.equal(result.impact.travelMinutesDelta, 5);
assert.ok(result.impact.distanceMetersDelta == null || result.impact.distanceMetersDelta > 0);
assert.ok(result.impact.scheduleImpactKo);
assert.ok(/일정 영향/.test(result.impact.scheduleImpactKo!));
assert.ok(result.impact.relationsSummaryKo);
assert.ok(result.impact.uxLinesKo.includes("가격 -3만원"));
assert.ok(result.impact.uxLinesKo.includes("이동 +5분"));
assert.ok(result.impact.uxLinesKo.some((l) => /일정 영향/.test(l)));
assert.deepEqual(result.impact.details.axes, [
  "price",
  "distance",
  "schedule",
  "relations",
]);

const ux = formatHotelChangeSimulationUxKo(result);
assert.ok(ux.startsWith("호텔 변경하면?"));
assert.ok(ux.includes("가격 -3만원"));
assert.ok(ux.includes("이동 +5분"));
assert.ok(ux.includes("일정 영향"));

// Draft → Simulation → Impact
const draft = createDraft({
  workspaceId: "ws-sim-step9",
  before: { labelKo: "Namba Hotel", visibleCount: 1, hotelType: "business" },
  after: { labelKo: "Budget Capsule", visibleCount: 1, hotelType: "capsule" },
  sourceText: "호텔 변경하면?",
});
assert.equal(draft.status, "proposed");

const fromDraft = simulateFromDraft({
  draft,
  current: hotelA,
  candidate: hotelB,
});
assert.equal(fromDraft.status, "SIMULATION_ONLY");
assert.equal(fromDraft.draftId, draft.id);
assert.equal(fromDraft.impact.priceWonDelta, -30_000);

const viaSlices = simulateHotelChangeFromSlices({
  workspaceId: "ws-sim-step9",
  draftId: draft.id,
  before: {
    objectId: "a",
    title: "A",
    priceWon: 150_000,
    travelMinutes: 20,
    relatedPlaceIds: ["x"],
  },
  after: {
    objectId: "b",
    title: "B",
    priceWon: 120_000,
    travelMinutes: 25,
    relatedPlaceIds: ["x", "y"],
  },
});
assert.equal(viaSlices.impact.priceWonDelta, -30_000);
assert.equal(viaSlices.impact.travelMinutesDelta, 5);

// Gate: Reality mutate ops throw
assert.throws(() => assertSimulationOnly("commit"));
assert.throws(() => assertSimulationOnly("mutate_reality"));
assert.throws(() => rejectRealityMutationFromSimulation("write_reality"));

const viaChange = runRealitySimulation({
  workspaceId: "ws-sim-step9",
  draftId: draft.id,
  current: hotelA,
  change: {
    kind: "replace_hotel",
    target: hotelB,
    labelKo: "Hotel A → Hotel B",
  },
});
assert.equal(viaChange.status, "SIMULATION_ONLY");
assert.equal(viaChange.draftId, draft.id);
assert.ok(readSimulation(viaChange.simulationId));
assert.ok(listSimulations("ws-sim-step9").length >= 3);

clearSimulationsForTests();
clearDraftsForTests();

console.log(
  "ok reality-simulation-engine Draft→Sim→Impact 가격-3만원 이동+5분 일정영향 SIMULATION_ONLY",
);
