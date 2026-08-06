#!/usr/bin/env npx tsx
/**
 * Intent continuum — Context → Workspace Focus → booking path seed (one tool).
 */

import assert from "node:assert/strict";
import { planContextRun } from "../lib/context-run/plan-context-run";
import { bindSituation } from "../lib/context-run/bind-situation";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { runWorkspaceIntentContinuum } from "../lib/workspace-kind";
import { readContextWorkspace } from "../lib/context-workspace";

resetGraphCommandStoreForTests();
clearSessionGraphs();
clearPreparedRealityOperations();

{
  const bound = bindSituation({
    kind: "text",
    text: "오늘 대리 뛰러 갈게",
    surface: "composer",
    layerMode: "personal",
  });
  const plan = planContextRun(bound);
  assert.equal(plan.kind, "workspace_intent_continuum");
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "오사카 4박 5일 여행 갈 거야",
    graphId: "graph-continuum-test",
    createIfMissing: true,
  });
  assert.ok(continuum);
  assert.equal(continuum!.kind, "travel");
  assert.ok(continuum!.contextEventId);
  assert.equal(continuum!.card.ctaKo, "작업장을 열었어요");
  assert.equal(continuum!.focus.focusSlotId, "flight");
  assert.equal(continuum!.bookingPathSeeded, true);
  assert.ok(continuum!.workspace);
  assert.equal(continuum!.sdkFrame.header.titleKo.length > 0, true);
  assert.equal(continuum!.sdkFrame.commit.requiresHuman, true);
  assert.equal(continuum!.sdkFrame.action.labelKo.length > 0, true);
  const ws = readContextWorkspace(continuum!.contextEventId);
  assert.ok(ws);
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "오늘 대리 뛰러 갈게",
    graphId: "graph-driver-continuum",
    createIfMissing: true,
  });
  assert.ok(continuum);
  assert.equal(continuum!.kind, "driver");
  assert.equal(continuum!.focus.focusSlotId, "here");
  assert.equal(continuum!.card.openHint, "driver_workspace_shell");
}

{
  const bound = bindSituation({
    kind: "text",
    text: "아이폰 15 프로 중고로 팔아줘",
    surface: "composer",
    layerMode: "personal",
  });
  assert.equal(planContextRun(bound).kind, "workspace_intent_continuum");

  const continuum = runWorkspaceIntentContinuum({
    utterance: "아이폰 15 프로 중고로 팔아줘",
    graphId: "graph-market-sell",
    createIfMissing: true,
  });
  assert.ok(continuum);
  assert.equal(continuum!.kind, "used_goods");
  assert.equal(continuum!.focus.focusSlotId, "photos");
  assert.equal(continuum!.card.openHint, "used_goods_workspace_shell");
  assert.match(continuum!.card.titleKo, /아이폰|판매/);
  assert.equal(continuum!.sdkFrame.kind, "used_goods");
  assert.equal(continuum!.bookingPathSeeded, false);
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "맥북 살만한 거 찾아줘",
    graphId: "graph-market-buy",
    createIfMissing: true,
  });
  assert.ok(continuum);
  assert.equal(continuum!.kind, "used_goods");
  assert.equal(continuum!.focus.focusSlotId, "conditions");
  assert.match(continuum!.card.titleKo, /맥북|구매/);
}

{
  const none = runWorkspaceIntentContinuum({
    utterance: "오늘 날씨 어때",
    graphId: "graph-none",
    createIfMissing: true,
  });
  assert.equal(none, null);
}

{
  const eatery = runWorkspaceIntentContinuum({
    utterance: "주변 맛집 찾아줘",
    graphId: "graph-eatery-soft",
    createIfMissing: true,
  });
  assert.ok(eatery);
  assert.equal(eatery!.kind, "travel");
  assert.equal(eatery!.card.ctaKo, "작업장을 열었어요");
}

resetGraphCommandStoreForTests();
clearSessionGraphs();
clearPreparedRealityOperations();

console.log("ok — workspace-intent-continuum");
