/** @deprecated — prefer @/lib/agent/conversation */
export {
  runConversationGate as runIntentGate,
  runConversationGate,
  classifyIntent,
  isExecutableIntent,
  resolveGoal,
} from "@/lib/agent/conversation";
export type {
  UserIntent as AgentIntent,
  UserIntent,
  ConversationContext as IntentConversationContext,
  ConversationContext,
  ConversationGateResult as IntentGateResult,
  ConversationGateResult,
  ClassifiedIntent,
  GoalResolution,
} from "@/lib/agent/conversation";
export { CONVERSATIONAL_INTENTS, EXECUTABLE_INTENTS } from "@/lib/agent/conversation";
