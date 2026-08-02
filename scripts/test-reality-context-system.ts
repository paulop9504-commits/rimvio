/**
 * Smoke: Reality Context System — Intent → Blueprint → Instance + Reality State.
 */
import assert from "node:assert/strict";
import {
  REALITY_CONTEXT_STATUSES,
  canTransitionContextStatus,
  clearRealityContextsForTests,
  createOsakaTripContext,
  createRealityContext,
  listRealityContexts,
  readRealityContext,
  saveRealityContext,
  updateRealityContextStatus,
} from "@/lib/context";

clearRealityContextsForTests();

assert.deepEqual([...REALITY_CONTEXT_STATUSES], [
  "planning",
  "active",
  "completed",
]);
assert.equal(canTransitionContextStatus("planning", "active"), true);
assert.equal(canTransitionContextStatus("completed", "active"), false);

// User: "오사카 여행"
const ctx = createOsakaTripContext({
  intent: "오사카 여행",
  startIso: "2026-08-10",
  endIso: "2026-08-13",
  labelKo: "8/10~8/13",
});

assert.equal(ctx.titleKo, "Osaka Trip");
assert.equal(ctx.purpose, "Travel");
assert.equal(ctx.status, "planning");
assert.equal(ctx.location.labelKo, "오사카");
assert.equal(ctx.timeRange.labelKo, "8/10~8/13");
assert.equal(ctx.timeRange.startIso, "2026-08-10");
assert.equal(ctx.timeRange.endIso, "2026-08-13");

const kinds = ctx.entities.map((e) => e.kind);
assert.ok(kinds.includes("Hotel"));
assert.ok(kinds.includes("Flight"));
assert.ok(kinds.includes("Route"));
assert.ok(kinds.includes("Restaurant"));

// Reality State (live) — not storage-only
assert.equal(ctx.realityState.phase, "planning");
assert.equal(ctx.realityState.statusLabelKo, "Planning");
assert.equal(ctx.realityState.entityCount, 4);
assert.ok(ctx.blueprintId === ctx.id || ctx.blueprintId != null);
assert.equal(ctx.sourceIntent, "오사카 여행");

saveRealityContext(ctx);
assert.equal(readRealityContext(ctx.id)?.titleKo, "Osaka Trip");
assert.equal(listRealityContexts().length, 1);

const active = updateRealityContextStatus(ctx.id, "active");
assert.ok(active);
assert.equal(active!.status, "active");
assert.equal(active!.realityState.phase, "active");
assert.equal(active!.realityState.statusLabelKo, "Active");

// Intent → Blueprint → Instance via createRealityContext
const fromIntent = createRealityContext({
  intent: "오사카 여행 8/10~8/13",
  id: "ctx-osaka-demo",
});
assert.equal(fromIntent.purpose, "Travel");
assert.equal(fromIntent.status, "planning");
assert.ok(fromIntent.realityState.updatedAtIso);

clearRealityContextsForTests();
console.log(
  "ok reality-context-system Osaka-Trip planning·entities·reality-state",
);
