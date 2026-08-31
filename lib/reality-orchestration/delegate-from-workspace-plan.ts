/**
 * Workspace Agent Plan → Reality Orchestration Pipeline bridge.
 * Delegates lodging/travel compound plans to runRealityPipeline + agent dispatch.
 */

import type { CapabilityId } from "@/lib/capability-registry";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import type {
  WorkspaceAgentPlan,
  WorkspaceAgentPlanKind,
} from "@/lib/context-run/workspace-agent-plan";
import type { WorkspaceAgentPlanRunResult } from "@/lib/context-run/run-workspace-agent-plan";
import { runRealityPipeline } from "@/lib/reality-orchestration/run-reality-pipeline";
import type { CompensationExecutor } from "@/lib/reality-transaction";

const DELEGATE_PLAN_KINDS: readonly WorkspaceAgentPlanKind[] = [
  "scout_domains",
  "compound_c",
  "scout_refine_day",
  "add_a",
];

const noopCompensation: CompensationExecutor = async () => true;

function resolveRequiredCapabilities(utterance: string): CapabilityId[] {
  if (hasLodgingDomainCue(utterance)) {
    return ["BOOK_HOTEL", "SEARCH"];
  }
  if (/항공|flight|비행/iu.test(utterance)) {
    return ["BOOK_FLIGHT", "SEARCH"];
  }
  return ["SEARCH"];
}

/**
 * Try Reality Pipeline with agent dispatch for travel/lodging workspace plans.
 * Returns null when delegation does not apply or pipeline halts early.
 */
export async function tryExecuteViaRealityPipeline(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly plan: WorkspaceAgentPlan;
}): Promise<WorkspaceAgentPlanRunResult | null> {
  if (!DELEGATE_PLAN_KINDS.includes(input.plan.planKind)) {
    return null;
  }
  if (!hasLodgingDomainCue(input.utterance) && !/여행|trip|travel/iu.test(input.utterance)) {
    return null;
  }

  const pipeline = await runRealityPipeline(
    {
      contextId: input.contextEventId,
      goal: input.utterance,
      goalKo: input.utterance,
      domain: "travel",
      constraints: [],
      resources: [{ id: "r-workspace", kind: "context", satisfies: [] }],
      actionType: "search",
      requiredCapabilities: resolveRequiredCapabilities(input.utterance),
    },
    undefined,
    noopCompensation,
  );

  if (!pipeline.success) {
    return null;
  }

  const stepsDone = pipeline.plan?.nodes.filter((n) => n.status === "done").length ?? 0;

  return {
    ok: true,
    plan: input.plan,
    contextEventId: input.contextEventId,
    workspaceMutated: stepsDone > 0,
    statusKo: `Reality Pipeline · ${stepsDone}단계 완료`,
    verified: pipeline.validation?.allPassed === true,
    waiting: true,
    essayForbidden: true,
    commitPending: false,
    lastLoop: null,
    stepsDone,
    stepsFailed: 0,
    replanned: false,
  };
}
