/**
 * Rimvio Agent OS — role boundary (P0).
 *
 * Main = Goal Executor · Hub = Capability/Workspace evolution · Worker = scoped task.
 * Extends ADR-045 runtime stages — does not replace RimvioAgentRuntimeStage.
 */

export const RIMVIO_AGENT_ROLES = ["main", "hub", "worker"] as const;

export type RimvioAgentRole = (typeof RIMVIO_AGENT_ROLES)[number];

export function inferRimvioAgentRole(input: {
  readonly contextEventId: string;
  readonly agentId?: string | null;
}): RimvioAgentRole {
  const id = input.contextEventId.trim();
  if (id.startsWith("hub:")) return "hub";
  if (input.agentId && input.agentId !== "main" && input.agentId !== "rimvio-main") {
    return "worker";
  }
  return "main";
}

export function isMainAgentRole(role: RimvioAgentRole): role is "main" {
  return role === "main";
}

export function isHubAgentRole(role: RimvioAgentRole): role is "hub" {
  return role === "hub";
}

export function isWorkerAgentRole(role: RimvioAgentRole): role is "worker" {
  return role === "worker";
}
