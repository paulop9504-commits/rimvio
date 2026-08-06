/**
 * P0 Agent Trust Guards smoke.
 * Run: npx tsx scripts/test-agent-p0-guards.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace";
import { runAgentP0Guards } from "@/lib/agent-policy/run-agent-p0-guards";
import { fingerprintScoutQuery, buildScoutFingerprintParts } from "@/lib/agent-policy/scout-query-fingerprint";

const CTX = "ctx_p0_guards";

clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "Osaka Trip",
  candidates: [],
});

const first = runAgentP0Guards({
  contextEventId: CTX,
  utterance: "오사카 호텔 찾아줘",
  scoutMode: "replace",
});
assert.equal(first.job.target, "lodging");
assert.equal(first.switchJob, true);
assert.equal(first.allowSoftNextAuto, false);
assert.ok(first.job.id);

const fp1 = first.scoutFingerprint;
const after1 = readContextWorkspace(CTX);
assert.equal(after1?.agentJob?.id, first.job.id);
assert.equal(after1?.lastScoutFingerprint, fp1);

const soft = runAgentP0Guards({
  contextEventId: CTX,
  utterance: "더 싸게",
  scoutMode: "refine",
});
assert.equal(soft.switchJob, false);
assert.equal(soft.job.intent, "refine");

const priced = runAgentP0Guards({
  contextEventId: CTX,
  utterance: "10만원 이하로 다시 찾아줘",
  scoutMode: "replace",
});
assert.equal(priced.forceReplaceScout, true);
assert.ok(priced.scoutFingerprint !== fp1);
assert.ok(
  priced.statusHintKo?.includes("조건") ||
    priced.statusHintKo?.includes("다시") ||
    priced.switchJob,
);

const near = runAgentP0Guards({
  contextEventId: CTX,
  utterance: "모리노미아역 근처 호텔",
  lat: 34.6814,
  lng: 135.5342,
  patchKind: "spatial_constraint",
});
assert.equal(near.forceReplaceScout, true);
assert.ok(near.scoutFingerprint.includes("모리노미아"));

const fpParts = buildScoutFingerprintParts({
  utterance: "모리노미아역 근처 호텔",
  mode: "replace",
  lat: 34.6814,
  lng: 135.5342,
});
assert.equal(fingerprintScoutQuery(fpParts), near.scoutFingerprint);

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  agentJob: null,
  lastScoutFingerprint: null,
});
clearContextWorkspace(CTX);

console.log("ok — agent P0 guards (job · stale · scope · fingerprint)");
