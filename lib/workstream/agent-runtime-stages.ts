/**
 * Rimvio Agent Runtime stages — single runtime, named roles (ADR-045 / ADR-046).
 * Strategist → Coordinator (Capability 조율). Supervisor = Goal 감시.
 */

export const RIMVIO_AGENT_RUNTIME_STAGES = [
  "observer",
  "supervisor",
  "judge",
  "planner",
  "coordinator",
  "executor",
  "verifier",
  "repairer",
  "committer",
  "historian",
] as const;

export type RimvioAgentRuntimeStage =
  (typeof RIMVIO_AGENT_RUNTIME_STAGES)[number];

export const RIMVIO_AGENT_RUNTIME_STAGE_LABEL_KO: Record<
  RimvioAgentRuntimeStage,
  string
> = {
  observer: "Observer",
  supervisor: "Goal Supervisor",
  judge: "Judge",
  planner: "Planner",
  coordinator: "Coordinator",
  executor: "Executor",
  verifier: "Verifier",
  repairer: "Repairer",
  committer: "Committer",
  historian: "Historian",
};

/** Default execution loop — Verification is not optional. */
export const RIMVIO_AGENT_RUNTIME_LOOP = [
  "observe",
  "supervise",
  "judge",
  "plan",
  "coordinate",
  "execute",
  "verify",
  "repair",
  "commit",
  "reflect",
] as const;

export type RimvioAgentRuntimeLoopStep =
  (typeof RIMVIO_AGENT_RUNTIME_LOOP)[number];

export const RIMVIO_AGENT_RUNTIME_SLOGAN =
  "One Agent Runtime. Goal Supervisor · World State · Opportunities · Reflection. Capabilities via Coordinator." as const;
