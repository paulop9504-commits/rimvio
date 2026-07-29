#!/usr/bin/env npx tsx
/**
 * Node projection models — pipeline / map / dashboard (ADR-034).
 */

import assert from "node:assert/strict";
import { buildWorkspaceNodeProjectionModel } from "../lib/reality-os/node-projection-model";
import { buildWorkspaceSdkFrame } from "../lib/workspace-sdk";
import {
  resetContextRealityStoreForTests,
  seedContextRealityBundle,
} from "../lib/reality-os";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetContextRealityStoreForTests();

{
  const event = commitEventUpsert({
    id: "ctx-node-sell",
    title: "아이폰 판매",
    category: "custom",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
  });
  seedContextRealityBundle({
    contextEventId: event.id,
    sdkKind: "used_goods",
    focusSlotId: "photos",
  });
  const frame = buildWorkspaceSdkFrame({
    kind: "used_goods",
    headerTitleKo: "아이폰 판매",
    contextEventId: event.id,
    focusSlotId: "photos",
    focusLabelKo: "사진",
  });
  assert.equal(frame.node.surface, "pipeline");
  const model = buildWorkspaceNodeProjectionModel({
    frame,
    bundle: null,
  });
  assert.equal(model.surface, "pipeline");
  if (model.surface === "pipeline") {
    assert.equal(model.stages[0]?.slotId, "photos");
    assert.equal(model.stages[0]?.state, "current");
    assert.ok(model.stages.some((s) => s.state === "waiting"));
  }
}

{
  const event = commitEventUpsert({
    id: "ctx-node-travel",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
  });
  seedContextRealityBundle({
    contextEventId: event.id,
    sdkKind: "travel",
    focusSlotId: "flight",
  });
  const frame = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: "오사카 여행",
    contextEventId: event.id,
    focusSlotId: "flight",
    focusLabelKo: "항공",
  });
  assert.equal(frame.node.surface, "map");
  const model = buildWorkspaceNodeProjectionModel({
    frame,
    bundle: null,
  });
  assert.equal(model.surface, "map");
}

{
  commitEventUpsert({
    id: "ctx-hotel",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
  });
  seedContextRealityBundle({
    contextEventId: "ctx-hotel",
    sdkKind: "travel",
    focusSlotId: "hotel",
  });
  const withBundle = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: "오사카 여행",
    contextEventId: "ctx-hotel",
    focusSlotId: "hotel",
    focusLabelKo: "숙소",
  });
  assert.equal(withBundle.node.surface, "cards");
}

resetContextRealityStoreForTests();
console.log("ok — node-projection-model");
