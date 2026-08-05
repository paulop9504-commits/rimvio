/**
 * Cursor-like Agent Activity transcript.
 * Run: npx tsx scripts/test-agent-activity-transcript.ts
 */

import assert from "node:assert/strict";
import {
  beginAgentActivityTranscript,
  appendAgentActivityEvent,
  appendAgentActivityForStage,
  finishAgentActivityTranscript,
  formatAgentActivityElapsed,
  readAgentActivityTranscript,
  clearAgentActivityTranscriptForTests,
  beginAgentProductTurn,
  clearLastAgentProductTurnForTests,
} from "@/lib/context-run";

clearAgentActivityTranscriptForTests();
clearLastAgentProductTurnForTests();

beginAgentProductTurn({
  contextEventId: "ctx-activity-1",
  utterance: "유니버셜 스튜디오 근처 숙소 찾아줘",
});

let t = readAgentActivityTranscript();
assert.ok(t);
assert.equal(t!.running, true);
assert.ok(t!.events.some((e) => e.kind === "thought"));

appendAgentActivityForStage("planner", {
  detailKo: "Resolve Anchor → Search lodging",
});
appendAgentActivityEvent({
  kind: "explore",
  labelKo: "후보 검색 중…",
  metricKo: "hotel.lookup",
  stage: "object_discovery",
});
appendAgentActivityEvent({
  kind: "patch",
  labelKo: "Workspace에 후보를 반영해요",
  metricKo: "+4",
  stage: "workspace_patch",
});
finishAgentActivityTranscript({
  summaryKo: "숙소 후보 4곳 준비했어요",
});

t = readAgentActivityTranscript();
assert.equal(t!.running, false);
assert.ok(t!.endedAtMs);
assert.ok(formatAgentActivityElapsed(t).length > 0);
assert.ok(t!.events.length >= 4);

console.log("OK — agent-activity-transcript");
