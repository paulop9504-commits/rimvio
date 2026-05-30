#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  enforceConfirmationTrigger,
  hasMissingInThought,
  isFalseCompletionSummary,
} from "../lib/action-chat/confirm-enforcement";
import {
  classifyConfirmInterrupt,
  respondToConfirmSystemQuery,
} from "../lib/action-chat/confirm-interrupt";
import { isSystemQuery, looksLikePlaceInput } from "../lib/action-chat/confirm-input-guard";
import { tryBatchConfirmPriority } from "../lib/action-chat/batch-confirm-priority";
import { tryPlaceConfirmation } from "../lib/action-chat/confirmation-logic";

assert.equal(isFalseCompletionSummary("확인 완료했어요."), true);
assert.equal(hasMissingInThought("Found: x. Missing: y."), true);

assert.equal(isSystemQuery("왜 액션 안 줌??"), true);
assert.equal(isSystemQuery("왜 버튼이 안 나와?"), true);
assert.equal(looksLikePlaceInput("수서역"), true);
assert.equal(classifyConfirmInterrupt("왜 액션 안 줌??"), "system_query");
assert.equal(classifyConfirmInterrupt("수서역 맞아"), "location_correction");
assert.equal(classifyConfirmInterrupt("와 날씨 좋다"), "off_topic");

const suseo = tryBatchConfirmPriority({
  message: "3분뒤에 수서역 가야되",
  referenceDate: "2026-05-29",
});
assert.ok(suseo, "수서역 travel should trigger CONFIRM");
assert.equal(suseo!.confirmation?.meta.intent, "CONFIRM");
assert.match(suseo!.confirmation?.extracted_data?.place_name ?? "", /수서역/);
assert.ok(suseo!.thought?.includes("Missing"));

const enforced = enforceConfirmationTrigger({
  message: "3분뒤에 수서역 가야되",
  referenceDate: "2026-05-29",
  result: {
    summary: "확인 완료했어요.",
    actions: [],
    source: "openai",
    thought: "Found: 수서역. Intent: 장소 확인. Missing: 정확한 지점.",
  },
});
assert.equal(enforced.confirmation?.meta.intent, "CONFIRM");
assert.notEqual(enforced.summary, "확인 완료했어요.");

const placeOnly = tryPlaceConfirmation({
  message: "3분뒤에 수서역 가야되",
  referenceDate: "2026-05-29",
});
assert.ok(placeOnly?.confirmation);

const systemReply = respondToConfirmSystemQuery(
  [
    {
      id: "a1",
      role: "assistant",
      text: "수서역 맞죠?",
      createdAt: "2026-05-29T10:00:00.000Z",
      pendingConfirm: true,
      confirmation: { meta: { intent: "CONFIRM" } },
    },
  ],
  "a1",
  { id: "u1", role: "user", text: "왜 액션 안 줌??", createdAt: "2026-05-29T10:01:00.000Z" }
);
assert.equal(systemReply.at(-1)?.role, "assistant");
assert.match(systemReply.at(-1)?.text ?? "", /아직 장소 확인/);
assert.equal(
  systemReply.find((m) => m.id === "a1")?.confirmation?.meta.intent,
  "CONFIRM"
);

console.log("test-confirm-enforcement: ok");
