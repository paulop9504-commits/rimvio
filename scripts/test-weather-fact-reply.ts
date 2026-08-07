#!/usr/bin/env npx tsx
/**
 * Weather fact ask → location parse + reply format (no chatty redirect).
 * Run: npx tsx scripts/test-weather-fact-reply.ts
 */
import assert from "node:assert/strict";
import {
  formatWeatherFactReplyKo,
  looksLikeWeatherFactAsk,
  parseWeatherFactLocation,
} from "@/lib/context-run/try-fetch-weather-fact-reply";

assert.equal(looksLikeWeatherFactAsk("오사카 기온 몇도야??"), true);
assert.equal(looksLikeWeatherFactAsk("오사카 난바역 근처 캡슐호텔로 찾아줘"), false);
assert.equal(
  parseWeatherFactLocation("오사카 기온 몇도야??"),
  "오사카",
);
assert.equal(
  parseWeatherFactLocation("지금 날씨 어때", "도쿄"),
  "도쿄",
);

const line = formatWeatherFactReplyKo(
  {
    condition: "clear",
    condition_label: "맑음",
    summary: "맑음",
    temp_c: 29.4,
    feels_like_c: 32,
    location_label: "Osaka",
  },
  "오사카",
);
assert.match(line, /29/);
assert.match(line, /°C/);
assert.doesNotMatch(line, /계획|어떠세요/);

console.log("test-weather-fact-reply: ok");
