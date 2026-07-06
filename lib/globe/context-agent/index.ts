export {
  armGlobeContextAgent,
  bindGlobeContextAgent,
  cancelGlobeContextAgentArm,
  clearGlobeContextAgent,
  isGlobeContextAgentArming,
  isGlobeContextAgentBound,
  readGlobeContextAgentSession,
  subscribeGlobeContextAgent,
  type GlobeContextAgentDetail,
  type GlobeContextAgentPhase,
} from "@/lib/globe/context-agent/globe-context-agent-bridge";
export {
  beginContextAgentWork,
  finishContextAgentWork,
  isContextAgentBusy,
  readContextAgentRuntimeState,
  resetContextAgentRuntime,
  setContextAgentProcessPhase,
  subscribeContextAgentRuntime,
  type ContextAgentLifecycle,
  type ContextAgentProcessPhase,
  type ContextAgentRuntimeState,
} from "@/lib/globe/context-agent/context-agent-runtime-state";
export { resolveContextAgentZeroPrompt } from "@/lib/globe/context-agent/resolve-context-agent-zero-prompt";
export type { ContextAgentZeroPromptOutcome } from "@/lib/globe/context-agent/resolve-context-agent-zero-prompt";
