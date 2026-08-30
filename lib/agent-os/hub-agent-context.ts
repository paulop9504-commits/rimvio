/**
 * Hub Agent context — Domain/Capability evolution facade (P0 boundary only).
 *
 * Does not run Hub loop — prepares contract for Main → Hub handoff.
 */

import type { HubAgentRuntimeContext } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import { hubContextEventId } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import type { PlatformGoalState } from "@/lib/hub/dev/platform-agent/goal-state";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import { readCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import type { ImprovementTask } from "@/lib/rimvio-index/types";
import { readImprovementTasks } from "@/lib/rimvio-index/improvement-task-pool";
import type { CapabilityDevelopmentRequest } from "@/lib/agent-os/capability-development-request";
import { readCapabilityDevelopmentRequests } from "@/lib/agent-os/capability-development-request";
import type { RimvioAgentRole } from "@/lib/agent-os/agent-role";

export type HubAgentContext = {
  readonly role: RimvioAgentRole;
  readonly hubId: string;
  readonly domain: string | null;
  readonly workspaceId: string;
  readonly capabilities: readonly CapabilityIndexEntry[];
  readonly capabilityVersions: readonly { readonly capabilityId: string; readonly version: string }[];
  readonly developmentTasks: readonly ImprovementTask[];
  readonly developmentRequests: readonly CapabilityDevelopmentRequest[];
  readonly observations: readonly string[];
  readonly metrics: {
    readonly capabilityCount: number;
    readonly openImprovementTasks: number;
    readonly openDevelopmentRequests: number;
  };
  readonly goalState: PlatformGoalState | null;
  readonly runtime: HubAgentRuntimeContext | null;
};

export function buildHubAgentContext(input: {
  readonly platformId: string;
  readonly runtime?: HubAgentRuntimeContext | null;
}): HubAgentContext {
  const platformId = input.platformId.trim() || "dev";
  const workspaceId = hubContextEventId(platformId);
  const index = readCapabilityIndex();
  const platformCaps = index.filter((c) => c.platformId === platformId);
  const tasks = readImprovementTasks().filter((t) => t.platformId === platformId);
  const requests = readCapabilityDevelopmentRequests().filter(
    (r) => r.workspaceId === workspaceId || r.workspaceId === null,
  );

  const goalState: PlatformGoalState | null = null;

  const capabilityVersions = platformCaps.map((c) => ({
    capabilityId: c.capabilityId,
    version: String(c.inputSchemaVersion ?? 1),
  }));

  const domain = platformCaps[0]?.category ?? null;

  return {
    role: "hub",
    hubId: platformId,
    domain,
    workspaceId,
    capabilities: platformCaps,
    capabilityVersions,
    developmentTasks: tasks,
    developmentRequests: requests,
    observations: [],
    metrics: {
      capabilityCount: platformCaps.length,
      openImprovementTasks: tasks.filter((t) => t.status === "open").length,
      openDevelopmentRequests: requests.filter((r) => r.status === "open")
        .length,
    },
    goalState,
    runtime: input.runtime ?? null,
  };
}
