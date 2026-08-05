/**
 * Law 19 — Every Agent Action Has Ownership.
 */

export const AGENT_ACTION_ACTORS = ["ai", "user", "system"] as const;
export type AgentActionActor = (typeof AGENT_ACTION_ACTORS)[number];

export const AGENT_ACTION_APPROVALS = [
  "none",
  "soft",
  "pending",
  "user_commit",
] as const;
export type AgentActionApproval = (typeof AGENT_ACTION_APPROVALS)[number];

export type AgentActionOwnership = {
  readonly actor: AgentActionActor;
  readonly approval: AgentActionApproval;
  readonly atIso: string;
  readonly actionKo: string;
  readonly beforeKo: string | null;
  readonly afterKo: string | null;
};

export function buildAgentActionOwnership(input: {
  readonly actor?: AgentActionActor;
  readonly approval?: AgentActionApproval;
  readonly actionKo: string;
  readonly beforeKo?: string | null;
  readonly afterKo?: string | null;
  readonly atIso?: string;
}): AgentActionOwnership {
  return {
    actor: input.actor ?? "ai",
    approval: input.approval ?? "none",
    atIso: input.atIso ?? new Date().toISOString(),
    actionKo: input.actionKo.trim(),
    beforeKo: input.beforeKo?.trim() || null,
    afterKo: input.afterKo?.trim() || null,
  };
}

export function ownershipSummaryKo(o: AgentActionOwnership): string {
  const who =
    o.actor === "ai" ? "AI" : o.actor === "user" ? "사용자" : "시스템";
  const bits = [`${who} · ${o.actionKo}`];
  if (o.beforeKo && o.afterKo) {
    bits.push(`${o.beforeKo} → ${o.afterKo}`);
  }
  return bits.join(" · ");
}
