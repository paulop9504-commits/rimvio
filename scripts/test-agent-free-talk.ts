/**
 * Agent free-talk + conversational gate smoke.
 * Run: npx tsx scripts/test-agent-free-talk.ts
 */
import assert from "node:assert/strict";
import { looksLikeAgentFreeTalk } from "@/lib/context-run/looks-like-agent-free-talk";
import { looksLikeConversationalAsk } from "@/lib/context-run/try-apply-conversational-turn";
import { looksLikeStrictConversationalAsk } from "@/lib/context-run/try-apply-conversational-turn";
import { resolveSmallTalk } from "@/lib/globe/context-condition-ai/resolve-small-talk";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import {
  composeAgentVagueClarifyKo,
  shouldSkipAgentLoopForConversation,
} from "@/lib/context-run/compose-agent-vague-clarify";

for (const hi of ["ㅎㅇ", "안녕", "안녕하세요", "하이", "hello", "Hi!"]) {
  assert.ok(looksLikeAgentFreeTalk(hi), `free-talk: ${hi}`);
  assert.ok(resolveSmallTalk({ text: hi }), `small-talk topic: ${hi}`);
  assert.equal(isWorkspaceAgentWorkUtterance(hi), false);
  assert.ok(looksLikeConversationalAsk(hi), `conversational: ${hi}`);
}

for (const chat of ["심심하다", "ㅋㅋㅋ", "날씨 어때", "배고파", "오늘 되게 피곤해"]) {
  assert.ok(looksLikeAgentFreeTalk(chat), `free-talk: ${chat}`);
  assert.ok(looksLikeConversationalAsk(chat), `conversational: ${chat}`);
}

for (const ask of ["오사카가 뭐야", "유니버셜 스튜디오 설명해줘", "What is Namba?"]) {
  assert.equal(isWorkspaceAgentWorkUtterance(ask), false, `not work: ${ask}`);
  assert.ok(looksLikeConversationalAsk(ask), `knowledge ask: ${ask}`);
  assert.ok(looksLikeStrictConversationalAsk(ask), `strict ask: ${ask}`);
}

// Memo / marketplace — not planner small_talk
assert.equal(looksLikeStrictConversationalAsk("점심에 김치찌개 먹음"), false);
assert.equal(looksLikeStrictConversationalAsk("아이폰 팔고 싶어"), false);

for (const work of [
  "난바역 근처 호텔 찾아줘",
  "맛집도 찾아줘",
  "더 싼 곳만",
  "이 호텔 예약 준비해줘",
]) {
  assert.equal(looksLikeAgentFreeTalk(work), false, `not free-talk: ${work}`);
  assert.ok(isWorkspaceAgentWorkUtterance(work), `work: ${work}`);
  assert.equal(looksLikeConversationalAsk(work), false, `not conversational: ${work}`);
  assert.equal(shouldSkipAgentLoopForConversation(work), false);
}

{
  assert.equal(shouldSkipAgentLoopForConversation("이거 어때?"), true);
  assert.equal(shouldSkipAgentLoopForConversation("음"), true);
  const clarify = composeAgentVagueClarifyKo("이거 어때?");
  assert.ok(clarify.includes("작업장") || clarify.includes("더 싸게"));
  assert.ok(!clarify.includes("Patch"));
  // Unhandled tip must not be the only path for greetings — conversational wins.
  assert.ok(looksLikeConversationalAsk("안녕"));
}

console.log("ok — agent free-talk + conversational (안녕 → chat, not chip tip)");
