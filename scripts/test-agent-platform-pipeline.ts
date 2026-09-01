/**
 * Agent Platform pipeline smoke test.
 * Run: npx tsx scripts/test-agent-platform-pipeline.ts
 */

import assert from "node:assert/strict";
import { catalogSize, listRunnableCapabilities } from "../lib/agent-platform/capability-catalog";
import { publishCatalogCapability, ensureRegistryReady, listRegistryEntries } from "../lib/agent-platform/pipeline/publish";
import { verifyCapabilityOutput } from "../lib/agent-platform/pipeline/verify-output";
import { planCapabilityRepair } from "../lib/agent-platform/pipeline/repair-invoke";
import { runCompositeLoop } from "../lib/agent-platform/pipeline/run-composite-loop";
import { listCompositeLoops } from "../lib/agent-platform/composite/osaka-loops";
import { runToolLoop } from "../lib/agent-platform/pipeline/tool-loop";
import { invokePublishedCapability } from "../lib/agent-platform/pipeline/invoke";
import {
  resolveCompositeLoopFromUtterance,
  wantsCompositeResume,
} from "../lib/agent-platform/composite/resolve-composite-loop";
import { planSandboxRepair } from "../lib/agent-platform/pipeline/sandbox-repair";
import {
  ensureAgentPlatformHydrated,
  isAgentPlatformHydrated,
  readHydratedRegistrySize,
} from "../lib/agent-platform/persistence/hydrate";
import { executeAgentPlatformRunner } from "../lib/agent-platform/runner-registry";
import { runDevHubOperatorTurn } from "../lib/agent-platform/spine/operator-turn";
import { resetAgentPlatformStoresForTests } from "../lib/agent-platform/persistence/durable-store";
import { resetAgentPlatformHydrationForTests } from "../lib/agent-platform/persistence/hydrate";

async function main() {
  resetAgentPlatformStoresForTests();
  resetAgentPlatformHydrationForTests();

  assert.ok(catalogSize() >= 100, `catalog should have at least 100 capabilities (${catalogSize()})`);
  const runnable = listRunnableCapabilities();
  assert.ok(runnable.length >= 40, `runnable capabilities: ${runnable.length}`);

  await ensureRegistryReady();
  const registry = listRegistryEntries();
  assert.ok(registry.length >= 100, `registry seeded: ${registry.length}`);

  const published = publishCatalogCapability("workspace.inspect");
  assert.ok(published.ok, published.errorKo);

  const workspaceInvoke = await invokePublishedCapability({
    capabilityId: "workspace.inspect",
    input: { workspaceId: "hub:workspace:test" },
    userRequest: "inspect workspace",
    contextEventId: "hub:workspace:test",
    syncGoal: true,
  });
  assert.ok(workspaceInvoke.ok, workspaceInvoke.errorKo);
  assert.equal(workspaceInvoke.runtimeKind, "workspace");

  const operatorTurn = await runDevHubOperatorTurn({
    utterance: "오사카 호텔 검색해줘",
    platformId: "test",
    autoExecute: false,
  });
  assert.ok(operatorTurn.ok);
  assert.equal(operatorTurn.capabilityId, "hotel.search");
  assert.ok(operatorTurn.steps.length >= 4);

  const browserInvoke = await invokePublishedCapability({
    capabilityId: "hotel.search",
    input: {
      location: "오사카",
      checkIn: "2024-06-01",
      checkOut: "2024-06-03",
    },
    userRequest: "hotel search test",
    contextEventId: "hub:workspace:test",
    syncGoal: true,
  });
  assert.ok(browserInvoke.sandboxSessionId, "browser invoke should queue sandbox");

  const verifyFail = verifyCapabilityOutput({
    capabilityId: "workspace.inspect",
    output: {},
  });
  assert.equal(verifyFail.ok, false);

  const repair = planCapabilityRepair({
    capabilityId: "workspace.patch.apply",
    currentInput: { workspaceId: "hub:workspace:test", utterance: "test" },
    errors: ["workspace_patch_no_effect"],
    attempt: 1,
  });
  assert.ok(repair?.capabilityId === "workspace.entity.create");

  const toolLoop = await runToolLoop({
    capabilityId: "workspace.inspect",
    input: { workspaceId: "hub:workspace:loop-test" },
    userRequest: "inspect",
    contextEventId: "hub:workspace:loop-test",
    syncGoal: true,
    toolLoop: true,
  });
  assert.ok(toolLoop.ok);
  assert.ok(toolLoop.logs.length >= 2);

  const loops = listCompositeLoops();
  assert.equal(loops.length, 5);

  const tripFrame = await runCompositeLoop({
    loopId: "osaka.trip.frame",
    contextEventId: "hub:workspace:osaka-trip",
    userRequest: "오사카 3박",
  });
  assert.ok(tripFrame.ok, tripFrame.workLogKo);
  assert.equal(tripFrame.stepsCompleted, 4);
  assert.ok(tripFrame.goalPercent >= 90);

  assert.equal(resolveCompositeLoopFromUtterance("오사카 3박 일정"), "osaka.trip.frame");
  assert.equal(resolveCompositeLoopFromUtterance("오사카 호텔 검색"), "osaka.lodging.basic");
  assert.ok(wantsCompositeResume("계속해"));

  await ensureAgentPlatformHydrated();
  assert.ok(isAgentPlatformHydrated());
  assert.ok(readHydratedRegistrySize() >= 100);

  const transit = await executeAgentPlatformRunner("transit.absorb", {
    capabilityId: "transit.absorb",
    input: { workspaceId: "hub:workspace:transit-test", utterance: "오사카 지하철 노선" },
    userRequest: "오사카 지하철 노선",
    contextEventId: "hub:workspace:transit-test",
  });
  assert.ok(typeof transit.ok === "boolean");

  console.log("agent-platform pipeline OK");
  console.log(`  catalog=${catalogSize()} registry=${registry.length}`);
  console.log(`  workspace invoke=${workspaceInvoke.executionId}`);
  console.log(`  browser sandbox=${browserInvoke.sandboxSessionId}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
