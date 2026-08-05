/**
 * Cursor contract — user NL must not be rewritten into task IR for chat/dispatch.
 * Run: npx tsx scripts/test-composer-keeps-user-nl.ts
 */

import assert from "node:assert/strict";
import { refineMessageForPipeline } from "@/lib/messy-prompt-interpreter/refine-message-for-pipeline";
import { interpretMessyPrompt } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt";
import { interpretMessyForGlobeComposer } from "@/lib/messy-prompt-interpreter/adapters/globe-composer-adapter";

const UTT = "내일모래 4박5일 오사카로 여행가는데 일정좀 짜줘";

void (async () => {
  const result = await interpretMessyPrompt(UTT, {
    situation: { surface: "globe_composer" },
    useLlm: false,
  });
  assert.match(result.ir.summaryKo, /여행|동선|계획|일정/);
  const refined = refineMessageForPipeline(UTT, result);
  assert.equal(refined, UTT, "must not replace with summaryKo");
  assert.ok(!refined.includes("오늘·내일 맥락"));
  assert.ok(!refined.startsWith("여행 동선"));

  const globe = await interpretMessyForGlobeComposer({
    messyInput: UTT,
    useLlm: false,
  });
  assert.equal(globe.dispatchText, UTT);
  assert.equal(globe.understandingKo, null);

  console.log("OK — composer-keeps-user-nl (Cursor contract)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
