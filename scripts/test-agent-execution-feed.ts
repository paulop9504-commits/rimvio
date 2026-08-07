#!/usr/bin/env npx tsx
/**
 * Execution Feed — short EN append-only timeline (no %).
 * Run: npx tsx scripts/test-agent-execution-feed.ts
 */
import assert from "node:assert/strict";
import {
  beginAgentActivityTranscript,
  appendAgentActivityEvent,
  clearAgentActivityTranscriptForTests,
  finishAgentActivityTranscript,
  readAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { buildAgentExecutionFeedView } from "@/lib/ui/build-agent-execution-feed";

clearAgentActivityTranscriptForTests();
beginAgentActivityTranscript({
  contextEventId: "ctx_feed",
  utterance: "오사카성 찾아줘",
});
appendAgentActivityEvent({
  kind: "explore",
  labelKo: "후보 검색 중…",
  stage: "object_discovery",
});
appendAgentActivityEvent({
  kind: "tool",
  labelKo: "후보 평가 중…",
  detailKo: "장문 설명은 버리면 안 됨",
  metricKo: "탐색 3건",
  stage: "candidate_evaluation",
});

const running = buildAgentExecutionFeedView(readAgentActivityTranscript(), 99);
assert.ok(running);
assert.equal(running!.running, true);
assert.equal(running!.rows[running!.rows.length - 1]!.status, "running");
assert.match(running!.rows[running!.rows.length - 1]!.label, /Ranking|Searching/);
assert.ok(!("progressPercent" in running!));
for (const row of running!.rows) {
  assert.ok(row.label.split(/\s+/).length <= 5);
  assert.doesNotMatch(row.label, /탐색 3건|7개|중이에요/);
}

finishAgentActivityTranscript({ summaryKo: "작업 반영했어요" });
const done = buildAgentExecutionFeedView(readAgentActivityTranscript());
assert.ok(done);
assert.equal(done!.running, false);
assert.equal(done!.rows[done!.rows.length - 1]!.label, "Done.");
assert.ok(done!.rows.every((r) => r.status === "done"));

console.log("test-agent-execution-feed: ok");
