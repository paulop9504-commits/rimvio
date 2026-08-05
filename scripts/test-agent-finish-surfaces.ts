/**
 * Finish surfaces — collapse header + dense messageKo.
 * Run: npx tsx scripts/test-agent-finish-surfaces.ts
 */

import assert from "node:assert/strict";
import {
  beginAgentActivityTranscript,
  appendAgentActivityEvent,
  finishAgentActivityTranscript,
  clearAgentActivityTranscriptForTests,
  getCollapseHeaderLabel,
  buildAgentFinishMessageKo,
  readAgentActivityTranscript,
} from "@/lib/context-run";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { clearContextWorkspace, readContextWorkspace } from "@/lib/context-workspace/workspace-store";

clearAgentActivityTranscriptForTests();
const ctx = "ctx-finish-surfaces";
clearContextWorkspace(ctx);

openMapContextWorkspace({
  contextEventId: ctx,
  domain: "lodging",
  query: "USJ 근처 가성비 숙소",
  summaryKo: "오사카 여행",
  candidates: [
    {
      id: "lodging:osaka:a",
      labelKo: "파크 프론트 호텔",
      rating: 4.5,
      amountLabel: "18만원 / 1박",
      lat: 34.66,
      lng: 135.43,
      source: "maps",
    },
    {
      id: "lodging:osaka:b",
      labelKo: "베이 호텔",
      rating: 4.2,
      amountLabel: "12만원 / 1박",
      lat: 34.665,
      lng: 135.435,
      source: "maps",
    },
  ],
  source: "scout_patch",
});

beginAgentActivityTranscript({
  contextEventId: ctx,
  utterance: "유니버셜 스튜디오 근처 가성비 숙소 찾아줘",
});
appendAgentActivityEvent({
  kind: "patch",
  labelKo: "Workspace에 후보를 반영해요",
  metricKo: "+2",
});
finishAgentActivityTranscript({ summaryKo: "숙소 2곳 준비" });

const activity = readAgentActivityTranscript();
const header = getCollapseHeaderLabel(activity, [
  { id: "a", title: "파크 프론트" },
  { id: "b", title: "베이" },
]);
assert.ok(header.includes("✓"));
assert.ok(header.includes("2곳") || header.includes("준비"));
assert.ok(/Thought for/i.test(header));

const state = readContextWorkspace(ctx)!;
const body = buildAgentFinishMessageKo({
  state,
  utterance: "유니버셜 스튜디오 근처 가성비 숙소 찾아줘",
});
assert.ok(body.includes("무엇을 했는가"));
assert.ok(body.includes("왜 이 후보"));
assert.ok(body.includes("다음에"));
assert.ok(body.includes("USJ") || body.includes("숙소"));
// Lead line is punchy (not only section labels).
assert.ok(body.split("\n")[0]!.length > 0);
assert.ok(!body.split("\n")[0]!.startsWith("·"));

clearContextWorkspace(ctx);
clearAgentActivityTranscriptForTests();
console.log("OK — agent-finish-surfaces");
