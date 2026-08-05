/**
 * Workspace Agent Plan executor — sequential steps, each via single-turn Loop.
 * Fail-closed on step Postcondition; L9 Conflict Replan = one alternate trail.
 */

import {
  compileWorkspaceAgentPlan,
} from "@/lib/context-run/compile-workspace-agent-plan";
import type {
  WorkspaceAgentPlan,
  WorkspaceAgentPlanObservation,
  WorkspaceAgentPlanStep,
} from "@/lib/context-run/workspace-agent-plan";
import {
  runWorkspaceAgentLoop,
  type WorkspaceAgentLoopResult,
} from "@/lib/context-run/workspace-agent-loop";
import { assertAgentPostcondition } from "@/lib/agent-policy/postcondition-check";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import {
  createAgentTraceEntry,
  appendAgentTrace,
} from "@/lib/agent-policy/agent-trace";
import { buildAgentActionOwnership } from "@/lib/agent-policy/action-ownership";
import { detectWorkspacePlanConflict } from "@/lib/context-run/detect-workspace-plan-conflict";
import {
  attachConflictReplan,
  compileConflictReplanSteps,
} from "@/lib/context-run/replan-workspace-agent-plan";

export type WorkspaceAgentPlanRunResult = {
  readonly ok: boolean;
  readonly plan: WorkspaceAgentPlan;
  readonly contextEventId: string | null;
  readonly workspaceMutated: boolean;
  readonly statusKo: string | null;
  readonly verified: boolean;
  readonly waiting: true;
  readonly essayForbidden: true;
  readonly commitPending: boolean;
  /** Last step loop result (for soft chips / via). */
  readonly lastLoop: WorkspaceAgentLoopResult | null;
  readonly stepsDone: number;
  readonly stepsFailed: number;
  readonly replanned: boolean;
};

function visibleCount(contextEventId: string | null): number {
  if (!contextEventId) return 0;
  const state = readContextWorkspace(contextEventId);
  return state?.nodes.filter((n) => n.visible).length ?? 0;
}

function stampPlanTrace(input: {
  readonly contextEventId: string;
  readonly plan: WorkspaceAgentPlan;
  readonly statusKo: string | null;
}): void {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return;
  const entry = createAgentTraceEntry({
    kind: "plan",
    summaryKo:
      input.statusKo ??
      `Plan ${input.plan.planKind} · ${input.plan.steps.length}스텝`,
    ownership: buildAgentActionOwnership({
      actor: "ai",
      approval: "none",
      actionKo: `Workspace Plan · ${input.plan.planKind}`,
      afterKo: input.plan.steps.map((s) => s.labelKo).join(" → "),
    }),
    evidenceLinesKo: input.plan.steps.map((s) => s.labelKo).slice(0, 4),
  });
  const nextTrace = appendAgentTrace(state.agentTrace, entry);
  writeContextWorkspace({
    ...state,
    agentTrace: nextTrace,
    updatedAtIso: new Date().toISOString(),
  });
}

function persistAgentPlan(input: {
  readonly contextEventId: string;
  readonly plan: WorkspaceAgentPlan;
}): void {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return;
  writeContextWorkspace({
    ...state,
    agentPlan: { ...input.plan, contextEventId: input.contextEventId },
    updatedAtIso: new Date().toISOString(),
  });
}

async function runOneStep(input: {
  readonly step: WorkspaceAgentPlanStep;
  readonly contextEventId: string;
}): Promise<{
  readonly step: WorkspaceAgentPlanStep;
  readonly loop: WorkspaceAgentLoopResult;
  readonly observation: WorkspaceAgentPlanObservation;
}> {
  const loop = await runWorkspaceAgentLoop({
    utterance: input.step.utterance,
    explicitContextEventId: input.contextEventId,
  });

  let ok = loop.ok || loop.workspaceMutated;
  let statusKo = loop.statusKo;

  if (ok && input.step.expect) {
    const pc = assertAgentPostcondition({
      contextEventId: input.contextEventId,
      expect: input.step.expect,
    });
    if (!pc.ok) {
      ok = false;
      statusKo = pc.statusKo;
    }
  }

  const observation: WorkspaceAgentPlanObservation = {
    ok,
    statusKo,
    visibleCount: visibleCount(input.contextEventId),
    workspaceMutated: loop.workspaceMutated,
    toolId: loop.toolId,
    patchKind: loop.patchKind,
  };

  // P5 Observe — stamp last observation for UI / next-step context.
  {
    const state = readContextWorkspace(input.contextEventId);
    if (state) {
      writeContextWorkspace({
        ...state,
        lastChangeKo:
          observation.statusKo ??
          state.lastChangeKo ??
          input.step.labelKo,
        updatedAtIso: new Date().toISOString(),
      });
    }
  }

  const step: WorkspaceAgentPlanStep = {
    ...input.step,
    status: ok ? "done" : "failed",
    observation,
  };

  return { step, loop, observation };
}

/**
 * Compile + execute Workspace Agent Plan.
 * Single-step plans still go through the same executor (thin wrap).
 */
export async function runWorkspaceAgentPlan(input: {
  readonly utterance: string;
  readonly explicitContextEventId?: string | null;
  readonly plan?: WorkspaceAgentPlan | null;
}): Promise<WorkspaceAgentPlanRunResult> {
  const utterance = input.utterance.trim();
  const contextEventId =
    input.explicitContextEventId?.trim() ||
    input.plan?.contextEventId?.trim() ||
    null;

  let plan =
    input.plan ??
    compileWorkspaceAgentPlan({
      utterance,
      contextEventId,
    });

  if (!contextEventId) {
    return {
      ok: false,
      plan,
      contextEventId: null,
      workspaceMutated: false,
      statusKo: "활성 Workspace 없음",
      verified: false,
      waiting: true,
      essayForbidden: true,
      commitPending: false,
      lastLoop: null,
      stepsDone: 0,
      stepsFailed: 0,
      replanned: false,
    };
  }

  plan = { ...plan, contextEventId };

  // Persist plan breadcrumb before running.
  stampPlanTrace({
    contextEventId,
    plan,
    statusKo: `계획 ${plan.steps.length}스텝 · ${plan.planKind}`,
  });
  persistAgentPlan({ contextEventId, plan });

  const nextSteps: WorkspaceAgentPlanStep[] = [];
  let workspaceMutated = false;
  let lastLoop: WorkspaceAgentLoopResult | null = null;
  let stepsDone = 0;
  let stepsFailed = 0;
  let stoppedEarly = false;
  let replanned = false;
  const statusParts: string[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const pending = plan.steps[i]!;
    if (stoppedEarly) {
      nextSteps.push({ ...pending, status: "skipped" });
      continue;
    }

    const { step, loop, observation } = await runOneStep({
      step: pending,
      contextEventId,
    });
    nextSteps.push(step);
    lastLoop = loop;
    workspaceMutated = workspaceMutated || observation.workspaceMutated;

    if (observation.ok) {
      stepsDone += 1;
      if (observation.statusKo) statusParts.push(observation.statusKo);

      // L9 — schedule conflict after a successful step
      if (!replanned) {
        const conflict = detectWorkspacePlanConflict({ contextEventId });
        if (conflict) {
          const replanSteps = compileConflictReplanSteps({
            plan: { ...plan, contextEventId, steps: nextSteps },
            conflict,
            failedStep: null,
          });
          if (replanSteps && replanSteps.length > 0) {
            replanned = true;
            statusParts.push(`재계획 · ${conflict.reasonKo}`);
            stampPlanTrace({
              contextEventId,
              plan,
              statusKo: `재계획 · ${conflict.reasonKo}`,
            });
            // Drop remaining original steps; append replan trail.
            for (let j = i + 1; j < plan.steps.length; j++) {
              nextSteps.push({ ...plan.steps[j]!, status: "skipped" });
            }
            plan = attachConflictReplan({
              plan: { ...plan, steps: nextSteps },
              remainingDone: nextSteps,
              replanSteps,
            });
            // Continue loop over newly attached pending steps.
            i = nextSteps.length - 1;
            continue;
          }
        }
      }
    } else {
      stepsFailed += 1;
      statusParts.push(observation.statusKo ?? `${step.labelKo} 실패`);

      if (!replanned) {
        const replanSteps = compileConflictReplanSteps({
          plan: {
            ...plan,
            contextEventId,
            steps: [
              ...nextSteps,
              ...plan.steps.slice(i + 1).map((s) => ({
                ...s,
                status: "pending" as const,
              })),
            ],
          },
          conflict: { kind: "step_failed", dayIndex: null, reasonKo: observation.statusKo ?? "스텝 실패", nodeIds: [] },
          failedStep: step,
        });
        if (replanSteps && replanSteps.length > 0) {
          replanned = true;
          statusParts.push("재계획 · 1회");
          for (let j = i + 1; j < plan.steps.length; j++) {
            nextSteps.push({ ...plan.steps[j]!, status: "skipped" });
          }
          plan = attachConflictReplan({
            plan: { ...plan, steps: nextSteps },
            remainingDone: nextSteps,
            replanSteps,
          });
          i = nextSteps.length - 1;
          continue;
        }
      }

      stoppedEarly = true;
    }
  }

  plan = {
    ...plan,
    steps: nextSteps.length >= plan.steps.length ? nextSteps : plan.steps,
    cursor: nextSteps.filter((s) => s.status === "done" || s.status === "failed")
      .length,
  };

  // Prefer the fully executed step list (includes replan attachments).
  if (nextSteps.length > 0) {
    plan = { ...plan, steps: nextSteps };
  }

  const ok = stepsFailed === 0 && stepsDone > 0;
  const statusKo =
    plan.steps.length > 1
      ? [
          `${plan.planKind} ${stepsDone}/${plan.steps.filter((s) => s.status !== "skipped").length}`,
          replanned ? "재계획" : null,
          ...statusParts.slice(-2),
        ]
          .filter(Boolean)
          .join(" · ")
      : statusParts[0] ?? lastLoop?.statusKo ?? null;

  stampPlanTrace({
    contextEventId,
    plan,
    statusKo:
      ok
        ? `완료 · ${plan.planKind}${replanned ? " · 재계획" : ""}`
        : `중단 · ${plan.planKind} (${stepsFailed}실패)`,
  });
  persistAgentPlan({ contextEventId, plan });

  return {
    ok: ok || workspaceMutated,
    plan,
    contextEventId,
    workspaceMutated,
    statusKo,
    verified: lastLoop?.verified ?? ok,
    waiting: true,
    essayForbidden: true,
    commitPending: lastLoop?.commitPending ?? false,
    lastLoop,
    stepsDone,
    stepsFailed,
    replanned,
  };
}
