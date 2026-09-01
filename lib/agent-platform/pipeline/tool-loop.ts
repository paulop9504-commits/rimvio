/**
 * Tool Loop — Observe → Plan → Invoke → Verify → Repair → Goal%.
 * Cursor-style: verify is mandatory; repair retries with mutated input.
 */

import type {
  InvokeCapabilityInput,
  InvokeCapabilityResult,
  ToolLoopPhase,
  ToolLoopStepLog,
} from "../types";
import { isBrowserCapability } from "../runner-registry";
import { invokePublishedCapability } from "./invoke";
import { planCapabilityRepair } from "./repair-invoke";
import { verifyCapabilityOutput } from "./verify-output";

export type RunToolLoopInput = InvokeCapabilityInput;

export type RunToolLoopResult = InvokeCapabilityResult & {
  readonly logs: readonly ToolLoopStepLog[];
};

function log(
  logs: ToolLoopStepLog[],
  phase: ToolLoopPhase,
  capabilityId: string,
  ok: boolean,
  detailKo: string,
): void {
  logs.push({ phase, capabilityId, ok, detailKo });
}

export async function runToolLoop(input: RunToolLoopInput): Promise<RunToolLoopResult> {
  const logs: ToolLoopStepLog[] = [];
  const capabilityId = input.capabilityId.trim();
  const maxRepair = input.maxRepairAttempts ?? 2;
  const useLoop = input.toolLoop !== false && !isBrowserCapability(capabilityId);

  log(logs, "observe", capabilityId, true, input.userRequest ?? capabilityId);
  log(logs, "plan", capabilityId, true, `invoke · maxRepair ${maxRepair}`);

  let currentInput = { ...input.input };
  let lastResult: InvokeCapabilityResult | null = null;
  let repairAttempts = 0;

  for (let attempt = 0; attempt <= maxRepair; attempt += 1) {
    lastResult = await invokePublishedCapability({
      ...input,
      input: currentInput,
      toolLoop: false,
    });

    log(
      logs,
      "invoke",
      capabilityId,
      lastResult.ok,
      lastResult.workLogKo,
    );

    if (!useLoop || !lastResult.ok || lastResult.prepareOnly) {
      return { ...lastResult, logs, repairAttempts };
    }

    const verify = verifyCapabilityOutput({
      capabilityId,
      output: lastResult.output,
    });

    log(
      logs,
      "verify",
      capabilityId,
      verify.ok,
      verify.ok ? "검증 통과" : verify.errors.join(" · "),
    );

    if (verify.ok) {
      return {
        ...lastResult,
        logs,
        verified: true,
        repaired: repairAttempts > 0,
        repairAttempts,
        workLogKo: `${lastResult.workLogKo} · verified`,
      };
    }

    if (attempt >= maxRepair) {
      return {
        ...lastResult,
        ok: false,
        logs,
        verified: false,
        repaired: repairAttempts > 0,
        repairAttempts,
        errorKo: verify.errors.join(" · "),
        workLogKo: `${capabilityId} · verify failed · ${verify.errors.join(" · ")}`,
      };
    }

    const repair = planCapabilityRepair({
      capabilityId,
      currentInput,
      errors: verify.errors,
      attempt: attempt + 1,
    });

    if (!repair) {
      return {
        ...lastResult,
        ok: false,
        logs,
        verified: false,
        repairAttempts,
        errorKo: verify.errors.join(" · "),
        workLogKo: `${capabilityId} · repair 없음`,
      };
    }

    repairAttempts += 1;
    currentInput = repair.input;
    log(logs, "repair", repair.capabilityId, true, repair.strategyKo);
  }

  return {
    ...(lastResult ?? {
      ok: false,
      capabilityId,
      executionId: "unknown",
      runtimeKind: "prepare-only",
      output: null,
      latencyMs: 0,
      workLogKo: "tool loop empty",
    }),
    logs,
    repairAttempts,
  };
}
