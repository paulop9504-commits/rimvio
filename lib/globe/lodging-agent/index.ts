/**
 * Layer 3 — Travel Domain Executor (lodging guide)
 * Reads Host + Context RAG · tool calling · Ghost Pins.
 * Not L1 Globe AI · not L4 Context Condition AI.
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md
 */

export {
  buildLodgingAgentContainer,
  buildLodgingAgentRagContext,
  buildLodgingAgentSystemPrompt,
} from "@/lib/globe/lodging-agent/build-lodging-agent-rag-context";
export { patchLodgingAgentGhostsToProjection } from "@/lib/globe/lodging-agent/patch-lodging-agent-ghost-pins";
export {
  classifyLodgingAgentTool,
  executeLodgingAgentTool,
  type LodgingAgentToolResult,
} from "@/lib/globe/lodging-agent/lodging-agent-tool-registry";
export {
  mergeLodgingAgentGlobeMarkers,
  projectLodgingAgentGlobeMarkers,
} from "@/lib/globe/lodging-agent/project-lodging-agent-globe-markers";
export {
  buildLodgingAgentTurnIngress,
  runLodgingAgentTurn,
  type LodgingAgentTurnIngress,
  type RunLodgingAgentTurnInput,
} from "@/lib/globe/lodging-agent/run-lodging-agent-turn";
export {
  clearLodgingAgentSession,
  readLodgingAgentSession,
  writeLodgingAgentSession,
  type LodgingAgentSessionWire,
} from "@/lib/globe/lodging-agent/lodging-agent-session-store";
export type {
  LodgingAgentContainer,
  LodgingAgentMapPinType,
  LodgingAgentMapPinWire,
  LodgingAgentRagContext,
  LodgingAgentToolCall,
  LodgingAgentToolName,
  LodgingAgentTurnResult,
  LodgingContextData,
  LodgingHostData,
} from "@/lib/globe/lodging-agent/types";
