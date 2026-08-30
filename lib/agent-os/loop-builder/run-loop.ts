/**
 * Test Loop — walks compiled steps. Hub tools when context exists; never invents E2E.
 */

import { invokeHubWorkspaceTool, type HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";
import { compileLoopToRuntimeSteps } from "@/lib/agent-os/loop-builder/compile";
import { lintLoopDefinition } from "@/lib/agent-os/loop-builder/lint";
import type { LoopDefinition, LoopTestResult, LoopTraceStep } from "@/lib/agent-os/loop-builder/types";

export async function testLoopDefinition(input: {
  readonly loop: LoopDefinition;
  readonly toolCtx?: HubWorkspaceToolContext | null;
  readonly failNodeId?: string | null;
}): Promise<LoopTestResult> {
  const lint = lintLoopDefinition(input.loop);
  const steps = compileLoopToRuntimeSteps(input.loop);
  const traces: LoopTraceStep[] = [];
  const results: { nodeId: string; label: string; ok: boolean }[] = [];
  let failed = false;
  let reasonKo: string | null = lint.publishBlocked ? lint.issues[0]?.messageKo ?? null : null;

  for (const step of steps) {
    if (step.kind === "COMPLETE" || step.kind === "FAIL" || step.kind === "ASK_USER") {
      traces.push({
        atIso: new Date().toISOString(),
        nodeId: step.nodeId,
        label: step.label,
        status: failed && step.kind !== "FAIL" ? "skip" : "pass",
        detail: step.kind,
      });
      results.push({ nodeId: step.nodeId, label: step.label, ok: !failed || step.kind === "FAIL" });
      continue;
    }

    if (input.failNodeId && step.nodeId === input.failNodeId) {
      failed = true;
      reasonKo = `${step.label} capability returned timeout`;
      traces.push({
        atIso: new Date().toISOString(),
        nodeId: step.nodeId,
        label: step.label,
        status: "fail",
        detail: reasonKo,
      });
      results.push({ nodeId: step.nodeId, label: step.label, ok: false });
      continue;
    }

    if (step.kind === "RETRY" || step.kind === "REPLAN") {
      traces.push({
        atIso: new Date().toISOString(),
        nodeId: step.nodeId,
        label: step.label,
        status: "pass",
        detail: failed ? "recover" : "idle",
      });
      results.push({ nodeId: step.nodeId, label: step.label, ok: true });
      if (step.kind === "RETRY") failed = false;
      continue;
    }

    if (input.toolCtx && step.toolId) {
      const result = await invokeHubWorkspaceTool(step.toolId, step.args, input.toolCtx);
      const ok = result.ok;
      if (!ok) {
        failed = true;
        reasonKo = result.ok === false ? result.error : `${step.label} failed`;
      }
      traces.push({
        atIso: new Date().toISOString(),
        nodeId: step.nodeId,
        label: step.label,
        status: ok ? "pass" : "fail",
        detail: ok ? step.toolId : reasonKo ?? "failed",
      });
      results.push({ nodeId: step.nodeId, label: step.label, ok });
      continue;
    }

    traces.push({
      atIso: new Date().toISOString(),
      nodeId: step.nodeId,
      label: step.label,
      status: "pass",
      detail: step.toolId ? `${step.toolId} (dry-run)` : step.kind,
    });
    results.push({ nodeId: step.nodeId, label: step.label, ok: true });
  }

  const passed = !lint.publishBlocked && results.filter((s) => !s.ok).length === 0;
  return {
    runId: `run-${Date.now()}`,
    passed,
    steps: results,
    traces,
    reasonKo: passed ? null : reasonKo,
  };
}
