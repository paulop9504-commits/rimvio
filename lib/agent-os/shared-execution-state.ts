/**
 * Shared execution state — read facade for Main / Hub / Worker (P0).
 *
 * Unifies reads from existing stores; does not introduce a parallel SSOT writer.
 */

import type { RimvioAgentRole } from "@/lib/agent-os/agent-role";
import { inferRimvioAgentRole } from "@/lib/agent-os/agent-role";
import {
  buildMainAgentContext,
  type MainAgentContext,
} from "@/lib/agent-os/main-agent-context";
import {
  buildHubAgentContext,
  type HubAgentContext,
} from "@/lib/agent-os/hub-agent-context";
import type { AgentExecutionContext } from "@/lib/agent-orchestrator/execution-context";
import type { CapabilityDevelopmentRequest } from "@/lib/agent-os/capability-development-request";
import { readCapabilityDevelopmentRequests } from "@/lib/agent-os/capability-development-request";
import type { ImprovementTask } from "@/lib/rimvio-index/types";
import { readImprovementTasks } from "@/lib/rimvio-index/improvement-task-pool";

export type SharedExecutionState = {
  readonly role: RimvioAgentRole;
  readonly contextEventId: string;
  readonly main: MainAgentContext | null;
  readonly hub: HubAgentContext | null;
  readonly openDevelopmentRequests: readonly CapabilityDevelopmentRequest[];
  readonly openImprovementTasks: readonly ImprovementTask[];
};

export function readSharedExecutionState(input: {
  readonly contextEventId: string;
  readonly utterance?: string;
  readonly agentId?: string | null;
  readonly executionContext?: AgentExecutionContext | null;
}): SharedExecutionState {
  const contextEventId = input.contextEventId.trim();
  const role = inferRimvioAgentRole({
    contextEventId,
    agentId: input.agentId,
  });

  const main =
    role === "main" || role === "worker"
      ? buildMainAgentContext({
          contextEventId,
          utterance: input.utterance,
          executionContext: input.executionContext,
        })
      : null;

  const hub =
    role === "hub"
      ? buildHubAgentContext({
          platformId: contextEventId.replace(/^hub:workspace:/, "") || "dev",
        })
      : null;

  const openDevelopmentRequests = readCapabilityDevelopmentRequests().filter(
    (r) => r.status === "open" && r.contextEventId === contextEventId,
  );
  const openImprovementTasks = readImprovementTasks().filter(
    (t) =>
      (t.status === "open" || t.status === "assigned") &&
      t.contextEventId === contextEventId,
  );

  return {
    role,
    contextEventId,
    main,
    hub,
    openDevelopmentRequests,
    openImprovementTasks,
  };
}
