/**
 * P12 Loop Builder — NL / Visual / Code → same Loop Definition → lint → test.
 * Run: npm run test:agent-os-p12
 */
import assert from "node:assert/strict";
import {
  compileLoopToRuntimeSteps,
  generateLoopFromUtterance,
  lintLoopDefinition,
  loopDefinitionToCode,
  packageLoopAsCapability,
  parseLoopCode,
  resetLoopDefinitionsForTests,
  testLoopDefinition,
  wrapCapabilityAsLoop,
} from "@/lib/agent-os/loop-builder";
import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";
import { parseDevWorkspacePane } from "@/lib/hub/dev/dev-workspace-nav";
import { HUB_WORKSPACE_TOOL_IDS } from "@/lib/hub/dev/hub-workspace-tools";

async function main() {
  resetLoopDefinitionsForTests();

  const generated = generateLoopFromUtterance(
    "사용자가 주문하면 주문 상태를 확인하고 재고가 있으면 주문을 승인해. 재고가 없으면 사용자에게 알려주고, 주문 승인 후 결제하고 결제가 실패하면 최대 2번 재시도해.",
  );
  assert.ok(generated.nodes.some((n) => n.kind === "TRIGGER"));
  assert.ok(generated.nodes.some((n) => n.kind === "UNDERSTAND"));
  assert.ok(generated.nodes.some((n) => n.kind === "INSPECT"));
  assert.ok(generated.nodes.some((n) => n.kind === "CONDITION"));
  assert.ok(generated.nodes.some((n) => n.kind === "ASK_USER"));
  assert.ok(generated.nodes.some((n) => n.kind === "CAPABILITY" || n.kind === "ACT"));
  assert.ok(generated.nodes.some((n) => n.kind === "VERIFY"));
  assert.ok(generated.nodes.some((n) => n.kind === "RETRY"));
  const retry = generated.nodes.find((n) => n.kind === "RETRY");
  assert.equal(retry?.config.maxAttempts, 2);

  const lintOk = lintLoopDefinition(generated);
  assert.equal(lintOk.publishBlocked, false, "generated loop should be publishable");
  assert.ok(lintOk.checks.every((c) => c.ok), "AI CHECK should be green for generated loop");

  const empty = lintLoopDefinition({
    id: "empty",
    name: "empty",
    version: "1",
    description: "",
    source: "visual",
    nodes: [createLoopNode("INSPECT", "a"), createLoopNode("VERIFY", "b"), createLoopNode("VERIFY", "c")],
    edges: [],
    entryId: "a",
  });
  assert.ok(empty.issues.some((i) => i.code === "no_act"));

  const noVerify = lintLoopDefinition({
    id: "nv",
    name: "nv",
    version: "1",
    description: "",
    source: "visual",
    nodes: [createLoopNode("ACT", "a"), createLoopNode("ACT", "b")],
    edges: [{ from: "a", to: "b", kind: "next" }],
    entryId: "a",
  });
  assert.ok(noVerify.issues.some((i) => i.code === "no_verify"));

  const infinite = lintLoopDefinition({
    id: "inf",
    name: "inf",
    version: "1",
    description: "",
    source: "visual",
    nodes: [
      createLoopNode("ACT", "a"),
      createLoopNode("VERIFY", "v"),
      { ...createLoopNode("RETRY", "r"), config: { maxAttempts: 0 } },
    ],
    edges: [
      { from: "a", to: "v", kind: "next" },
      { from: "v", to: "r", kind: "fail" },
    ],
    entryId: "a",
  });
  assert.ok(infinite.issues.some((i) => i.code === "infinite_retry"));

  const code = loopDefinitionToCode(generated);
  const parsed = parseLoopCode(code);
  assert.ok(parsed.nodes.length >= 4);
  assert.equal(parsed.nodes[0]?.kind, generated.nodes[0]?.kind);

  const steps = compileLoopToRuntimeSteps(generated);
  const gateway = new Set<string>(HUB_WORKSPACE_TOOL_IDS);
  assert.ok(steps.some((s) => s.toolId === "workspace.inspect" || s.toolId === "capability.create" || s.toolId === "test.run"));
  assert.ok(steps.every((s) => s.toolId === null || gateway.has(s.toolId)));

  const test = await testLoopDefinition({ loop: generated });
  assert.ok(test.traces.length >= 3);
  assert.ok(test.steps.length >= 3);

  const failedPay = await testLoopDefinition({
    loop: generated,
    failNodeId: generated.nodes.find((n) => /pay|결제/i.test(n.label))?.id ?? "n_pay",
  });
  assert.equal(failedPay.passed, false);
  assert.ok(failedPay.reasonKo);

  const wrapped = wrapCapabilityAsLoop({ capabilityId: "order.create" });
  assert.deepEqual(
    wrapped.nodes.map((n) => n.kind),
    ["INSPECT", "CAPABILITY", "OBSERVE", "VERIFY", "COMPLETE", "REPLAN"],
  );

  const pkg = packageLoopAsCapability({ name: "Food Order Agent", loop: generated, tested: test.passed });
  assert.equal(pkg.name, "Food Order Agent");
  assert.ok(pkg.verification.length >= 1);

  assert.equal(parseDevWorkspacePane("loops", null), "loops");
  assert.equal(parseDevWorkspacePane("loop", null), "loops");

  const { LOOP_BLOCK_TEMPLATES, createNodeFromTemplate, validateCustomBlockCode } = await import(
    "@/lib/agent-os/loop-builder"
  );
  assert.ok(LOOP_BLOCK_TEMPLATES.length >= 30);
  const tpl = createNodeFromTemplate(LOOP_BLOCK_TEMPLATES.find((t) => t.id === "inventory.check")!, "n_tpl");
  assert.equal(tpl.kind, "INSPECT");
  assert.ok(tpl.config.customCode?.includes("inventory"));
  assert.equal(validateCustomBlockCode('act("order.create")').ok, true);
  assert.equal(validateCustomBlockCode("eval(1)").ok, false);

  resetLoopDefinitionsForTests();
  console.log("ok — agent-os P12 Loop Builder (generate · lint · code · compile · test)");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
