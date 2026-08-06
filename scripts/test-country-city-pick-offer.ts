#!/usr/bin/env npx tsx
/**
 * Worldwide country → A/B/C city QUESTIONS + 기타 blank.
 * Run: npx tsx scripts/test-country-city-pick-offer.ts
 */
import assert from "node:assert/strict";

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { isCountryOrRegionDestinationLabel } from "@/lib/globe-ingress/is-country-or-region-destination";
import { listHubLabelsForCountry } from "@/lib/globe/country-travel-hubs";
import { destinationChoiceLabelsForBlueprint } from "@/lib/reality-surface/advance-ingress-flow";
import { composeTravelTripBlueprint } from "@/lib/context-blueprint/examples/travel-trip-execution-graph";
import { composeContextBlueprint } from "@/lib/context-blueprint/types";
import {
  buildCountryCityPickChoices,
  buildCountryCityPickQuestion,
  shouldOfferCountryCityPick,
} from "@/lib/globe/trip-situation-router/build-country-city-pick-offer";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";

for (const t of ["프랑스 가요", "독일로 갈게", "캐나다 간다", "이탈리아 여행"]) {
  const dest = extractTravelDestination(t);
  assert.ok(dest, `dest: ${t}`);
  assert.equal(isCountryOrRegionDestinationLabel(dest), true, `country: ${t}`);
  assert.equal(shouldOfferCountryCityPick(dest), true);
  assert.equal(isNewTripGlobeIngressUtterance(t), true, `new trip: ${t}`);
  const hubs = listHubLabelsForCountry(dest!);
  assert.ok(hubs.length >= 1, `hubs for ${dest}: ${hubs.join(",")}`);
  assert.ok(!hubs.includes("오사카"), `no Osaka fallback for ${dest}`);
  const choices = buildCountryCityPickChoices(dest!);
  assert.ok(choices[0]?.labelKo.startsWith("A ·"), `lettered A: ${choices[0]?.labelKo}`);
  assert.ok(
    choices.some((c) => c.id === "trip-dest-other" && /기타|Other/i.test(c.labelKo)),
    "기타 blank choice",
  );
  const q = buildCountryCityPickQuestion(dest!);
  assert.match(q, /도시|city|어디/i);
}

assert.equal(extractTravelDestination("파리 가요"), "파리");
assert.equal(isCountryOrRegionDestinationLabel("파리"), false);
assert.equal(shouldOfferCountryCityPick("파리"), false);

// Region France on blueprint → Paris hubs, not Japan fallback
const bp = composeTravelTripBlueprint({
  contextId: "evt-fr",
  bridgeId: "evt-fr",
  runtimeId: "rt-fr",
  goal: "프랑스 가요",
});
const withRegion = composeContextBlueprint({
  ...bp,
  resourcePlan: {
    ...bp.resourcePlan,
    knownTruth: [
      ...bp.resourcePlan.knownTruth.filter((r) => r.slotId !== "region"),
      { slotId: "region", value: "프랑스" },
    ],
    emptySlots: ["destination", ...bp.resourcePlan.emptySlots.filter((s) => s !== "destination")],
  },
});
const labels = destinationChoiceLabelsForBlueprint(withRegion);
assert.ok(labels.includes("파리"), `france hubs: ${labels.join(",")}`);
assert.ok(!labels.includes("오사카"), "no Osaka when France region");

console.log("ok — country A/B/C QUESTIONS + 기타 (no Osaka fallback)");
