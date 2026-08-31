/**
 * Rimvio Platform Execution Loop — SSOT (not Cursor copy).
 *
 * Goal → Understand → Inspect → Plan → Act → Observe → Verify → Replan → Commit
 *
 * LLM decides; Orchestrator owns the loop (deterministic).
 */

/** Rimvio Platform Agent loop — World/Platform Agent, not Code Agent. */
export const RIMVIO_PLATFORM_EXECUTION_LOOP = [
  "goal_intake",
  "understand",
  "inspect",
  "plan",
  "act",
  "observe",
  "verify",
  "replan",
  "commit",
] as const;

export type RimvioPlatformExecutionPhase =
  (typeof RIMVIO_PLATFORM_EXECUTION_LOOP)[number];

export const RIMVIO_PLATFORM_EXECUTION_LABEL_KO: Record<
  RimvioPlatformExecutionPhase,
  string
> = {
  goal_intake: "Goal Intake",
  understand: "Understand",
  inspect: "Inspect",
  plan: "Plan",
  act: "Act",
  observe: "Observe",
  verify: "Verify",
  replan: "Replan",
  commit: "Commit",
};

/** Capability taxonomy — Agent executable units (A–I). */
export const RIMVIO_CAPABILITY_TAXONOMY = {
  understanding: [
    "intent.parse",
    "goal.create",
    "constraint.extract",
    "preference.extract",
    "entity.resolve",
    "context.resolve",
  ],
  observation: [
    "workspace.read",
    "state.read",
    "graph.query",
    "entity.inspect",
    "event.read",
    "external.observe",
  ],
  planning: [
    "goal.decompose",
    "plan.create",
    "plan.sequence",
    "dependency.resolve",
    "risk.evaluate",
    "plan.replan",
  ],
  capability_management: [
    "capability.search",
    "capability.rank",
    "capability.validate",
    "capability.compose",
    "capability.version.resolve",
    "capability.compatibility.check",
  ],
  execution: [
    "capability.execute",
    "tool.invoke",
    "workflow.run",
    "workspace.patch",
    "external.action",
  ],
  verification: [
    "goal.verify",
    "constraint.verify",
    "state.verify",
    "quality.verify",
    "integration.verify",
    "availability.verify",
  ],
  recovery: [
    "error.classify",
    "retry",
    "rollback",
    "alternative.search",
    "impact.analyze",
    "partial.replan",
  ],
  memory: [
    "observation.store",
    "decision.store",
    "execution.history",
    "user.preference.update",
    "capability.performance.update",
  ],
  governance: [
    "permission.check",
    "policy.check",
    "approval.request",
    "audit.log",
    "cost.check",
    "risk.check",
  ],
} as const;

/** Map legacy Hub loop phase → Platform execution phase. */
export function mapHubLoopPhaseToExecutionPhase(
  hubPhase: string,
): RimvioPlatformExecutionPhase {
  switch (hubPhase) {
    case "observe":
      return "inspect";
    case "plan":
      return "plan";
    case "execute":
      return "act";
    case "verify":
      return "verify";
    case "replan":
      return "replan";
    case "complete":
      return "commit";
    case "ask_user":
      return "commit";
    default:
      return "observe";
  }
}

/** Map workstream runtime loop step → Platform execution phase. */
export function mapRuntimeLoopToExecutionPhase(
  step: string,
): RimvioPlatformExecutionPhase {
  switch (step) {
    case "observe":
      return "inspect";
    case "supervise":
    case "judge":
      return "understand";
    case "plan":
    case "coordinate":
      return "plan";
    case "execute":
      return "act";
    case "verify":
      return "verify";
    case "repair":
      return "replan";
    case "commit":
      return "commit";
    case "reflect":
      return "observe";
    default:
      return "understand";
  }
}

/** Standard capability execution result contract. */
export type CapabilityExecutionResult = {
  readonly success: boolean;
  readonly output?: unknown;
  readonly events?: readonly string[];
  readonly stateChanges?: readonly string[];
  readonly errors?: readonly string[];
  readonly sideEffects?: readonly string[];
  readonly usage?: { readonly tokens?: number; readonly costKrw?: number };
};
