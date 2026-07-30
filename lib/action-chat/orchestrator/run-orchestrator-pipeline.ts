import type { OrchestratorPipelineInput } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  buildOrchestratorPipelineBase,
  completeEarlyOrchestratorDecision,
  prepareStandardPipelineContext,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import { resolveOrchestratorEarlyDecision } from "@/lib/action-chat/orchestrator/resolve-orchestrator-decision";
import { runOrchestratorStandardPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-standard-pipeline";
import { spineIngressFromLegacy } from "@/lib/workstream/spine-ingress-helpers";

/**
 * Orchestrator entry — single decision tree:
 * 1) Pre-pipeline probes (`resolveOrchestratorEarlyDecision`)
 * 2) Standard path: tier/event → enrichment → resolve (`runOrchestratorStandardPipeline`)
 */
export async function runOrchestratorPipeline(
  input: OrchestratorPipelineInput,
): Promise<OrchestratorResult> {
  const master = input.masterContext as
    | { globeContextEventId?: string; activeEventId?: string }
    | null
    | undefined;
  const contextEventId =
    input.sessionScopeId?.trim() ||
    master?.globeContextEventId?.trim() ||
    master?.activeEventId?.trim() ||
    "orchestrator:session";
  spineIngressFromLegacy({
    source: "action-chat",
    contextEventId,
    utterance: input.message,
    stage: "goal_state",
  });

  const base = await buildOrchestratorPipelineBase(input);
  const early = await resolveOrchestratorEarlyDecision(base);
  if (early) {
    return completeEarlyOrchestratorDecision(base, early);
  }
  const ctx = await prepareStandardPipelineContext(base);
  return runOrchestratorStandardPipeline(base, ctx);
}
