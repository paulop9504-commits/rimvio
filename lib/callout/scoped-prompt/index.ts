/**
 * Object Scoped Prompt — ask the object, keep Object Scope.
 */

export type {
  ObjectScopedIntent,
  ObjectScopedIntentKind,
  ObjectScopedPromptReject,
  ObjectScopedPromptRequest,
  ObjectScopedPromptResult,
  ObjectScopedPromptStage,
} from "@/lib/callout/scoped-prompt/types";
export { OBJECT_SCOPED_PROMPT_STAGES } from "@/lib/callout/scoped-prompt/types";

export {
  looksLikeGeneralChatEscape,
  parseObjectScopedIntent,
} from "@/lib/callout/scoped-prompt/parse-object-scoped-intent";

export {
  runObjectScopedPrompt,
  type ObjectScopedPromptHostInput,
} from "@/lib/callout/scoped-prompt/run-object-scoped-prompt";
