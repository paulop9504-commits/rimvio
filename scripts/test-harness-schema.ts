#!/usr/bin/env npx tsx
/**
 * Phase 1 — Harness schema / serialize / repo / execution-state smoke.
 */
import assert from "node:assert/strict";
import {
  appendNode,
  createEmptyHarnessDraft,
  createHarnessExecutionState,
  createHarnessService,
  deserializeHarness,
  requiresApproval,
  serializeHarness,
  validateHarness,
} from "@/lib/harness";
import { buildSampleShoppingSearchHarness } from "@/lib/harness/fixtures";

async function main() {
  const sample = buildSampleShoppingSearchHarness();
  const ok = validateHarness(sample);
  assert.equal(ok.ok, true, "sample harness must validate");

  const json = serializeHarness(sample);
  const roundTrip = deserializeHarness(json);
  assert.equal(roundTrip.id, sample.id);
  assert.equal(roundTrip.nodes.length, sample.nodes.length);

  const bad = validateHarness({ ...sample, version: "not-a-version" });
  assert.equal(bad.ok, false);

  const dangling = validateHarness({
    ...sample,
    nodes: sample.nodes.map((n) =>
      n.id === "n_trigger" ? { ...n, next: ["missing_node"] } : n,
    ),
  });
  assert.equal(dangling.ok, false);
  if (!dangling.ok) {
    assert.ok(dangling.issues.some((i) => i.code === "dangling_edge"));
  }

  const service = createHarnessService();
  const created = await service.create(sample);
  assert.equal(created.ok, true);
  const listed = await service.list();
  assert.equal(listed.length, 1);
  const dup = await service.create(sample);
  assert.equal(dup.ok, false);

  let draft = createEmptyHarnessDraft({ id: "demo.empty", name: "Empty" });
  draft = appendNode(draft, {
    id: "only_action",
    type: "ACTION",
    name: "No trigger",
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
  });
  const missingTrigger = validateHarness(draft);
  assert.equal(missingTrigger.ok, false);

  const withMoney = validateHarness({
    ...sample,
    id: "shopping.pay",
    permissions: [
      ...sample.permissions,
      { type: "FINANCIAL", scope: "checkout", approvalRequired: true },
    ],
  });
  assert.equal(withMoney.ok, true);
  if (withMoney.ok) {
    assert.equal(requiresApproval(withMoney.harness), true);
  }

  const exec = createHarnessExecutionState({
    executionId: "exec_1",
    harnessId: sample.id,
    harnessVersion: sample.version,
    now: "2026-09-06T06:01:00.000Z",
  });
  assert.equal(exec.status, "PENDING");
  assert.equal(exec.logs.length, 0);

  console.log("test-harness-schema: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
