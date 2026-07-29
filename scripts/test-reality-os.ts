#!/usr/bin/env npx tsx
/**
 * Reality OS — primitives · composition · progressive projection (ADR-034).
 */

import assert from "node:assert/strict";
import {
  advanceContextRealityFocus,
  composeRealityForSdkKind,
  listRealityPrimitiveStrip,
  projectRealityComposition,
  resetContextRealityStoreForTests,
  seedContextRealityBundle,
  projectionFromBundle,
  readContextRealityBundle,
} from "../lib/reality-os";
import { buildWorkspaceSdkFrame } from "../lib/workspace-sdk";
import { runWorkspaceIntentContinuum } from "../lib/workspace-kind";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

resetContextRealityStoreForTests();
resetGraphCommandStoreForTests();
clearSessionGraphs();
clearPreparedRealityOperations();

{
  const travel = composeRealityForSdkKind("travel");
  assert.deepEqual(
    [...travel.primitives],
    ["spatial", "timeline", "transaction", "recommendation"],
  );
  const goods = composeRealityForSdkKind("used_goods");
  assert.ok(goods.primitives.includes("object"));
  assert.ok(goods.primitives.includes("pipeline"));
}

{
  const composition = composeRealityForSdkKind("travel");
  const first = projectRealityComposition({
    composition,
    revealedSlotIds: ["flight"],
    focusSlotId: "flight",
  });
  assert.equal(first.nodeSurface, "map");
  assert.ok(first.activePrimitives.includes("spatial"));
  assert.ok(first.latentPrimitives.includes("timeline"));
  assert.match(first.progressiveHintKo, /공간|시간/);

  const afterHotel = projectRealityComposition({
    composition,
    revealedSlotIds: ["flight", "hotel"],
    focusSlotId: "hotel",
  });
  assert.ok(afterHotel.activePrimitives.includes("transaction"));
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "오사카 4박 5일 여행 갈 거야",
    graphId: "graph-reality-os",
    createIfMissing: true,
  });
  assert.ok(continuum);
  const bundle = readContextRealityBundle(continuum!.contextEventId);
  assert.ok(bundle);
  assert.deepEqual([...bundle!.revealedSlotIds], ["flight"]);
  assert.equal(bundle!.composition.labelKind, "travel");
  assert.ok(continuum!.sdkFrame.progressiveHintKo);
  assert.ok(
    (continuum!.sdkFrame.activePrimitiveIds ?? []).includes("spatial"),
  );

  // Persist → clear memory → hydrate from event metadata
  resetContextRealityStoreForTests();
  const hydrated = readContextRealityBundle(continuum!.contextEventId);
  assert.ok(hydrated);
  assert.deepEqual([...hydrated!.revealedSlotIds], ["flight"]);
  assert.equal(hydrated!.composition.labelKind, "travel");

  const strip = listRealityPrimitiveStrip(hydrated!);
  assert.ok(strip.some((row) => row.id === "spatial" && row.state === "active"));
  assert.ok(strip.some((row) => row.id === "timeline" && row.state === "latent"));

  const advanced = advanceContextRealityFocus({
    contextEventId: continuum!.contextEventId,
    completedSlotId: "flight",
    nextSlotId: "hotel",
  });
  assert.ok(advanced);
  assert.ok(advanced!.revealedSlotIds.includes("flight"));
  assert.ok(advanced!.revealedSlotIds.includes("hotel"));
  const proj = projectionFromBundle(advanced!);
  assert.ok(proj.activePrimitives.includes("transaction"));

  const frame = buildWorkspaceSdkFrame({
    kind: "travel",
    contextEventId: continuum!.contextEventId,
    focusSlotId: "hotel",
    focusLabelKo: "숙소",
  });
  assert.equal(frame.node.surface, "cards");
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "아이폰 15 프로 중고로 팔아줘",
    graphId: "graph-reality-market",
    createIfMissing: true,
  });
  assert.ok(continuum);
  const bundle = readContextRealityBundle(continuum!.contextEventId);
  assert.ok(bundle);
  assert.equal(bundle!.composition.defaultMorphologyId, "card_pipeline");
  assert.deepEqual([...bundle!.revealedSlotIds], ["photos"]);
  assert.equal(continuum!.sdkFrame.node.surface, "pipeline");
}

resetContextRealityStoreForTests();
console.log("ok — reality-os");

