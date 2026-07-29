/**
 * Tokyo travel hub — lodging scout must continue, not spawn / fallback.
 * Run: npx tsx scripts/test-tokyo-lodging-continue.ts
 */

import assert from "node:assert/strict";
import { routeRimvioCommandMode } from "@/lib/rimvio-command/route-command-mode";
import {
  resolveIngressContextEventId,
  shouldSpawnNewContext,
} from "@/lib/context-run/should-spawn-new-context";
import { recoverUnmatchedNlTurn } from "@/lib/context-run/recover-unmatched-nl-turn";
import type { ContextPackV1 } from "@/lib/context-builder";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";

const CTX = "ctx-tokyo-trip";

assert.equal(
  shouldSpawnNewContext({
    utterance: "숙소 찾아줘",
    activeContextEventId: CTX,
    activeWorkspaceKind: "travel",
  }),
  false,
);

assert.equal(
  resolveIngressContextEventId({
    utterance: "숙소 찾아줘",
    activeContextEventId: CTX,
    activeWorkspaceKind: "travel",
  }),
  CTX,
);

const route = routeRimvioCommandMode({
  utterance: "숙소 찾아줘",
  activeContextId: CTX,
  activeWorkspaceKind: "travel",
});
assert.equal(route.mode, "continue");
assert.equal(route.reason, "active_domain_scout");

const continueOnly = routeRimvioCommandMode({
  utterance: "이 맥락에 이어서",
  activeContextId: CTX,
  activeWorkspaceKind: "travel",
});
assert.equal(continueOnly.mode, "continue");

const pack = {
  version: 1,
  contextEventId: CTX,
  lodgingDiff: null,
} as unknown as ContextPackV1;

const decision = {
  intent: "Unknown",
  allowLlmReasoning: true,
} as unknown as RuleEngineDecision;

const recovered = recoverUnmatchedNlTurn({
  utterance: "이 맥락에 이어서",
  contextEventId: CTX,
  ruleDecision: decision,
  pack,
  graph: null,
});
assert.match(recovered.assistantReplyKo, /이어서/);
assert.ok(recovered.clarifyChips.some((c) => c.value === "숙소 찾아줘"));

console.log("OK — tokyo lodging continue");
