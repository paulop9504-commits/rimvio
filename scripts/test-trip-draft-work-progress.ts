/**
 * Trip draft stamps dest/dates → Work % advances; Continue prefers soft scout.
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
} from "../lib/context-workspace";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { buildContextWorkState } from "../lib/workstream/sync-context-work-state";
import { resolveNextWorkAction } from "../lib/workstream/resolve-next-work-action";
import { clearSoftNextWorkContinueMemory } from "../lib/workstream/offer-soft-next-work-after-act";
import { resolveWorkspaceMapCenter } from "../lib/context-workspace/stamp-trip-draft-onto-context";

const CTX = "test:trip-draft-work-progress";
const stamp = "2026-08-01T01:00:00.000Z";

resetEventCandidatesForTests([]);
clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
clearSoftNextWorkContinueMemory(CTX);

commitEventUpsert({
  id: CTX,
  title: "새 맥락",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "",
  confidence: 1,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {},
});

const draft = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 일정 만들어",
  contextEventId: CTX,
  expand: false,
});
assert.ok(draft);
assert.ok(draft!.nodes.some((n) => Number.isFinite(n.lat) && n.lat > 34 && n.lat < 35));
assert.ok(draft!.nodes.every((n) => n.lng > 135 && n.lng < 136), "Osaka lng");

const work = buildContextWorkState({ contextEventId: CTX });
assert.ok(work.completed.includes("destination"), "destination stamped");
assert.ok(work.completed.includes("dates"), "dates stamped");
assert.ok(work.percent > 0, `progress > 0, got ${work.percent}`);

const next = resolveNextWorkAction({ contextEventId: CTX });
assert.ok(next.enqueueUtterance);
assert.notEqual(next.enqueueUtterance, "목적지로 이어서");
assert.ok(
  next.action?.id === "search_hotel" ||
    next.enqueueUtterance === "숙소 찾아줘",
  `expected lodging next, got ${next.action?.id} ${next.enqueueUtterance}`,
);

const center = resolveWorkspaceMapCenter("오사카");
assert.ok(center.lat > 34 && center.lat < 35);
assert.ok(center.lng > 135 && center.lng < 136);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: trip draft → work progress + osaka camera");
