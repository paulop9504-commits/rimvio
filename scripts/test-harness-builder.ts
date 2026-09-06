#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildSampleShoppingSearchHarness } from "@/lib/harness/fixtures";
import {
  addHarnessBuilderNode,
  applyBuilderAssistantCommand,
  applyFlowEdgesToHarness,
  harnessToFlowEdges,
  harnessToFlowNodes,
  removeHarnessBuilderNode,
} from "@/lib/harness/builder-graph";
import { validateHarness } from "@/lib/harness/validate";

function main() {
  let h = buildSampleShoppingSearchHarness();
  const nodes = harnessToFlowNodes(h);
  const edges = harnessToFlowEdges(h);
  assert.ok(nodes.length >= 4);
  assert.ok(edges.length >= 3);

  h = addHarnessBuilderNode(h, "REPORT", "리포트");
  assert.ok(h.nodes.some((n) => n.type === "REPORT"));

  const patched = applyBuilderAssistantCommand(h, "가격 50만으로 제한해줘");
  assert.ok(patched.harness.constraints.some((c) => c.field === "price" && c.value === 500_000));

  const withVerify = applyBuilderAssistantCommand(patched.harness, "검증 단계 추가해줘");
  assert.ok(withVerify.harness.nodes.some((n) => n.type === "VERIFY" && n.name === "결과 검증"));

  const reportId = withVerify.harness.nodes.find((n) => n.type === "REPORT")?.id;
  assert.ok(reportId);
  const trimmed = removeHarnessBuilderNode(withVerify.harness, reportId!);
  assert.ok(!trimmed.nodes.some((n) => n.id === reportId));

  const rewired = applyFlowEdgesToHarness(trimmed, [
    { id: "a->b", source: "n_trigger", target: "n_research" },
  ]);
  assert.deepEqual(rewired.nodes.find((n) => n.id === "n_trigger")?.next, ["n_research"]);

  const ok = validateHarness(buildSampleShoppingSearchHarness());
  assert.equal(ok.ok, true);

  console.log("test-harness-builder: PASS");
}

main();
