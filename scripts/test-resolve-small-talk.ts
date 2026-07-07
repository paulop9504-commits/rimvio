#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  resolveSmallTalk,
  smallTalkFallbackReply,
  type SmallTalkTopic,
} from "../lib/globe/context-condition-ai/resolve-small-talk";

// Deterministic clocks (local time). July 2026: 6th=Mon, 8th=Wed, 10th=Fri, 11th=Sat.
const WED_LUNCH = new Date(2026, 6, 8, 12, 30);
const WED_LATE = new Date(2026, 6, 8, 1, 0);
const MON_AM = new Date(2026, 6, 6, 9, 0);
const SAT_PM = new Date(2026, 6, 11, 15, 0);

function topic(text: string, now: Date = WED_LUNCH): SmallTalkTopic | null {
  return resolveSmallTalk({ text, now })?.topic ?? null;
}

let passed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected, label);
  passed += 1;
}

// Openers
check("greeting ㅎㅇ", topic("ㅎㅇ"), "greeting");
check("thanks", topic("고마워"), "thanks");
check("farewell", topic("잘가"), "farewell");
check("capability", topic("너 뭐 할 수 있어?"), "capability");

// Late-night greeting adapts wording
assert.match(
  resolveSmallTalk({ text: "안녕", now: WED_LATE })?.replyKo ?? "",
  /늦은 시간/u,
  "late-night greeting mentions the hour",
);

// 1) Weather
check("weather hot", topic("오늘 날씨 진짜 덥네"), "weather");
check("weather rain", topic("비가 왜 이렇게 오지"), "weather");
check("weather air", topic("공기 좀 안 좋은 것 같아"), "weather");
assert.equal(
  resolveSmallTalk({ text: "오늘 날씨 진짜 덥네", now: WED_LUNCH })?.suggestsSearch,
  true,
  "hot weather nudges a nearby search",
);

// 2) Food & lunch — hybrid empathy + search nudge
check("food what", topic("오늘 점심 뭐 먹지?"), "food");
check("food crave", topic("오늘따라 커피가 당기네"), "food");
check("food hungry", topic("배고파"), "food");
const foodReply = resolveSmallTalk({ text: "오늘 점심 뭐 먹지?", now: WED_LUNCH });
assert.equal(foodReply?.suggestsSearch, true, "food craving nudges search");
assert.match(foodReply?.replyKo ?? "", /맛집|카페/u, "food reply offers to search");
assert.match(foodReply?.replyKo ?? "", /점심때/u, "lunchtime clock is reflected");

// Guard: a past-tense food *memo* is not small talk (must go to ingest/search)
check("memo not small talk", topic("점심에 김치찌개 먹음"), null);

// 3) Emotional
check("mood up early leave", topic("나 오늘 일찍 끝났다!"), "mood_up");
check("mood up 대박", topic("오늘 진짜 대박이야"), "mood_up");
check("mood down mistake", topic("아, 실수했네"), "mood_down");
check("mood down worst", topic("오늘 진짜 최악이야"), "mood_down");

// 4) Time & state (clock-aware)
check("time monday", topic("월요일이라 힘드네", MON_AM), "time_state");
assert.match(
  resolveSmallTalk({ text: "월요일이라 힘드네", now: MON_AM })?.replyKo ?? "",
  /월요일/u,
  "monday reply mentions monday",
);
check("time tired", topic("오늘따라 피곤하다"), "time_state");
check("time fast", topic("벌써 시간이 이렇게 됐네"), "time_state");
check("time weekend", topic("주말이라 좋다", SAT_PM), "time_state");

// 5) Catch-up
check("catch up drama", topic("요즘 이 드라마 재밌더라"), "catch_up");
check("catch up how are you", topic("별일 없지?"), "catch_up");

// Acks & fillers
check("ack ok", topic("오케이"), "ack");
check("filler laugh", topic("ㅋㅋㅋ"), "filler");

// Real searches must fall through (never small talk)
check("search nearby", topic("근처 맛집 찾아줘"), null);
check("search recommend", topic("강남 맛집 추천"), null);
check("search activity", topic("오사카 놀거리"), null);
check("search hotel", topic("호텔 추천해줘"), null);
check("search pharmacy", topic("근처 약국"), null);

// Fallback helper
assert.equal(smallTalkFallbackReply().topic, "catch_up");
assert.match(smallTalkFallbackReply("오사카").replyKo, /오사카/u);

console.log(`test-resolve-small-talk: ok (${passed} checks)`);
