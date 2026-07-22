#!/usr/bin/env npx tsx
/**
 * Rule Engine — Action First, Clarify Less, Commit Gate, Tool Router.
 */

import assert from "node:assert/strict";
import {
  PROMPT_CONSTITUTION,
  ORCHESTRATION_PRIORITY,
  classifyIntentFamily,
  evaluateUtteranceRules,
  resolveClarifyLess,
  resolveToolIdForIntent,
  resolveLookupToolId,
  routeToolFamily,
  shouldFreezeFreeNlLlm,
  isActionFirstUtterance,
} from "../lib/rule-engine";
import {
  clearSessionGraphs,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

assert.equal(PROMPT_CONSTITUTION.length, 10);
assert.deepEqual(
  [...ORCHESTRATION_PRIORITY],
  ["Context First", "Reality First", "Graph First", "Action First", "Reason Later"],
);

assert.equal(classifyIntentFamily("APA호텔 고정해"), "Pin");
assert.equal(classifyIntentFamily("주변 맛집 찾아줘"), "Search");
assert.equal(classifyIntentFamily("A랑 B 비교해"), "Compare");
assert.equal(classifyIntentFamily("예약해"), "Reserve");
assert.equal(classifyIntentFamily("이걸로 예약"), "Reserve");
assert.equal(classifyIntentFamily("결제해"), "Purchase");
assert.equal(classifyIntentFamily("빼줘"), "Delete");
assert.equal(classifyIntentFamily("길 찾아줘"), "Navigate");
assert.equal(classifyIntentFamily("캘린더에 넣어"), "Calendar");
assert.equal(classifyIntentFamily("일정에 넣기"), "Calendar");
assert.equal(classifyIntentFamily("공유해줘"), "Share");
assert.equal(classifyIntentFamily("메모해줘"), "Note");
assert.equal(classifyIntentFamily("5박6일로 갈게"), "Revise");
assert.equal(classifyIntentFamily("인원 3명으로 바꿔"), "Revise");
assert.equal(classifyIntentFamily("일본 여행 수정해줘"), "Revise");
assert.equal(classifyIntentFamily("2박으로"), "Revise");
// Domain nouns without 찾 — still Search (STEP 1).
assert.equal(classifyIntentFamily("오사카 캡슐호텔"), "Search");
assert.equal(classifyIntentFamily("캡슐호텔"), "Search");
assert.equal(classifyIntentFamily("숙소"), "Search");
assert.equal(classifyIntentFamily("맛집"), "Search");
assert.equal(classifyIntentFamily("편의점 어디야"), "Search");
assert.equal(classifyIntentFamily("약 사러"), "Search");
assert.equal(isActionFirstUtterance("5박6일로 바꿔줘"), true);
assert.equal(routeToolFamily("Reserve"), "booking");
assert.equal(routeToolFamily("Search"), "maps");
assert.equal(routeToolFamily("Compare"), "graph");
assert.equal(routeToolFamily("Revise"), "graph");
assert.equal(
  resolveToolIdForIntent({ intent: "Revise" }),
  null,
  "Revise is graph/slots only — no Tool Registry",
);
assert.equal(resolveLookupToolId("lodging"), "hotel.lookup");
assert.equal(
  resolveToolIdForIntent({
    intent: "Search",
    query: "오사카 캡슐호텔",
  }),
  "hotel.lookup",
);
assert.equal(
  resolveToolIdForIntent({
    intent: "Search",
    query: "난바 맛집",
  }),
  "restaurant.lookup",
);
assert.equal(
  resolveToolIdForIntent({
    intent: "Search",
    query: "근처 편의점",
  }),
  "pharmacy.lookup",
);
assert.equal(routeToolFamily("Navigate"), "maps");
assert.equal(routeToolFamily("Calendar"), "calendar");

{
  const one = resolveClarifyLess({
    intentLabelKo: "예약",
    candidates: [{ id: "a", labelKo: "APA 난바" }],
  });
  assert.equal(one.kind, "execute");
}

{
  const many = resolveClarifyLess({
    intentLabelKo: "예약",
    candidates: [
      { id: "a", labelKo: "A" },
      { id: "b", labelKo: "B" },
      { id: "c", labelKo: "C" },
    ],
  });
  assert.equal(many.kind, "clarify");
  if (many.kind === "clarify") {
    assert.ok(many.questionKo.includes("어느"));
    assert.ok(many.chips.length >= 2);
    assert.equal(many.chips[0]?.gapId, "pick");
  }
}

{
  const first = resolveClarifyLess({
    intentLabelKo: "예약",
    candidates: [
      { id: "a", labelKo: "A" },
      { id: "b", labelKo: "B" },
    ],
    alreadyResolved: { id: "a", labelKo: "A" },
  });
  assert.equal(first.kind, "execute");
}

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

{
  const pin = evaluateUtteranceRules({ utterance: "APA호텔 고정해" });
  assert.equal(pin.intent, "Pin");
  assert.equal(pin.actionMatched, true);
  assert.equal(pin.preferActionOverText, true);
  assert.equal(pin.allowLlmReasoning, false);
  assert.equal(shouldFreezeFreeNlLlm(pin), true);
  assert.ok(pin.firedRules.includes("R1_ActionFirst"));
}

{
  const d = evaluateUtteranceRules({ utterance: "예약해" });
  assert.equal(d.requiresCommit, true);
  assert.ok(d.firedRules.includes("R7_CommitGate"));
}

{
  const del = evaluateUtteranceRules({ utterance: "빼줘" });
  assert.equal(del.requiresCommit, false);
  assert.equal(del.requiresSoftConfirm, true);
}

{
  const share = evaluateUtteranceRules({ utterance: "공유해줘" });
  assert.equal(share.requiresCommit, false);
}

tryRunGraphCommandOs({
  utterance: "APA호텔 고정",
  contextEventId: "evt-rules",
  anchorLat: 34.6654,
  anchorLng: 135.5019,
  contextLabelKo: "오사카",
});
tryRunGraphCommandOs({
  utterance: "주변 맛집 찾아줘",
  contextEventId: "evt-rules",
});
const graph = readSessionGraph("evt-rules");
assert.ok(graph && graph.nodes.length >= 2);

{
  const first = evaluateUtteranceRules({
    utterance: "첫 번째 예약",
    graph,
  });
  assert.equal(first.clarify?.kind, "execute");
}

{
  const bare = evaluateUtteranceRules({
    utterance: "예약해",
    graph,
  });
  assert.ok(
    bare.clarify?.kind === "clarify" || bare.clarify?.kind === "execute",
  );
}

console.log("ok — rule-engine");
