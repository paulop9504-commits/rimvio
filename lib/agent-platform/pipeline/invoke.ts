/**
 * Invoke Capability — Publish → Registry → Invoke one-line pipeline.
 */

import { nextExecutionId, appendLedgerEntry } from "@/lib/capability-ledger/execution-store";
import { persistCapabilityExecutionAsync } from "@/lib/capability-ledger/persist-execution";
import { sandboxController } from "@/lib/sandbox/server";
import { persistSandboxSessionSnapshot } from "../persistence/durable-store";
import {
  createInitialGoalState,
  markCapabilityCompletedInGoal,
  syncPersistedGoalState,
} from "../persistence/goal-state";
import { ensureRegistryReady, resolveRegistryEntry } from "../pipeline/publish";
import {
  executeAgentPlatformRunner,
  isBrowserCapability,
} from "../runner-registry";
import type { InvokeCapabilityInput, InvokeCapabilityResult } from "../types";

function buildWorkLog(input: {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly runtimeKind: string;
  readonly errorKo?: string;
}): string {
  if (!input.ok) {
    return `${input.capabilityId} 실행 실패 · ${input.errorKo ?? "unknown"}`;
  }
  return `${input.capabilityId} · ${input.runtimeKind} · 실행 완료`;
}

export async function invokePublishedCapability(
  input: InvokeCapabilityInput,
): Promise<InvokeCapabilityResult> {
  const capabilityId = input.capabilityId.trim();
  if (input.toolLoop !== false && !isBrowserCapability(capabilityId)) {
    const { runToolLoop } = await import("./tool-loop");
    return runToolLoop(input);
  }

  const started = Date.now();
  await ensureRegistryReady();
  const contextEventId =
    input.contextEventId?.trim() ||
    (input.platformId ? `hub:workspace:${input.platformId}` : "hub:workspace:dev");

  const entry = resolveRegistryEntry(capabilityId);
  if (!entry) {
    return {
      ok: false,
      capabilityId,
      executionId: nextExecutionId(),
      runtimeKind: "prepare-only",
      output: null,
      latencyMs: Date.now() - started,
      errorKo: "Registry에 capability가 없어요.",
      workLogKo: `${capabilityId} · Registry miss`,
    };
  }

  if (entry.approvalRequired && !input.skipApproval) {
    return {
      ok: true,
      capabilityId,
      executionId: nextExecutionId(),
      runtimeKind: "prepare-only",
      output: { prepare: true, approvalRequired: true },
      latencyMs: Date.now() - started,
      prepareOnly: true,
      workLogKo: `${capabilityId} · 승인 대기`,
    };
  }

  const executionId = nextExecutionId();
  let sandboxSessionId: string | null = null;
  let output: Record<string, unknown> | null = null;
  let ok = false;
  let errorKo: string | undefined;
  let runtimeKind = "prepare-only" as InvokeCapabilityResult["runtimeKind"];

  if (isBrowserCapability(capabilityId)) {
    runtimeKind = "browser";
    const session = sandboxController.createSession({
      capability: capabilityId,
      userRequest: input.userRequest,
      input: {
        ...input.input,
        contextEventId,
        workspaceId: input.input.workspaceId ?? contextEventId,
      },
      userId: input.userId,
      projectId: input.projectId,
    });
    sandboxSessionId = session.sessionId;
    persistSandboxSessionSnapshot(session);

    const queued = sandboxController.queueExecution(session.sessionId);
    ok = queued.ok;
    output = {
      sandboxSessionId: session.sessionId,
      executionId: session.executionId,
      queued: queued.ok,
    };
    errorKo = queued.ok ? undefined : queued.error ?? "sandbox_queue_failed";
  } else {
    const runnerResult = await executeAgentPlatformRunner(capabilityId, {
      ...input,
      contextEventId,
    });
    runtimeKind = runnerResult.runtimeKind;
    ok = runnerResult.ok;
    output = runnerResult.output;
    errorKo = runnerResult.errorKo;
  }

  appendLedgerEntry({
    executionId,
    userRequestId: input.userRequest ?? executionId,
    contextEventId,
    parentExecutionId: input.parentExecutionId ?? null,
    agentId: "rimvio-agent-platform",
    capabilityId: capabilityId as import("@/lib/capability-registry/capability-contract").CapabilityId,
    toolId: null,
    developerId: entry.platformId,
    publisherId: entry.platformId,
    providerId: entry.platformId,
    inputClass: "execute",
    pricingTier: "T1",
    executionStatus: ok ? "success" : "failed",
    outputQuality: ok ? 1 : 0,
    usageWeight: 1,
    unitPriceKrw: 0,
    payoutKrw: 0,
    manifestVersion: entry.inputSchema,
    finalized: true,
    timestamp: new Date().toISOString(),
  });

  void persistCapabilityExecutionAsync({
    executionId,
    userRequestId: input.userRequest ?? executionId,
    contextEventId,
    parentExecutionId: input.parentExecutionId ?? null,
    agentId: "rimvio-agent-platform",
    capabilityId: capabilityId as import("@/lib/capability-registry/capability-contract").CapabilityId,
    toolId: null,
    developerId: entry.platformId,
    publisherId: entry.platformId,
    providerId: entry.platformId,
    inputClass: "execute",
    pricingTier: "T1",
    executionStatus: ok ? "success" : "failed",
    outputQuality: ok ? 1 : 0,
    usageWeight: 1,
    unitPriceKrw: 0,
    payoutKrw: 0,
    manifestVersion: entry.inputSchema,
    finalized: true,
    timestamp: new Date().toISOString(),
  });

  let goalPercent: number | undefined;
  if (input.syncGoal !== false) {
    const existing = markCapabilityCompletedInGoal({
      contextEventId,
      capabilityId,
      executionId,
      ok,
    });
    goalPercent = existing.percent;
  } else {
    syncPersistedGoalState(
      createInitialGoalState({
        contextEventId,
        goalKo: input.userRequest ?? capabilityId,
        utterance: input.userRequest,
        capabilityId,
      }),
    );
  }

  return {
    ok,
    capabilityId,
    executionId,
    runtimeKind,
    output,
    sandboxSessionId,
    latencyMs: Date.now() - started,
    errorKo,
    workLogKo: buildWorkLog({ ok, capabilityId, runtimeKind, errorKo }),
    goalPercent,
  };
}
