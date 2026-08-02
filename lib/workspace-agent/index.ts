/**
 * Rimvio Workspace Reality Agent
 *
 * Active Workspace Operator — Draft proposals only, never Globe-wide / Reality Commit.
 */

export type {
  WorkspaceAgentContext,
  WorkspaceAgentPhase,
  WorkspaceAgentPlan,
  WorkspaceAgentPlanStep,
  WorkspaceAgentResult,
  WorkspaceAgentValidation,
} from "@/lib/workspace-agent/types";

export {
  assertAgentWorkspaceScope,
  readWorkspaceAgentContext,
} from "@/lib/workspace-agent/context-reader";

export {
  buildWorkspaceAgentPlan,
  isWorkspaceAgentCommitForbidden,
  looksLikeScheduleFatigue,
  understandWorkspaceAgentIntent,
} from "@/lib/workspace-agent/planner";

export {
  generateWorkspaceAgentAction,
  type GeneratedAgentAction,
} from "@/lib/workspace-agent/action-generator";

export {
  assertNoRealityCommitFromAgent,
  validateWorkspaceAgentImpact,
} from "@/lib/workspace-agent/validator";

export { runWorkspaceRealityAgent } from "@/lib/workspace-agent/agent";
