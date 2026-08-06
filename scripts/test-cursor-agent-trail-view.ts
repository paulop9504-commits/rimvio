#!/usr/bin/env npx tsx
/**
 * Cursor-like Agent Activity Trail view model.
 * Run: npx tsx scripts/test-cursor-agent-trail-view.ts
 */
import assert from "node:assert/strict";
import {
  beginAgentActivityTranscript,
  appendAgentActivityEvent,
  clearAgentActivityTranscriptForTests,
  finishAgentActivityTranscript,
  readAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { buildCursorAgentTrailView } from "@/lib/ui/build-cursor-agent-trail-view";

clearAgentActivityTranscriptForTests();
beginAgentActivityTranscript({
  contextEventId: "ctx_trail_ui",
  utterance: "너가 세워줘",
});
appendAgentActivityEvent({
  kind: "explore",
  labelKo: "장소·일정 후보 탐색",
  detailKo: null,
  stage: "object_discovery",
});
appendAgentActivityEvent({
  kind: "tool",
  labelKo: "숙소 후보 조회",
  detailKo: "가성비 상위",
  stage: "object_enrichment",
});

const running = buildCursorAgentTrailView(readAgentActivityTranscript());
assert.ok(running);
assert.match(running!.summaryLineKo, /명령/);
assert.equal(running!.goalKo, "너가 세워줘");
assert.ok(running!.exploredLineKo);
assert.equal(running!.nested?.auto, true);
assert.equal(running!.nested?.active, true);
assert.ok(running!.waitLineKo);
assert.equal(running!.finished, false);

finishAgentActivityTranscript({ summaryKo: "반영 완료" });
const done = buildCursorAgentTrailView(readAgentActivityTranscript());
assert.ok(done);
assert.equal(done!.finished, true);
assert.equal(done!.waitLineKo, null);
assert.ok(done!.doneLineKo);

console.log("test-cursor-agent-trail-view: ok");
