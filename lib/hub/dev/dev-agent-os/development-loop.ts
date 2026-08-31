/**
 * Dev Agent development loop — maps to Platform Execution Loop.
 */

import type { RimvioPlatformExecutionPhase } from "@/lib/hub/dev/platform-agent/execution-loop";
import type { DevDevelopmentPhase } from "@/lib/hub/dev/dev-agent-os/types";

/** Map Dev OS phase → Platform execution phase (ADR-058 spine). */
export function mapDevPhaseToPlatformPhase(
  phase: DevDevelopmentPhase,
): RimvioPlatformExecutionPhase {
  switch (phase) {
    case "understand":
      return "understand";
    case "inspect":
      return "inspect";
    case "plan":
    case "design":
      return "plan";
    case "build":
    case "connect":
      return "act";
    case "test":
      return "observe";
    case "verify":
      return "verify";
    case "fix":
      return "replan";
    case "deploy":
    case "monitor":
      return "commit";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

/** Phases that must not be skipped for meaningful product work. */
export const DEV_LOOP_REQUIRED_FOR_PRODUCT_WORK: readonly DevDevelopmentPhase[] = [
  "understand",
  "inspect",
  "build",
  "connect",
  "test",
  "verify",
];

/** Phases required when deploy was requested. */
export const DEV_LOOP_REQUIRED_FOR_DEPLOY: readonly DevDevelopmentPhase[] = [
  ...DEV_LOOP_REQUIRED_FOR_PRODUCT_WORK,
  "deploy",
  "monitor",
];
