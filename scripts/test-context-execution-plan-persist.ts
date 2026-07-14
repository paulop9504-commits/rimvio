import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  buildContextExecutionPlanFromBlueprint,
  commitContextExecutionPlan,
  gateContextExecutionPlanForUserApproval,
  readContextExecutionPlanFromEventCandidate,
  syncContextExecutionPlanMetadata,
} from "../lib/context-execution";
import { CONTEXT_EXECUTION_PLAN_META_KEY } from "../lib/context-execution/context-execution-plan-metadata";
import { upsertEventCandidate } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { buildLifeEventVaultSnapshot } from "../lib/materialize/life-event-vault-snapshot";
import { findLifeEventCandidate } from "../lib/life-read-model";

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-persist-test",
  bridgeId: "bridge-persist-test",
  runtimeId: "runtime-persist-test",
  goal: "오사카 3박",
});

const event = commitEventUpsert({
  id: "ec-plan-persist-test",
  title: "오사카 3박",
  category: "travel",
  source: "message",
  lifecycle: "active",
  confidence: 0.9,
  metadata: {},
});

const plan = gateContextExecutionPlanForUserApproval({
  plan: buildContextExecutionPlanFromBlueprint({
    blueprint,
    build: { contextId: event.id, goalKo: "오사카 3박" },
  })!,
});

const noop = syncContextExecutionPlanMetadata({
  metadata: { ...(event.metadata ?? {}) },
  plan,
});
assert.equal(noop.changed, true);

const noop2 = syncContextExecutionPlanMetadata({
  metadata: noop.metadata,
  plan,
});
assert.equal(noop2.changed, false);

const first = commitContextExecutionPlan({ event, plan });
assert.equal(first.changed, true);
assert.equal(readContextExecutionPlanFromEventCandidate(first.event)?.osPhase, "plan_waiting_approval");

const reloaded = findLifeEventCandidate(event.id);
assert.ok(reloaded);
assert.equal(
  readContextExecutionPlanFromEventCandidate(reloaded)?.contextId,
  event.id,
);

const snapshot = buildLifeEventVaultSnapshot(
  upsertEventCandidate({
    ...first.event,
    metadata: first.event.metadata,
  }),
);
assert.ok(snapshot.metadata?.[CONTEXT_EXECUTION_PLAN_META_KEY]);
assert.equal(
  (snapshot.metadata?.[CONTEXT_EXECUTION_PLAN_META_KEY] as { version: number }).version,
  1,
);

console.log("test-context-execution-plan-persist: ok");
