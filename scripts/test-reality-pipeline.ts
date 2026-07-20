#!/usr/bin/env npx tsx
/**
 * Reality pipeline — Ingress → Projection → Explorer → Execution Inbox.
 */

import assert from "node:assert/strict";
import { compileGlobeIngress } from "../lib/globe-ingress/compile-globe-ingress";
import { commitPendingContextCreate } from "../lib/globe-ingress/commit-pending-context-create";
import {
  clearPendingContextCreate,
  writePendingContextCreate,
} from "../lib/globe-ingress/pending-context-create-store";
import { buildPendingContextCreateDraft } from "../lib/globe-ingress/build-pending-context-create-draft";
import {
  clearPreparedRealityOperations,
  listPreparedRealityOperations,
} from "../lib/reality-queue";
import { enqueuePlacePrepToExecutionInbox } from "../lib/reality-queue/enqueue-place-prep-operation";
import {
  clearRealityPipelineSnapshots,
  hasPreparedOpsForContext,
  readRealityPipelineSnapshot,
  runRealityIngressPipeline,
  syncRealityPipelineAfterOperationChange,
} from "../lib/reality-pipeline";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
};
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

resetEventCandidatesForTests();
clearPreparedRealityOperations();
clearRealityPipelineSnapshots();

{
  const pip = runRealityIngressPipeline({
    contextEventId: "evt-pipeline-travel",
    utterance: "상하이 2박3일 여행",
    contextLabelKo: "상하이 여행",
    destinationLabelKo: "상하이",
  });
  assert.equal(pip.version, 1);
  assert.equal(pip.projection.project.kind, "travel");
  assert.equal(pip.projection.stage, "WAIT_COMMIT");
  assert.ok(pip.explorer.preparePlan.steps.length >= 3);
  assert.ok(hasPreparedOpsForContext("evt-pipeline-travel"));
  const inboxOps = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === "evt-pipeline-travel",
  );
  assert.ok(inboxOps.length >= 5);
  assert.ok(
    pip.explorer.branches
      .find((b) => b.root === "execution")
      ?.children.find((c) => c.kind === "inbox")
      ?.children.some((c) => c.kind === "operation"),
  );

  const stored = readRealityPipelineSnapshot("evt-pipeline-travel");
  assert.ok(stored);
  assert.equal(stored!.projection.project.id, pip.projection.project.id);
}

{
  runRealityIngressPipeline({
    contextEventId: "evt-pipeline-travel",
    utterance: "상하이 2박3일 여행",
    destinationLabelKo: "상하이",
    seedExecutionInbox: true,
  });
  const countAfter = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === "evt-pipeline-travel",
  ).length;
  assert.ok(countAfter >= 5, "should not duplicate seed when ops exist");
}

{
  enqueuePlacePrepToExecutionInbox({
    contextEventId: "evt-dinner",
    contextLabelKo: "오늘 저녁",
    placeId: "place-a",
    placeName: "임성보동태찌개",
    kind: "eatery",
  });
  const pip = readRealityPipelineSnapshot("evt-dinner");
  assert.ok(pip);
  assert.ok(
    pip!.explorer.branches
      .find((b) => b.root === "execution")
      ?.children.find((c) => c.kind === "inbox")
      ?.children.some((c) => c.labelKo.includes("임성보")),
  );
}

{
  const graphId = "graph-pipeline-commit";
  const compiled = compileGlobeIngress({ text: "오사카 3박4일" });
  const draft = buildPendingContextCreateDraft({
    graphId,
    utterance: "오사카 3박4일",
    compiled,
  });
  writePendingContextCreate(draft);
  const result = commitPendingContextCreate({ graphId, handlers: {} });
  assert.ok(result);
  const pip = readRealityPipelineSnapshot(result!.event.id);
  assert.ok(pip);
  assert.equal(pip!.contextEventId, result!.event.id);
  assert.ok(listPreparedRealityOperations().some((op) => op.kind === "flight"));
  clearPendingContextCreate(graphId);
}

{
  syncRealityPipelineAfterOperationChange({
    contextEventId: "evt-sync",
    utterance: "유성 국밥",
    contextLabelKo: "오늘 점심",
  });
  assert.ok(readRealityPipelineSnapshot("evt-sync"));
}

clearPreparedRealityOperations();
clearRealityPipelineSnapshots();
resetEventCandidatesForTests();
console.log("test-reality-pipeline: ok");
