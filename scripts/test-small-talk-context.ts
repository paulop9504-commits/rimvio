#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { extractSmallTalkContext } from "../lib/globe/context-condition-ai/small-talk/small-talk-context";
import { composeSmallTalkReply } from "../lib/globe/context-condition-ai/small-talk/compose-small-talk-reply";
import { generateSmallTalkReply } from "../lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import {
  SMALL_TALK_BANK,
  readSmallTalkStrategy,
} from "../lib/globe/context-condition-ai/small-talk/small-talk-bank";
import type { SmallTalkTurn } from "../lib/globe/context-condition-ai/small-talk/small-talk-context";

const WED_JUL = new Date(2026, 6, 8, 10, 0); // Wed, July (summer), morning
const WED_LATE = new Date(2026, 6, 8, 2, 0);

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- Variable extraction ---
const ctx = extractSmallTalkContext({ text: "안녕하세요", region: "오사카", now: WED_JUL });
ok("part of day morning", ctx.time.partOfDay === "morning");
ok("season summer", ctx.time.season === "summer");
ok("region captured", ctx.status.regionKo === "오사카");
ok("register jondaetmal", ctx.tone.register === "jondaetmal");
ok("intimacy 0 fresh", ctx.persona.intimacy === 0);

ok(
  "late night part",
  extractSmallTalkContext({ text: "안녕", now: WED_LATE }).time.partOfDay === "late_night",
);
ok(
  "register banmal for ㅎㅇ",
  extractSmallTalkContext({ text: "ㅎㅇ", now: WED_JUL }).tone.register === "banmal",
);

const history5: SmallTalkTurn[] = Array.from({ length: 5 }, (_, i) => ({
  role: i % 2 === 0 ? "user" : "assistant",
  text: `t${i}`,
}));
ok(
  "intimacy grows with turns",
  extractSmallTalkContext({ text: "ㅎㅇ", history: history5, now: WED_JUL }).persona.intimacy === 2,
);

// --- Composer: always ends with an open question ---
for (const topic of Object.keys(SMALL_TALK_BANK) as (keyof typeof SMALL_TALK_BANK)[]) {
  const reply = composeSmallTalkReply({
    topic,
    context: extractSmallTalkContext({ text: "테스트", now: WED_JUL }),
  });
  ok(`compose ${topic} ends with question`, reply.trim().endsWith("?"));
}

// Region injected on greeting (even seed → turnCount 0, hour 10)
const greet = composeSmallTalkReply({
  topic: "greeting",
  context: extractSmallTalkContext({ text: "안녕하세요", region: "오사카", now: WED_JUL }),
});
ok("greeting reflects region", greet.includes("오사카"));

// Meta-cognition weaves in the recent search
const meta = composeSmallTalkReply({
  topic: "greeting",
  context: extractSmallTalkContext({
    text: "안녕",
    recentSearchKo: "오사카 카페",
    now: WED_JUL,
  }),
});
ok("meta cognition mentions recent search", meta.includes("오사카 카페"));

// Register mirroring: banmal + familiar → casual question
const casual = composeSmallTalkReply({
  topic: "greeting",
  context: extractSmallTalkContext({ text: "ㅎㅇ", history: history5, now: WED_JUL }),
});
ok("familiar banmal uses casual close", /(어|야)\?$/u.test(casual));

// Emotional low: comfort, never a search pitch
const down = composeSmallTalkReply({
  topic: "mood_down",
  context: extractSmallTalkContext({ text: "오늘 진짜 힘들었어", now: WED_JUL }),
});
ok("mood_down avoids search pitch", !/맛집|카페|찾아|검색/u.test(down));
ok("mood_down ends with question", down.trim().endsWith("?"));

// Food: empathy + search offer
const food = composeSmallTalkReply({
  topic: "food",
  context: extractSmallTalkContext({ text: "배고파", now: WED_JUL }),
});
ok("food offers a next step", /당기|찾아/u.test(food));

// --- Bank integrity ---
for (const topic of Object.keys(SMALL_TALK_BANK) as (keyof typeof SMALL_TALK_BANK)[]) {
  const entry = readSmallTalkStrategy(topic);
  ok(`bank ${topic} has patterns`, entry.patterns.length > 0);
  ok(`bank ${topic} has strategy`, entry.responseStrategy.trim().length > 0);
  ok(`bank ${topic} declares context`, entry.contextRequirements.length > 0);
}

// --- Generator falls back to deterministic (no window/provider in node) ---
async function main() {
  const gen = await generateSmallTalkReply({ text: "안녕하세요", now: WED_JUL });
  ok("generator deterministic fallback", gen.source === "deterministic");
  ok("generator reply ends with question", gen.replyKo.trim().endsWith("?"));
  ok("generator topic greeting", gen.topic === "greeting");

  console.log(`test-small-talk-context: ok (${passed} checks)`);
}

void main();
