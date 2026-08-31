/**
 * Main Agent context — Goal-centric facade over existing product/runtime stores (P0).
 *
 * Does not replace AgentProductTurn or AgentExecutionContext — composes them.
 */

import type { AgentProductTurn } from "@/lib/context-run/agent-product-pipeline";
import { readLastAgentProductTurn } from "@/lib/context-run/agent-product-pipeline";
import type { AgentExecutionContext } from "@/lib/agent-orchestrator/execution-context";
import type { AgentExecutionState } from "@/lib/workstream/build-agent-execution-state";
import { buildAgentExecutionState } from "@/lib/workstream/build-agent-execution-state";
import type { RimvioAgentRuntimeTurn } from "@/lib/workstream/rimvio-agent-runtime";
import { readLastRimvioAgentRuntimeTurn } from "@/lib/workstream/rimvio-agent-runtime";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { readContextWorkspace } from "@/lib/context-workspace";
import type { CapabilityIntentResolution } from "@/lib/rimvio-index/types";
import type { RimvioAgentRole } from "@/lib/agent-os/agent-role";

export type MainAgentWorkspaceRef = {
  readonly contextEventId: string;
  readonly domain: ContextWorkspaceState["domain"] | null;
  readonly status: ContextWorkspaceState["status"] | null;
  readonly nodeCount: number;
  readonly hasAgentPlan: boolean;
};

export type MainAgentContext = {
  readonly role: RimvioAgentRole;
  readonly goal: string;
  readonly intentUtterance: string;
  readonly contextEventId: string;
  readonly conversation: {
    readonly utterance: string;
    readonly contextEventId: string;
  };
  readonly workspace: MainAgentWorkspaceRef | null;
  readonly availableCapabilities: readonly string[];
  readonly capabilityIntent: CapabilityIntentResolution | null;
  readonly currentPlan: {
    readonly stepCount: number;
    readonly currentStepIndex: number | null;
  } | null;
  readonly observations: readonly string[];
  readonly verification: {
    readonly lastVerifyOk: boolean;
    readonly failedStage: string | null;
  };
  readonly constraints: readonly string[];
  readonly permissions: {
    readonly requiresUserApproval: boolean;
  };
  readonly productTurn: AgentProductTurn | null;
  readonly runtimeTurn: RimvioAgentRuntimeTurn | null;
  readonly executionState: AgentExecutionState | null;
};

export function buildMainAgentContext(input: {
  readonly contextEventId: string;
  readonly utterance?: string;
  readonly executionContext?: AgentExecutionContext | null;
}): MainAgentContext {
  const contextEventId = input.contextEventId.trim();
  const productTurn = readLastAgentProductTurn();
  const runtimeTurn = readLastRimvioAgentRuntimeTurn();
  const ws = readContextWorkspace(contextEventId);
  const utterance =
    input.utterance?.trim() ||
    productTurn?.utterance ||
    runtimeTurn?.ingress.utterance ||
    input.executionContext?.conversation.utterance ||
    "";

  const capabilityIntent =
    productTurn?.capabilityIntent &&
    productTurn.contextEventId === contextEventId
      ? productTurn.capabilityIntent
      : null;

  const availableCapabilities: string[] = [];
  if (capabilityIntent?.discoveryPlanCapabilityId) {
    availableCapabilities.push(capabilityIntent.discoveryPlanCapabilityId);
  }
  if (capabilityIntent?.reuse.topHit?.capabilityId) {
    availableCapabilities.push(capabilityIntent.reuse.topHit.capabilityId);
  }

  const agentPlan = ws?.agentPlan;
  const executionState = buildAgentExecutionState({ contextEventId });

  const observations: string[] = [];
  if (productTurn?.statusLog?.length) {
    observations.push(...productTurn.statusLog.slice(-6));
  }
  if (input.executionContext?.observations.length) {
    for (const o of input.executionContext.observations.slice(-4)) {
      if (o.summaryKo) observations.push(o.summaryKo);
    }
  }

  const constraints: string[] = [];
  const approvalNeed = runtimeTurn?.judgment?.cost.userApprovalNeed;
  if (
    approvalNeed === "final_commit_only" ||
    approvalNeed === "field_commit" ||
    approvalNeed === "soft_chip"
  ) {
    constraints.push("user_approval_required");
  }

  return {
    role: "main",
    goal: utterance || executionState.goalKo,
    intentUtterance: utterance,
    contextEventId,
    conversation: { utterance, contextEventId },
    workspace: ws
      ? {
          contextEventId,
          domain: ws.domain,
          status: ws.status,
          nodeCount: ws.nodes.length,
          hasAgentPlan: Boolean(agentPlan?.steps?.length),
        }
      : null,
    availableCapabilities,
    capabilityIntent,
    currentPlan: agentPlan?.steps?.length
      ? {
          stepCount: agentPlan.steps.length,
          currentStepIndex: agentPlan.cursor ?? null,
        }
      : null,
    observations,
    verification: {
      lastVerifyOk: productTurn?.lastVerifyOk ?? true,
      failedStage: productTurn?.failedStage ?? null,
    },
    constraints,
    permissions: {
      requiresUserApproval:
        approvalNeed === "final_commit_only" ||
        approvalNeed === "field_commit" ||
        approvalNeed === "soft_chip",
    },
    productTurn:
      productTurn?.contextEventId === contextEventId ? productTurn : null,
    runtimeTurn:
      runtimeTurn?.ingress.contextEventId === contextEventId ? runtimeTurn : null,
    executionState,
  };
}
