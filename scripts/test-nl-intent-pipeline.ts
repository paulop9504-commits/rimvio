#!/usr/bin/env npx tsx
/**
 * NL intent compiler stage — pipeline integration smoke tests.
 */

import assert from "node:assert/strict";
import { NL_PIPELINE_STAGES } from "../lib/context-run/natural-language-pipeline";
import {
  compileNlIntentFrame,
  isCommerceCapabilityIntent,
  runNlIntentCompilerStage,
} from "../lib/context-run/compile-nl-intent";
import { planObjectDiscovery } from "../lib/context-run/object-discovery";
import {
  clearCapabilityIndexForTests,
  registerCapabilityIndexFromManifest,
} from "../lib/platform-sdk/capability-index";
import { capabilityDraftToPlatformManifest } from "../lib/hub/capability/manifest-bridge";
import { createDefaultCapabilityDraft } from "../lib/hub/capability/defaults";
import { openMapContextWorkspace } from "../lib/context-workspace/open-map-workspace";
import { clearContextWorkspace } from "../lib/context-workspace/workspace-store";

assert.ok(NL_PIPELINE_STAGES.includes("intent_compiler"));
assert.equal(
  NL_PIPELINE_STAGES.indexOf("intent_compiler"),
  NL_PIPELINE_STAGES.indexOf("intent_parser") + 1,
);

const sellUtterance = "내 자전거 팔고 싶어";
const sellIntent = compileNlIntentFrame(sellUtterance);
assert.ok(sellIntent);
assert.equal(sellIntent!.action, "sell");
assert.equal(sellIntent!.object, "bicycle");
assert.equal(sellIntent!.market, "KR");
assert.ok(isCommerceCapabilityIntent(sellIntent!, sellUtterance));

const hotelUtterance = "오사카 호텔 찾아";
const hotelIntent = compileNlIntentFrame(hotelUtterance);
assert.ok(hotelIntent);
assert.equal(
  isCommerceCapabilityIntent(hotelIntent!, hotelUtterance),
  false,
  "lodging search must not route to commerce capability discovery",
);

const compiled = runNlIntentCompilerStage(sellUtterance);
assert.equal(compiled.commerceCapability, true);
assert.ok(compiled.workLogKo?.includes("sell"));

clearCapabilityIndexForTests();
const draft = createDefaultCapabilityDraft();
draft.id = "bike-market";
draft.name = "Bike Market";
const manifest = capabilityDraftToPlatformManifest(draft);
registerCapabilityIndexFromManifest(manifest, "published");

const contextEventId = "test-nl-intent-pipeline";
clearContextWorkspace(contextEventId);
openMapContextWorkspace({
  contextEventId,
  domain: "lodging",
  query: "test",
  summaryKo: "test",
  candidates: [],
  source: "scout_patch",
});

const plan = planObjectDiscovery({
  contextEventId,
  utterance: sellUtterance,
  mode: "replace",
  intentFrame: sellIntent,
});
assert.ok(plan?.hubCapability, "commerce utterance should plan capability discovery first");
assert.equal(plan!.hubCapability!.marketCountry, "KR");

const lodgingPlan = planObjectDiscovery({
  contextEventId,
  utterance: hotelUtterance,
  mode: "replace",
  intentFrame: hotelIntent,
});
assert.equal(lodgingPlan?.hubCapability ?? null, null);

clearContextWorkspace(contextEventId);
console.log("nl-intent-pipeline: ok");
