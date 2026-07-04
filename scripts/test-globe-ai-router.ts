#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { classifyGlobeAiIntentFallback } from "../lib/context-run/classify-globe-ai-intent";

assert.deepEqual(classifyGlobeAiIntentFallback("점심에 김치찌개 먹음"), {
  kind: "text_ingest",
  reason: "note",
});

assert.deepEqual(classifyGlobeAiIntentFallback("https://maps.google.com"), {
  kind: "text_ingest",
  reason: "raw_url",
});

assert.equal(classifyGlobeAiIntentFallback("ㅎㅇ").kind, "personal_context_ask");
assert.equal(
  classifyGlobeAiIntentFallback("지난 제주 기록 정리해줘").kind,
  "personal_context_ask",
);
assert.equal(
  classifyGlobeAiIntentFallback("여유 일정이랑 빡빡한 일정 비교해줘").kind,
  "personal_context_ask",
);
assert.equal(classifyGlobeAiIntentFallback("오사카 일정 짜줘").kind, "personal_context_ask");

console.log("test-globe-ai-router: ok");
