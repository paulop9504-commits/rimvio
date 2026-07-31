/**
 * Intent Router — Soft / Draft Reality (spatial READY) / Hard Workspace.
 */
import assert from "node:assert/strict";
import {
  buildIntentPlan,
  clearPendingCreateProject,
  readPendingCreateProject,
  resolveIntentRoute,
  tryResolvePendingCreateProject,
  tryRunIntentRouterHardCreateOpen,
  tryRunIntentRouterSoftCreateOffer,
} from "../lib/intent-router";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  readContextWorkspace,
} from "../lib/context-workspace";
import { evaluateUtteranceRules } from "../lib/rule-engine";
import { buildContextPack } from "../lib/context-builder";

const CTX = "test:intent-router";

function pack() {
  return buildContextPack({
    utterance: "test",
    graph: null,
  });
}

function rules(utterance: string) {
  return evaluateUtteranceRules({
    utterance,
    graph: null,
  });
}

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
clearPendingCreateProject(CTX);

// 1) Declarative trip → DRAFT Reality on map (READY nodes, real coords)
{
  const u = "오사카 4박5일 여행 갈 거야";
  const route = resolveIntentRoute({ utterance: u, contextEventId: CTX });
  assert.equal(route.mode, "create");
  assert.equal(route.confidence, "draft");
  assert.equal(route.surface, "draft_preview");

  const offer = tryRunIntentRouterSoftCreateOffer({
    utterance: u,
    contextEventId: CTX,
    ruleDecision: rules(u),
    pack: pack(),
  });
  assert.ok(offer);
  assert.match(offer!.assistantReplyKo, /지도에 준비|READY|후보/);

  const ws = readContextWorkspace(CTX);
  assert.ok(ws, "Workspace opened as Reality Draft");
  assert.ok(ws!.nodes.length >= 4);
  const ready = ws!.nodes.filter((n) => n.actionReadyState === "ready");
  assert.ok(ready.length >= 4, "Action-Ready nodes");

  const kix = ws!.nodes.find((n) => /간사이|kix/i.test(n.title));
  assert.ok(kix);
  assert.ok(Math.abs(kix!.lat - 34.4347) < 0.01);
  assert.ok(Math.abs(kix!.lng - 135.2441) < 0.01);

  const usj = ws!.nodes.find((n) => /유니버설|usj/i.test(n.title));
  assert.ok(usj);
  assert.ok(Number.isFinite(usj!.lat) && Number.isFinite(usj!.lng));

  const lodging = ws!.nodes.find((n) => n.kind === "lodging");
  assert.ok(lodging?.lat);

  const pending = readPendingCreateProject(CTX);
  assert.equal(pending?.stage, "draft");

  const reviewed = tryResolvePendingCreateProject({
    utterance: "확인했어요",
    contextEventId: CTX,
    ruleDecision: rules("확인했어요"),
    pack: pack(),
  });
  assert.ok(reviewed);
  assert.match(reviewed!.assistantReplyKo, /확인/);
}

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
clearPendingCreateProject(CTX);

// 2) Hard CREATE → Workspace
{
  const u = "오사카 4박5일 여행 만들어줘";
  const route = resolveIntentRoute({ utterance: u, contextEventId: CTX });
  assert.equal(route.confidence, "hard");
  const hard = tryRunIntentRouterHardCreateOpen({
    utterance: u,
    contextEventId: CTX,
    ruleDecision: rules(u),
    pack: pack(),
  });
  assert.ok(hard);
  assert.ok(readContextWorkspace(CTX)?.nodes.length);
}

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

// 3) Soft (no map yet)
{
  const softRoute = resolveIntentRoute({
    utterance: "오사카 4박5일 여행",
    contextEventId: CTX,
  });
  assert.equal(softRoute.confidence, "soft");
  const soft = tryRunIntentRouterSoftCreateOffer({
    utterance: "오사카 4박5일 여행",
    contextEventId: CTX,
    ruleDecision: rules("오사카 4박5일 여행"),
    pack: pack(),
  });
  assert.ok(soft);
  assert.equal(readContextWorkspace(CTX), null);
}

// 4) Explore / Execute
assert.equal(
  resolveIntentRoute({ utterance: "오사카 맛집 알려줘", contextEventId: CTX })
    .mode,
  "explore",
);
assert.equal(
  resolveIntentRoute({ utterance: "이 호텔 예약해줘", contextEventId: CTX })
    .mode,
  "execute",
);

const plan = buildIntentPlan({
  route: resolveIntentRoute({
    utterance: "오사카 4박5일 여행 갈 거야",
    contextEventId: CTX,
  }),
});
assert.ok(plan.expectedEntities.length >= 3);

console.log("ok: intent reality draft READY on map");
