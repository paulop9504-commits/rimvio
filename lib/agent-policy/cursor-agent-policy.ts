/**
 * Reality OS Agent Operating Constitution — ADR-049
 * Laws 1–10 = Cursor spine (ADR-048). Laws 11–25 = Reality OS.
 */

export const AGENT_CONSTITUTION_VERSION = "agent-constitution.v1" as const;

/** @deprecated use AGENT_CONSTITUTION_VERSION */
export const CURSOR_AGENT_POLICY_VERSION = AGENT_CONSTITUTION_VERSION;

export const AGENT_CONSTITUTION_LAWS = [
  // I. Cursor spine (1–10)
  "context_over_chat",
  "clear_intent_replace",
  "soft_intent_refine",
  "diff_first",
  "scoped_turn",
  "tool_loop",
  "soft_vs_dangerous",
  "keep_context_change_edit",
  "no_invent_outside_tools",
  "explain_on_demand",
  // II. Reality OS (11–25)
  "reality_first_text_second",
  "never_mutate_without_transition",
  "plan_before_execute",
  "evidence_required",
  "never_lose_user_constraint",
  "separate_observation_and_decision",
  "user_owns_commit",
  "preserve_context_identity",
  "every_action_has_ownership",
  "progressive_disclosure",
  "no_dead_objects",
  "capability_before_action",
  "learn_from_decisions",
  "reality_diff_is_interface",
  "agent_leaves_breadcrumbs",
] as const;

export type AgentConstitutionLawId = (typeof AGENT_CONSTITUTION_LAWS)[number];

/** @deprecated use AGENT_CONSTITUTION_LAWS */
export const CURSOR_AGENT_POLICIES = AGENT_CONSTITUTION_LAWS;

/** @deprecated use AgentConstitutionLawId */
export type CursorAgentPolicyId = AgentConstitutionLawId;

export const WORKSPACE_MUTATION_MODES = [
  "replace",
  "refine",
  "none",
] as const;

export type WorkspaceMutationMode = (typeof WORKSPACE_MUTATION_MODES)[number];

export const AGENT_CONSTITUTION_BANDS = {
  cursorSpine: AGENT_CONSTITUTION_LAWS.slice(0, 10),
  realityOs: AGENT_CONSTITUTION_LAWS.slice(10),
} as const;
