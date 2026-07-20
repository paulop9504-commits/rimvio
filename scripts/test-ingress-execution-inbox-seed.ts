#!/usr/bin/env npx tsx
/**
 * Trip ingress 「생성」→ Execution Inbox travel pack auto-seed.
 */

import assert from "node:assert/strict";
import { commitPendingContextCreate } from "../lib/globe-ingress/commit-pending-context-create";
import {
  clearPendingContextCreate,
  writePendingContextCreate,
} from "../lib/globe-ingress/pending-context-create-store";
import { compileGlobeIngress } from "../lib/globe-ingress/compile-globe-ingress";
import {
  clearPreparedRealityOperations,
  listPreparedRealityOperations,
} from "../lib/reality-queue";
import { readRealityPipelineSnapshot } from "../lib/reality-pipeline";
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

const graphId = "graph-ingress-seed";
const compiled = compileGlobeIngress({
  text: "상하이 2박3일 여행 만들어줘",
  existingContextId: "ctx-ingress-seed",
});

writePendingContextCreate({
  graphId,
  utterance: "상하이 2박3일 여행 만들어줘",
  profile: "leisure_travel",
  travelSlots: {
    destination: "상하이",
    durationDays: 3,
    anchorTimeIso: "2026-08-01T09:00:00+09:00",
  },
  compiled,
  titleKo: "상하이 여행",
  durationLabelKo: "2박3일",
  dateLabelKo: "8/1 ~ 8/4",
  anchorLabelKo: "상하이(임시)",
  anchorLat: null,
  anchorLng: null,
  reality: "draft",
  createdAtIso: new Date().toISOString(),
});

const result = commitPendingContextCreate({
  graphId,
  handlers: {},
});
assert.ok(result);
assert.ok(result!.event.id);

const ops = listPreparedRealityOperations();
assert.ok(ops.length >= 5, "travel pack should seed into Execution Inbox");
assert.ok(ops.some((op) => op.kind === "flight"));
assert.ok(ops.some((op) => op.kind === "lodging"));
assert.ok(ops.every((op) => op.contextEventId === result!.event.id));

const pip = readRealityPipelineSnapshot(result!.event.id);
assert.ok(pip);
assert.equal(pip!.projection.project.kind, "travel");
assert.ok(pip!.explorer.branches.some((b) => b.root === "execution"));

clearPendingContextCreate(graphId);
clearPreparedRealityOperations();
resetEventCandidatesForTests();
console.log("test-ingress-execution-inbox-seed: ok");
