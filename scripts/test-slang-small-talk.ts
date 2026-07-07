#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { resolveSmallTalk } from "../lib/globe/context-condition-ai/resolve-small-talk";
import {
  detectSlangTopic,
  looksLikeUnknownSlang,
} from "../lib/globe/context-condition-ai/small-talk/slang-lexicon";
import { generateSmallTalkReply } from "../lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import {
  readPendingSlangLearn,
  resetSlangMemoryForTests,
} from "../lib/globe/context-condition-ai/small-talk/slang-memory-store";

const NOW = new Date(2026, 6, 8, 14, 0);

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- Lexicon maps slang to mood/intent ---
ok("킹받네 → mood_down", detectSlangTopic("킹받네")?.topic === "mood_down");
ok("갓생 → mood_up", detectSlangTopic("오늘부터 갓생 산다")?.topic === "mood_up");
ok("ㅇㅈ → ack", detectSlangTopic("ㅇㅈ")?.topic === "ack");
ok("내또출 → time_state", detectSlangTopic("내또출ㅠㅠ")?.topic === "time_state");

// --- Detector treats slang as chat (never search) ---
ok("킹받네 is small talk", resolveSmallTalk({ text: "킹받네", now: NOW })?.topic === "mood_down");
ok("갓생 is small talk", resolveSmallTalk({ text: "갓생 살자", now: NOW })?.topic === "mood_up");
ok("ㅇㅈ is small talk", resolveSmallTalk({ text: "ㅇㅈ", now: NOW })?.topic === "ack");

// --- Emotion from emoji even when opaque ---
ok("negative emoji → mood_down", resolveSmallTalk({ text: "하 진짜 😤", now: NOW })?.topic === "mood_down");
ok("positive emoji → mood_up", resolveSmallTalk({ text: "이거 봐 😍", now: NOW })?.topic === "mood_up");

// --- Unknown neologism heuristic (초성 뭉치, not laughter) ---
ok("ㅁㅊ looks unknown", looksLikeUnknownSlang("ㅁㅊ"));
ok("ㅋㅋ is not unknown (laugh)", !looksLikeUnknownSlang("ㅋㅋㅋ"));
ok("known slang not unknown", !looksLikeUnknownSlang("킹받네"));
ok("unknown → slang_unknown topic", resolveSmallTalk({ text: "ㅇㅁㅊ", now: NOW })?.topic === "slang_unknown");

// --- Feedback loop: admit → ask → learn → reuse ---
async function main() {
  resetSlangMemoryForTests();
  const scopeId = "scope-1";

  const ask = await generateSmallTalkReply({ text: "ㅇㅁㅊ", scopeId, now: NOW });
  ok("unknown slang admits+asks", ask.topic === "slang_unknown");
  ok("pending learn queued", readPendingSlangLearn(scopeId) === "ㅇㅁㅊ");

  const teach = await generateSmallTalkReply({
    text: "어이없을 때 쓰는 말이야",
    scopeId,
    now: NOW,
  });
  ok("definition captured as learned", teach.source === "learned");
  ok("pending cleared after learning", readPendingSlangLearn(scopeId) === null);

  const reuse = await generateSmallTalkReply({ text: "아 진짜 ㅇㅁㅊ", scopeId, now: NOW });
  ok("learned term not re-asked", reuse.topic !== "slang_unknown");
  ok("learned meaning reused", reuse.replyKo.includes("ㅇㅁㅊ"));
  ok("no new pending for learned term", readPendingSlangLearn(scopeId) === null);

  console.log(`test-slang-small-talk: ok (${passed} checks)`);
}

void main();
