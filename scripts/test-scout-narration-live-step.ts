/**
 * Live Narrator step append — stays in the stream, not a chat bubble.
 */
import assert from "node:assert/strict";
import {
  appendScoutNarrationComposeTurn,
  appendScoutNarrationLiveStep,
  clearContextAgentComposeThread,
  markScoutNarrationComposeDone,
  readContextAgentComposeThread,
} from "../lib/globe/assistant/context-agent-compose-thread-store";

const eventId = "test-narration-live-event";
clearContextAgentComposeThread(eventId);

const turn = appendScoutNarrationComposeTurn(eventId, {
  understandingKo: "이해했습니다.\n도쿄를 기준으로 찾겠습니다.",
  steps: [{ id: "analyze", textKo: "🧠 이번 요청 분석 중…" }],
  status: "running",
  mode: "Replace",
  entityLabelKo: "말차",
  domain: "Lodging",
});

assert.equal(turn.kind, "scout_narration");

const added = appendScoutNarrationLiveStep(eventId, {
  id: "widen",
  textKo: "🔄 범위를 넓혀 다시 찾는 중이에요…",
});
assert.equal(added, true);

markScoutNarrationComposeDone(eventId, turn.id);
const revived = appendScoutNarrationLiveStep(eventId, {
  id: "phase_optimizing",
  textKo: "⚙️ 추천 순위를 맞추는 중…",
});
assert.equal(revived, true);

const rows = readContextAgentComposeThread(eventId);
const narration = rows.find((row) => row.kind === "scout_narration");
assert.ok(narration && narration.kind === "scout_narration");
assert.equal(narration.payload.status, "running");
assert.equal(narration.payload.steps.length, 3);
assert.equal(
  narration.payload.steps.some((s) => s.id === "widen"),
  true,
);

const dup = appendScoutNarrationLiveStep(eventId, {
  id: "widen",
  textKo: "중복",
});
assert.equal(dup, false);

clearContextAgentComposeThread(eventId);
console.log("test-scout-narration-live-step: ok");
