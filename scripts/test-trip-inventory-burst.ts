/**
 * L2 burstFillTripInventory — parallel-style slot inventory + pick1.
 * Run: npx tsx scripts/test-trip-inventory-burst.ts
 */
import assert from "node:assert/strict";
import {
  burstFillTripInventory,
  compileTripEntitySlots,
  materializeTripDraftStops,
  planTripDayClusters,
} from "@/lib/context-workspace";

const dayCount = 5;
const slots = compileTripEntitySlots({
  destinationKo: "오사카",
  stayLabelKo: "4박5일",
  days: dayCount,
  nights: 4,
});

const clusters = planTripDayClusters("오사카", dayCount);
assert.equal(clusters[0]!.id, "namba");
assert.equal(clusters[1]!.id, "usj");

const inventories = burstFillTripInventory({
  destinationKo: "오사카",
  slots,
  dayCount,
});

const searchable = slots.filter(
  (s) => s.entityKind === "lodging" || s.entityKind === "eatery" || s.entityKind === "itinerary",
);
const picked = inventories.filter((i) => i.picked != null);
assert.ok(
  picked.length >= searchable.length - 1,
  `expected nearly all searchable slots picked, got ${picked.length}/${searchable.length}`,
);

const ids = picked.map((i) => i.picked!.id);
assert.equal(new Set(ids).size, ids.length, "pick1 must dedupe across slots");

const { stops, seededFrom } = materializeTripDraftStops({
  destinationKo: "오사카",
  utterance: "오사카 4박5일 만들어줘",
  slots,
  dayCount,
  inventories,
});
assert.equal(seededFrom, "live_burst");
assert.ok(stops.some((s) => /유니버설|usj/iu.test(`${s.title} ${s.tags.join(" ")}`)));
assert.ok(stops.some((s) => s.tags.includes("part_morning")));
assert.ok(stops.some((s) => s.tags.includes("part_lunch")));
assert.ok(stops.some((s) => s.tags.includes("part_dinner")));

console.log("ok: trip inventory burst");
