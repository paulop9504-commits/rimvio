import type { EventKernelState } from "@/lib/event-kernel/types";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { OrchestrateHistoryTurn, OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import type { IntentRoute } from "@/lib/action-chat/intent-router";
import type { ContainerRouteResult } from "@/lib/container-store/orchestrate-container-route";
import type { GlobalBrainMiddlewareResult } from "@/lib/global-brain/run-global-brain-middleware";
import type { EventCandidateWire } from "@/lib/events/event-candidate";
import type { LocationMemoryWire } from "@/lib/location-memory/types";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";
import type { EnrichmentBundle } from "@/lib/action-chat/orchestrator/pipeline-types";
import { EMPTY_ENRICHMENT } from "@/lib/action-chat/orchestrator/pipeline-types";
import { OrchestratorTrace } from "@/lib/action-chat/orchestrator/orchestrator-trace";
import { postFinalizeOrchestratorResult } from "@/lib/action-chat/orchestrator/post-finalize";

import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";

export type OrchestratorPipelineInput = {
  message: string;
  composerContext?: string | null;
  history?: OrchestrateHistoryTurn[];
  linkTitle?: string | null;
  linkUrl?: string | null;
  linkCategory?: string | null;
  linkedLinks?: Array<{
    id: string;
    title: string;
    url: string | null;
    category: string | null;
  }>;
  masterContext?: MasterContextApiPayload | null;
  userDefinedActions?: UserDefinedAction[];
  sessionScopeId?: string;
  chatAxis?: ChatAxis;
  vitalityMemory?: import("@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay").VitalityMemoryWire | null;
};

export type ScopedPipelineInput = OrchestratorPipelineInput & {
  linkTitle?: string | null;
  linkUrl?: string | null;
  linkCategory?: string | null;
  history?: OrchestrateHistoryTurn[];
};

export type OrchestratorPipelineContext = {
  input: OrchestratorPipelineInput;
  message: string;
  route: IntentRoute;
  kernel: EventKernelState;
  scoped: ScopedPipelineInput;
  context: MasterOrchestratorContext;
  locationMemory: LocationMemoryWire | null;
  userDefinedActions: UserDefinedAction[];
  trace: OrchestratorTrace;
  enrichment: EnrichmentBundle;
  containerRoute: ContainerRouteResult;
  brain: GlobalBrainMiddlewareResult | null;
  autoSavedWire: OrchestratorResult["knowledgeSaved"];
  eventCandidate: EventCandidateWire | null;
  finalize: (result: OrchestratorResult) => Promise<OrchestratorResult>;
};

export function attachFinalize(ctx: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  route: IntentRoute;
  context: MasterOrchestratorContext;
  containerRoute: ContainerRouteResult;
  autoSavedWire: OrchestratorResult["knowledgeSaved"];
  brain: GlobalBrainMiddlewareResult | null;
  eventCandidate: EventCandidateWire | null;
  trace: OrchestratorTrace;
}) {
  return (result: OrchestratorResult) =>
    postFinalizeOrchestratorResult(result, {
      message: ctx.message,
      history: ctx.history,
      route: ctx.route,
      context: ctx.context,
      container: ctx.containerRoute.container,
      autoSavedWire: ctx.autoSavedWire,
      brain: ctx.brain,
      eventCandidate: ctx.eventCandidate,
      trace: ctx.trace,
    });
}

export function createPipelineShell(input: {
  input: OrchestratorPipelineInput;
  message: string;
  route: IntentRoute;
  kernel: EventKernelState;
  scoped: ScopedPipelineInput;
  context: MasterOrchestratorContext;
  locationMemory: LocationMemoryWire | null;
  userDefinedActions: UserDefinedAction[];
  trace: OrchestratorTrace;
  containerRoute: ContainerRouteResult;
  autoSavedWire: OrchestratorResult["knowledgeSaved"];
}): OrchestratorPipelineContext {
  const shell: OrchestratorPipelineContext = {
    ...input,
    brain: null,
    eventCandidate: null,
    enrichment: { ...EMPTY_ENRICHMENT },
    finalize: async (result) => result,
  };
  shell.finalize = attachFinalize({
    message: shell.message,
    history: shell.input.history,
    route: shell.route,
    context: shell.context,
    containerRoute: shell.containerRoute,
    autoSavedWire: shell.autoSavedWire,
    brain: shell.brain,
    eventCandidate: shell.eventCandidate,
    trace: shell.trace,
  });
  return shell;
}

export function refreshFinalize(ctx: OrchestratorPipelineContext) {
  ctx.finalize = attachFinalize({
    message: ctx.message,
    history: ctx.input.history,
    route: ctx.route,
    context: ctx.context,
    containerRoute: ctx.containerRoute,
    autoSavedWire: ctx.autoSavedWire,
    brain: ctx.brain,
    eventCandidate: ctx.eventCandidate,
    trace: ctx.trace,
  });
}
