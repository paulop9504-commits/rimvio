#!/usr/bin/env npx tsx
/**
 * Workspace SDK — six regions for every kind.
 */

import assert from "node:assert/strict";
import {
  WORKSPACE_SDK_REGIONS,
  assertWorkspaceSdkFrameComplete,
  buildSdkFrameFromPrep,
  buildWorkspaceSdkFrame,
  listWorkspaceSdkRecipes,
  workspaceSdkRecipe,
} from "../lib/workspace-sdk";
import { buildWorkspacePrepCard } from "../lib/workspace-kind";

assert.deepEqual(
  [...WORKSPACE_SDK_REGIONS],
  ["header", "ai", "primary_focus", "node", "action", "commit"],
);
assert.equal(listWorkspaceSdkRecipes().length, 3);

{
  const travel = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: "Osaka Trip",
    focusLabelKo: "숙소 선택",
  });
  assert.equal(travel.header.titleKo, "Osaka Trip");
  assert.equal(travel.primaryFocus.labelKo, "숙소 선택");
  assert.equal(travel.action.toolId, "booking.prepare");
  assert.equal(travel.commit.leadsToPayment, true);
  assert.equal(travel.commit.requiresHuman, true);
  assert.equal(travel.morphologyId, "spatial_timeline");
  assert.equal(travel.node.surface, "map");
  assert.ok(assertWorkspaceSdkFrameComplete(travel));
}

{
  const goods = workspaceSdkRecipe("used_goods");
  assert.equal(goods.focusLabelKo, "사진");
  assert.equal(goods.action.labelKo, "채팅");
  assert.equal(goods.commit.labelKo, "거래 확정");
  const frame = buildWorkspaceSdkFrame({
    kind: "used_goods",
    headerTitleKo: "아이폰 구매",
  });
  assert.equal(frame.header.titleKo, "아이폰 구매");
  assert.equal(frame.action.id, "peer_chat");
  assert.equal(frame.node.surface, "pipeline");
  assert.equal(frame.morphologyId, "card_pipeline");
  assert.equal(frame.primaryFocus.labelKo, "사진");
}

{
  const card = buildWorkspacePrepCard({
    utterance: "오사카 4박 5일 여행 갈 거야",
    titleOverrideKo: "Osaka Trip",
  });
  assert.ok(card);
  const frame = buildSdkFrameFromPrep({ card: card! });
  assert.equal(frame.kind, "travel");
  assert.equal(frame.header.titleKo, "Osaka Trip");
  assert.ok(assertWorkspaceSdkFrameComplete(frame));
}

console.log("ok — workspace-sdk");
