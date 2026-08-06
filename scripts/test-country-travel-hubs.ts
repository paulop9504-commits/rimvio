/**
 * Multi-hub country destinations — country frame + hub chips, city confirms.
 * Run: npx tsx scripts/test-country-travel-hubs.ts
 */

import assert from "node:assert/strict";
import { compileGlobeIngress } from "@/lib/globe-ingress";
import {
  hubChoiceRowsForCountry,
  isMultiHubCountryDestination,
  listHubLabelsForCountry,
  matchCountryTravelFrame,
  pickPromptForCountry,
} from "@/lib/globe/country-travel-hubs";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import {
  blueprintNeedsDestination,
  composeRealitySurfaceFromGlobeIngress,
  destinationChoiceLabelsForBlueprint,
  resolveDestinationFromMessage,
} from "@/lib/reality-surface";
import { resolveTripSituationRouter } from "@/lib/globe/trip-situation-router/resolve-trip-situation-router";

function testCountryFrames() {
  for (const label of [
    "필리핀",
    "일본",
    "인도네시아",
    "태국",
    "베트남",
    "그리스",
    "미국",
    "호주",
    "말레이시아",
    "한국",
  ]) {
    assert.ok(isMultiHubCountryDestination(label), `${label} multi-hub`);
    assert.equal(resolveTripContextAnchor(label), null, `${label} no capital pin`);
    const hubs = listHubLabelsForCountry(label);
    assert.ok(hubs.length >= 3, `${label} hubs`);
    assert.ok(pickPromptForCountry(label)?.includes("·"), `${label} pick prompt`);
  }
  assert.equal(matchCountryTravelFrame("보라카이"), null, "hub is not country");
  assert.ok(resolveTripContextAnchor("보라카이"), "보라카이 resolves");
  assert.ok(resolveTripContextAnchor("마닐라"), "마닐라 resolves");
  assert.ok(resolveTripContextAnchor("오사카"), "오사카 resolves");
  console.log("✓ country frames + hub resolve");
}

function testPhilippinesIngress() {
  const compiled = compileGlobeIngress({ text: "필리핀 여행" });
  const region = compiled.context.slots.find((s) => s.key === "region");
  const dest = compiled.context.slots.find((s) => s.key === "destination");
  assert.ok(region?.value && String(region.value).includes("필리핀"));
  assert.equal(dest?.resolution, "unresolved");

  const session = composeRealitySurfaceFromGlobeIngress({
    compiled,
    eventId: "evt-ph",
  });
  assert.equal(blueprintNeedsDestination(session.operatorBlueprint), true);

  const labels = destinationChoiceLabelsForBlueprint(session.operatorBlueprint);
  assert.ok(labels.includes("마닐라"));
  assert.ok(labels.includes("보라카이"));
  assert.ok(!labels.includes("오사카"), "PH hubs not Japan default");

  const router = resolveTripSituationRouter({
    layerMode: "personal",
    session,
  });
  assert.equal(router?.stage, "needs_destination");
  assert.ok(router?.reasonKo?.includes("마닐라") || router?.reasonKo?.includes("섬"));
  assert.ok(
    router?.choices.some(
      (c) =>
        c.label === "보라카이" ||
        c.submitText === "보라카이" ||
        c.label.includes("보라카이"),
    ),
  );

  assert.equal(
    resolveDestinationFromMessage("보라카이", session.operatorBlueprint),
    "보라카이",
  );
  console.log("✓ 필리핀 ingress → hub chips");
}

function testJapanStillWorks() {
  const compiled = compileGlobeIngress({ text: "일본 여행" });
  const session = composeRealitySurfaceFromGlobeIngress({
    compiled,
    eventId: "evt-jp",
  });
  const labels = destinationChoiceLabelsForBlueprint(session.operatorBlueprint);
  assert.ok(labels.includes("오사카"));
  assert.ok(labels.includes("오키나와"));
  assert.equal(resolveDestinationFromMessage("후쿠오카"), "후쿠오카");
  console.log("✓ 일본 hubs still work");
}

function testThailandIndonesia() {
  for (const [utterance, hub] of [
    ["태국 여행", "방콕"],
    ["인도네시아 여행", "발리"],
    ["그리스 여행", "산토리니"],
  ] as const) {
    const compiled = compileGlobeIngress({ text: utterance });
    const session = composeRealitySurfaceFromGlobeIngress({
      compiled,
      eventId: `evt-${hub}`,
    });
    const labels = destinationChoiceLabelsForBlueprint(session.operatorBlueprint);
    assert.ok(labels.includes(hub), `${utterance} → ${hub}`);
    const rows = hubChoiceRowsForCountry(
      session.operatorBlueprint.resourcePlan.knownTruth.find(
        (r) => r.slotId === "region",
      )?.value as string,
    );
    assert.ok(rows.some((r) => r.label === hub));
  }
  console.log("✓ TH / ID / GR country hubs");
}

function main() {
  testCountryFrames();
  testPhilippinesIngress();
  testJapanStillWorks();
  testThailandIndonesia();
  console.log("\nAll country-travel-hub tests passed.");
}

main();
