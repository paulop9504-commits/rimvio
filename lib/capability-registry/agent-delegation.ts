/**
 * Agent delegation — extends the existing capability registry with
 * agent-level can/cannot declarations and auto-delegation.
 *
 * Uses the existing CapabilityId type from capability-contract.
 */

import type { CapabilityId } from "@/lib/capability-registry/capability-contract";

export type AgentDelegationSpec = {
  readonly agentId: string;
  readonly domain: string;
  readonly can: readonly CapabilityId[];
  readonly cannot: readonly CapabilityId[];
  readonly maxConcurrent: number;
};

export type DelegationDecision = {
  readonly capabilityId: CapabilityId;
  readonly delegatedTo: string;
  readonly reason: string;
  readonly alternatives: readonly string[];
};

const specs: Map<string, AgentDelegationSpec> = new Map();

export function registerAgentDelegation(spec: AgentDelegationSpec): void {
  specs.set(spec.agentId, spec);
}

export function canAgentDo(agentId: string, capabilityId: CapabilityId): boolean {
  const spec = specs.get(agentId);
  if (!spec) return false;
  if (spec.cannot.includes(capabilityId)) return false;
  return spec.can.includes(capabilityId);
}

export function findAgentsForCapability(capabilityId: CapabilityId): readonly AgentDelegationSpec[] {
  return [...specs.values()].filter(
    (s) => s.can.includes(capabilityId) && !s.cannot.includes(capabilityId),
  );
}

export function resolveDelegate(
  capabilityId: CapabilityId,
  preferredAgentId?: string,
): DelegationDecision | null {
  const candidates = findAgentsForCapability(capabilityId);
  if (candidates.length === 0) return null;

  const preferred = preferredAgentId
    ? candidates.find((c) => c.agentId === preferredAgentId)
    : null;

  const chosen = preferred ?? candidates[0]!;
  const alternatives = candidates
    .filter((c) => c.agentId !== chosen.agentId)
    .map((c) => c.agentId);

  return {
    capabilityId,
    delegatedTo: chosen.agentId,
    reason: preferred
      ? `${chosen.agentId}가 ${capabilityId}를 지원합니다`
      : `${chosen.agentId}에게 자동 위임`,
    alternatives,
  };
}
