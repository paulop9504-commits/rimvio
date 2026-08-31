/**
 * Hub Agent Loop runner — delegates to Plan Executor + Tool Gateway (ADR-045).
 * Re-exports controller as the canonical ingress.
 */

export {
  runHubAgentController,
  resumeHubAgentController,
  type HubAgentControllerEvent,
  type HubAgentControllerInput,
  type HubAgentControllerResult,
} from "@/lib/hub/dev/hub-agent-controller";

export {
  createInitialAgentState,
  AGENT_LOOP_LIMITS,
  shouldStopLoop,
  type AgentState,
  type AgentLoopStatus,
} from "@/lib/agent/loop/agent-state";

export { decideNextStep, type AgentDecision } from "@/lib/agent/loop/decision";
export { verifyTestResult, verifyDeployPrepare } from "@/lib/agent/loop/verification";
