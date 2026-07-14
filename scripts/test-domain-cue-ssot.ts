#!/usr/bin/env npx tsx
/**
 * Domain cue SSOT — hostel is lodging everywhere; scout recovery keeps prior intent.
 */
import assert from "node:assert/strict";
import { hasLodgingDomainCue } from "../lib/globe/domain-cues/lodging-domain-cues";
import { parseLodgingKindFromText } from "../lib/globe/domain-cues/lodging-domain-cues";
import { resolveScoutRecoverySeed } from "../lib/globe/domain-cues/resolve-scout-recovery-seed";
import { isLodgingBookingQuery } from "../lib/globe/context-hub/lodging-booking-slots";
import { isLodgingPrepUtterance } from "../lib/globe/lodging-prep/is-lodging-prep-utterance";
import { isAmbiguousDiscoveryIntent } from "../lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import { isLodgingDiscoveryMessage } from "../lib/globe/discovery-lens/integrate-context-agent-lens";
import { hasNarrowCategorySignal } from "../lib/container-ai/classify-travel-request-scope";
import { appendContextAgentComposeTurn } from "../lib/globe/assistant/context-agent-compose-thread-store";
import { writeActiveDiscoveryExecution } from "../lib/globe/discovery-execution/read-active-discovery-execution";
import { resetScoutRecoveryMemoryForTests } from "../lib/globe/operator-turn/offer-scout-fail-recovery-client";

const evt = "cue-ssot-test-evt";

assert.equal(hasLodgingDomainCue("게스트하우스"), true);
assert.equal(hasLodgingDomainCue("하루 3만원 미만 게스트 하우스"), true);
assert.equal(parseLodgingKindFromText("게스트하우스 찾아줘"), "hostel");
assert.equal(isLodgingBookingQuery("게스트하우스"), true);
assert.equal(isLodgingPrepUtterance("게스트하우스 찾아줘"), true);
assert.equal(isLodgingDiscoveryMessage("호스텔"), true);
assert.equal(isAmbiguousDiscoveryIntent("게스트하우스"), false);
assert.equal(hasNarrowCategorySignal("게스트하우스만"), true);

appendContextAgentComposeTurn(evt, {
  role: "user",
  text: "게스트하우스 하루 3만원 미만으로 찾아줘",
});
writeActiveDiscoveryExecution(evt, {
  batchId: "b1",
  count: 0,
  summaryKo: "",
  atIso: new Date().toISOString(),
  triggerMessage: "게스트하우스 하루 3만원 미만으로 찾아줘",
  recommendations: [],
});

const seed = resolveScoutRecoverySeed({
  contextEventId: evt,
  engineId: "lodging_search",
});
assert.ok(/게스트|호스텔|3만/iu.test(seed), `expected hostel/price preserve, got: ${seed}`);
assert.ok(!/^주변 호텔/iu.test(seed), `must not wipe to hotel: ${seed}`);

const bareDefault = resolveScoutRecoverySeed({
  contextEventId: "no-history-evt",
  engineId: "lodging_search",
});
assert.ok(/숙소/iu.test(bareDefault));
assert.ok(!/호텔/iu.test(bareDefault));

resetScoutRecoveryMemoryForTests();
console.log("✓ domain cue SSOT + scout recovery intent preserve");
