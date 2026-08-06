/**
 * Intent Switch — Current message > Conversation history.
 * Run: npx tsx scripts/test-intent-switch-current-message.ts
 */

import assert from "node:assert/strict";
import { resolveCurrentMessageIntent } from "@/lib/context-run/resolve-current-message-intent";
import { tryApplyConversationalTurn } from "@/lib/context-run/try-apply-conversational-turn";

{
  const math = resolveCurrentMessageIntent("1+1=?");
  assert.equal(math.kind, "math_direct");
  assert.equal(math.pauseTravelContext, true);
  assert.equal(math.directAnswerKo, "2");
}

{
  const travel = resolveCurrentMessageIntent("액티비티 많은 여행");
  assert.equal(travel.kind, "continue");
  assert.equal(travel.pauseTravelContext, false);
}

{
  const osaka = resolveCurrentMessageIntent("오사카로 여행감");
  assert.equal(osaka.kind, "continue");
}

void (async () => {
  const history = [
    { role: "user" as const, text: "나 오사카로 여행감" },
    {
      role: "assistant" as const,
      text: "오사카로 여행 가시는군요! 계획은 세우셨어요?",
    },
    { role: "user" as const, text: "아직 안세웠어 너가 세워줘" },
    {
      role: "assistant" as const,
      text: "어떤 여행을 기대하고 계신가요?",
    },
    { role: "user" as const, text: "액티비티 많은 여행" },
    {
      role: "assistant" as const,
      text: "여행 준비는 좀 진행되고 있으실까요?",
    },
  ];

  const turn = await tryApplyConversationalTurn({
    utterance: "1+1=?",
    history,
    scopeId: "test-intent-switch",
  });
  assert.ok(turn);
  assert.equal(turn!.replyKo, "2");
  assert.equal(turn!.pausedTravelContext, true);
  assert.ok(!/지난번|액티비티|오사카|여행/u.test(turn!.replyKo));

  console.log("OK — intent-switch-current-message (1+1=? → 2, travel paused)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
