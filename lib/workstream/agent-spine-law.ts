/**
 * Agent Spine law — single ingress for all Intent paths (ADR-043).
 * action-chat · context-run · workstream · engine converge here — no Agent D.
 */

export const AGENT_SPINE_STAGES = [
  "goal_state",
  "context_graph",
  "execution_state",
  "verification",
  "repair",
  "reality_queue",
  "commit",
] as const;

export type AgentSpineStage = (typeof AGENT_SPINE_STAGES)[number];

/** Legacy generations that must ingress through Spine — not parallel agents. */
export const SPINE_LEGACY_INGRESS = [
  "action-chat",
  "context-run",
  "workstream",
  "engine",
] as const;

export type SpineLegacyIngress = (typeof SPINE_LEGACY_INGRESS)[number];

export const AGENT_SPINE_SLOGAN =
  "Every Intent → enterRimvioAgentRuntime() → Observe→Judge→Plan→Execute→Verify→Repair→Commit. One Runtime. Capabilities via Registry." as const;

export type SpineIngressRecord = {
  readonly source: SpineLegacyIngress;
  readonly contextEventId: string;
  readonly utterance: string | null;
  readonly atIso: string;
  readonly stage: AgentSpineStage;
};

const EVENT = "rimvio:agent-spine-ingress";

let lastIngress: SpineIngressRecord | null = null;

/**
 * Declare that a legacy path entered the unified Spine.
 * Call at the top of compose / NL / engine turns.
 */
export function enterAgentSpine(input: {
  readonly source: SpineLegacyIngress;
  readonly contextEventId: string;
  readonly utterance?: string | null;
  readonly stage?: AgentSpineStage;
}): SpineIngressRecord {
  const record: SpineIngressRecord = {
    source: input.source,
    contextEventId: input.contextEventId.trim(),
    utterance: input.utterance?.trim() || null,
    atIso: new Date().toISOString(),
    stage: input.stage ?? "goal_state",
  };
  lastIngress = record;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: record }));
  }
  return record;
}

export function readLastAgentSpineIngress(): SpineIngressRecord | null {
  return lastIngress;
}

export function nextSpineStage(
  current: AgentSpineStage,
): AgentSpineStage | null {
  const i = AGENT_SPINE_STAGES.indexOf(current);
  if (i < 0 || i >= AGENT_SPINE_STAGES.length - 1) return null;
  return AGENT_SPINE_STAGES[i + 1]!;
}

/** Verification is mandatory before Commit when feasibility can be checked. */
export function spineRequiresVerificationBeforeCommit(): boolean {
  return true;
}
