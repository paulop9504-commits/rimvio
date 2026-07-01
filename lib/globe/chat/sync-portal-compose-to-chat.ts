import {
  appendGlobeChatSlotPromptMessage,
  appendGlobeChatTextMessage,
} from "@/lib/globe/chat/globe-chat-session-store";
import type { ComposeClarifyKind } from "@/lib/portal/compose-draft/product-category-types";

/** Sync portal compose turns into the fullscreen chat thread. */
export function syncPortalComposeTurnToChat(input: {
  graphId: string;
  userText: string;
  assistantText: string;
}): void {
  if (input.userText.trim()) {
    appendGlobeChatTextMessage({ graphId: input.graphId, role: "user", text: input.userText });
  }
  if (input.assistantText.trim()) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: input.assistantText,
    });
  }
}

/** Clarify turn with chip / category picker UI. */
export function syncPortalComposeClarifyToChat(input: {
  graphId: string;
  userText: string;
  questionKo: string;
  clarifyKind: ComposeClarifyKind;
  slotId: string;
  choices?: readonly { id: string; labelKo: string }[];
  categoryOptions?: readonly { id: string; labelKo: string }[];
}): void {
  if (input.userText.trim()) {
    appendGlobeChatTextMessage({ graphId: input.graphId, role: "user", text: input.userText });
  }
  if (input.questionKo.trim()) {
    appendGlobeChatSlotPromptMessage({
      graphId: input.graphId,
      text: input.questionKo,
      clarifyKind: input.clarifyKind,
      slotId: input.slotId,
      choices: input.choices,
      categoryOptions: input.categoryOptions,
    });
  }
}
