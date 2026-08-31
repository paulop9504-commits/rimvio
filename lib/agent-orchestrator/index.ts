export type {
  AgentCapability,
  AgentRegistration,
  AgentMessage,
  AgentTaskInput,
  AgentTaskResult,
  OrchestrationResult,
} from "@/lib/agent-orchestrator/types";
export { registerAgent, getAgent, findAgentsByCapability, listAgents } from "@/lib/agent-orchestrator/agent-registry";
export { buildAgentTasks, dispatchAgentTasks } from "@/lib/agent-orchestrator/dispatch-agents";
export { mergeAgentResults } from "@/lib/agent-orchestrator/merge-agent-results";
export { sendAgentMessage, subscribeAgentMessages, getMessageLog, clearMessageLog } from "@/lib/agent-orchestrator/agent-message-bus";
export {
  createAgentExecutionContext,
  buildWorkspaceSnapshot,
  ORCHESTRATOR_LOOP_BUDGET,
  type AgentExecutionContext,
  type AgentExecutionResult,
  type AgentGoal,
  type WorkspaceSnapshot,
} from "@/lib/agent-orchestrator/execution-context";
export {
  executeDomainAgentTask,
  toAgentTaskResult,
} from "@/lib/agent-orchestrator/domain-agent-executor";
export { runObserveDecideLoop } from "@/lib/agent-orchestrator/observe-decide-loop";
export {
  classifyAgentFailure,
  policyForFailure,
  type AgentFailureClass,
} from "@/lib/agent-orchestrator/failure-classification";
export {
  evaluateGoalConvergence,
  type GoalConvergenceResult,
  type GoalConvergenceStatus,
} from "@/lib/agent-orchestrator/goal-convergence";
export { semanticReplanFromFailure } from "@/lib/agent-orchestrator/semantic-replan";
export {
  traceEvent,
  summarizeTrace,
  type AgentTrace,
  type AgentTraceEvent,
} from "@/lib/agent-orchestrator/agent-trace";
export { createAgentDispatchStepExecutor } from "@/lib/agent-orchestrator/pipeline-step-executor";
