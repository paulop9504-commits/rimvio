/**
 * Domain agent registry — register and discover agents by capability.
 */

import type { AgentCapability, AgentRegistration } from "@/lib/agent-orchestrator/types";

const agents: Map<string, AgentRegistration> = new Map();

export function registerAgent(reg: AgentRegistration): void {
  agents.set(reg.agentId, reg);
}

export function getAgent(agentId: string): AgentRegistration | null {
  return agents.get(agentId) ?? null;
}

export function findAgentsByCapability(cap: AgentCapability): readonly AgentRegistration[] {
  return [...agents.values()]
    .filter((a) => a.capabilities.includes(cap))
    .sort((a, b) => b.priority - a.priority);
}

export function listAgents(): readonly AgentRegistration[] {
  return [...agents.values()];
}

registerAgent({ agentId: "lodging", domain: "travel", capabilities: ["search", "compare", "reserve"], priority: 10 });
registerAgent({ agentId: "eatery", domain: "travel", capabilities: ["search", "compare"], priority: 8 });
registerAgent({ agentId: "flight", domain: "travel", capabilities: ["search", "reserve"], priority: 10 });
registerAgent({ agentId: "weather", domain: "travel", capabilities: ["general"], priority: 5 });
registerAgent({ agentId: "route", domain: "travel", capabilities: ["navigate"], priority: 7 });
registerAgent({ agentId: "booking", domain: "transaction", capabilities: ["reserve", "payment"], priority: 10 });
