#!/usr/bin/env npx tsx
/**
 * Field Commit = Reserve/Purchase + reservedOpIds only.
 * Condition edits = soft confirm chips (Filter / Pin / Delete / Revise).
 */

import assert from "node:assert/strict";
import {
  COMMIT_REQUIRED_INTENTS,
  SOFT_CONFIRM_INTENTS,
  evaluateUtteranceRules,
  ruleRequiresFieldCommit,
} from "../lib/rule-engine";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
  readSessionGraph,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import {
  applySoftConfirmPending,
  clearSoftConfirmPending,
  readSoftConfirmPending,
} from "../lib/globe/soft-confirm";

assert.ok(COMMIT_REQUIRED_INTENTS.has("Reserve"));
assert.ok(COMMIT_REQUIRED_INTENTS.has("Purchase"));
assert.ok(!COMMIT_REQUIRED_INTENTS.has("Delete"));
assert.ok(!COMMIT_REQUIRED_INTENTS.has("Share"));
assert.ok(SOFT_CONFIRM_INTENTS.has("Filter"));
assert.ok(SOFT_CONFIRM_INTENTS.has("Pin"));
assert.ok(SOFT_CONFIRM_INTENTS.has("Delete"));
assert.ok(SOFT_CONFIRM_INTENTS.has("Revise"));

{
  const del = evaluateUtteranceRules({ utterance: "빼줘" });
  assert.equal(del.requiresCommit, false);
  assert.equal(del.requiresSoftConfirm, true);
  assert.equal(ruleRequiresFieldCommit(del, []), false);

  const share = evaluateUtteranceRules({ utterance: "공유해줘" });
  assert.equal(share.requiresCommit, false);
  assert.equal(ruleRequiresFieldCommit(share, []), false);

  const reserve = evaluateUtteranceRules({ utterance: "예약해" });
  assert.equal(reserve.requiresCommit, true);
  assert.equal(ruleRequiresFieldCommit(reserve, []), true);
  assert.equal(ruleRequiresFieldCommit(reserve, ["op-1"]), true);
}

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
clearSoftConfirmPending("evt-soft");

tryRunGraphCommandOs({
  utterance: "APA호텔 찾아줘",
  contextEventId: "evt-soft",
  anchorLat: 34.6654,
  anchorLng: 135.5019,
});

{
  const pin = runNaturalLanguagePipeline({
    utterance: "APA호텔 고정해",
    contextEventId: "evt-soft",
    anchorLat: 34.6654,
    anchorLng: 135.5019,
  });
  assert.equal(pin.result?.via, "soft_confirm");
  assert.equal(pin.result?.waitingCommit, false);
  assert.ok(readSoftConfirmPending("evt-soft"));

  const applied = applySoftConfirmPending({ contextEventId: "evt-soft" });
  assert.ok(applied.ok);
  const graph = readSessionGraph("evt-soft");
  assert.ok(graph?.nodes.some((n) => /apa|아파/iu.test(n.labelKo) && n.pinned));
}

{
  clearSoftConfirmPending("evt-soft-del");
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  tryRunGraphCommandOs({
    utterance: "APA호텔 찾아줘",
    contextEventId: "evt-soft-del",
    anchorLat: 34.6654,
    anchorLng: 135.5019,
  });
  // Pin first without soft path for delete target — use graph OS directly for seed
  tryRunGraphCommandOs({
    utterance: "APA호텔 고정해",
    contextEventId: "evt-soft-del",
  });
  // After soft-confirm wiring, pin goes through soft — apply if pending
  const pendingPin = readSoftConfirmPending("evt-soft-del");
  if (pendingPin) {
    applySoftConfirmPending({ contextEventId: "evt-soft-del" });
  }

  const del = runNaturalLanguagePipeline({
    utterance: "APA 삭제해",
    contextEventId: "evt-soft-del",
  });
  // May be soft_confirm or clarify — never Field waitingCommit
  if (del.result) {
    assert.equal(del.result.waitingCommit, false);
    if (del.result.via === "soft_confirm") {
      assert.ok(readSoftConfirmPending("evt-soft-del"));
    }
  }
}

{
  const filter = runNaturalLanguagePipeline({
    utterance: "걸어서 10분 안쪽",
    contextEventId: "evt-soft",
  });
  assert.equal(filter.result?.via, "soft_confirm");
  assert.equal(filter.result?.waitingCommit, false);
}

{
  const revise = runNaturalLanguagePipeline({
    utterance: "5박6일로 갈게",
    contextEventId: "evt-soft",
  });
  // May clarify without event slots — still not Field
  if (revise.result) {
    assert.equal(revise.result.waitingCommit, false);
  }
}

console.log("ok — soft-confirm-field-gate");
