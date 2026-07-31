/**
 * Route cap + weather indoor swap + guide web seed.
 * Run: npx tsx scripts/test-trip-draft-refine.ts
 */
import assert from "node:assert/strict";
import {
  burstFillTripInventory,
  compileTripEntitySlots,
  estimateWalkMinutes,
  guideWebSeedHits,
  materializeTripDraftStops,
  refineTripDraftStops,
  refineTripDraftWeatherSwap,
  TRIP_DRAFT_MAX_LEG_MINUTES,
  utteranceSuggestsRain,
} from "@/lib/context-workspace";

assert.equal(utteranceSuggestsRain("오사카 비 오면 실내로"), true);
assert.equal(utteranceSuggestsRain("오사카 4박5일"), false);

const guide = guideWebSeedHits({
  destinationKo: "오사카",
  clusterId: "namba",
  dayPart: "morning",
  domain: "poi",
});
assert.ok(guide.some((h) => /쿠로몬|난바 파크스/u.test(h.labelKo)));
assert.ok(guide.every((h) => h.source === "review"));

const dayCount = 5;
const slots = compileTripEntitySlots({
  destinationKo: "오사카",
  stayLabelKo: "4박5일",
  days: dayCount,
  nights: 4,
});
const inventories = burstFillTripInventory({
  destinationKo: "오사카",
  slots,
  dayCount,
});
const { stops } = materializeTripDraftStops({
  destinationKo: "오사카",
  utterance: "오사카 4박5일 만들어줘",
  slots,
  dayCount,
  inventories,
});

const dry = refineTripDraftStops({
  stops,
  slots,
  inventories,
  utterance: "오사카 4박5일 만들어줘",
  destinationKo: "오사카",
});
assert.equal(dry.rainy, false);
assert.ok(dry.stops.some((s) => /유니버설|usj/iu.test(`${s.title} ${s.tags.join(" ")}`)));

// Force a far outdoor stop then rain-swap
const outdoor = dry.stops.find(
  (s) => s.kind === "poi" && s.indoor === false && !/공항/u.test(s.title),
);
assert.ok(outdoor);
const rainy = refineTripDraftWeatherSwap({
  stops: dry.stops,
  slots,
  inventories,
  rainy: true,
});
assert.ok(rainy.swapped >= 1, `expected indoor swap, got ${rainy.swapped}`);
assert.ok(
  rainy.stops.some((s) => s.tags.includes("weather_indoor_swap")),
);

const wet = refineTripDraftStops({
  stops,
  slots,
  inventories,
  utterance: "오사카 비 오면 일정 짜줘",
  destinationKo: "오사카",
});
assert.equal(wet.rainy, true);

const mins = estimateWalkMinutes(34.6654, 135.5019, 34.6687, 135.5013);
assert.ok(mins < TRIP_DRAFT_MAX_LEG_MINUTES);

console.log("ok: trip draft refine (route · weather · guide)");
