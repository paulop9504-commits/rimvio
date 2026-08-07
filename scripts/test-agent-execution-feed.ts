#!/usr/bin/env npx tsx
/**
 * Execution Feed view — append-only done → running rows.
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
  utterance: "오사카 난바역 근처 캡슐호텔로 찾아줘",
});
appendAgentActivityEvent({
  kind: "explore",
  labelKo: "Searching places",
  stage: "object_discovery",
});
appendAgentActivityEvent({
  kind: "tool",
  labelKo: "Comparing hotels",
  detailKo: "가성비 상위",
  stage: "candidate_evaluation",
});

const running = buildAgentExecutionFeedView(readAgentActivityTranscript(), 40);
assert.ok(running);
assert.equal(running!.running, true);
assert.equal(running!.utterance.includes("캡슐호텔"), true);
assert.ok(running!.rows.length >= 2);
assert.equal(running!.rows[running!.rows.length - 1]!.status, "running");
assert.equal(running!.rows[0]!.status, "done");
assert.equal(running!.progressPercent, 40);

finishAgentActivityTranscript({ summaryKo: "반영" });
const done = buildAgentExecutionFeedView(readAgentActivityTranscript());
assert.ok(done);
assert.equal(done!.running, false);
assert.ok(done!.rows.every((r) => r.status === "done"));
assert.ok(done!.rows.some((r) => /Ready/i.test(r.labelKo)));

console.log("test-agent-execution-feed: ok");
