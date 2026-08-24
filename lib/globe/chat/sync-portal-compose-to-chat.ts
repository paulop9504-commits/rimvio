import {
  appendGlobeChatProgramInstallMessage,
  appendGlobeChatSlotPromptMessage,
  appendGlobeChatTextMessage,
  readGlobeChatSession,
} from "@/lib/globe/chat/globe-chat-session-store";
import type { ComposeClarifyKind } from "@/lib/portal/compose-draft/product-category-types";

/** Sync portal compose turns into the fullscreen chat thread. */
export function syncPortalComposeTurnToChat(input: {
  graphId: string;
  userText: string;
  assistantText: string;
}): void {
  const trimmedUser = input.userText.trim();
  if (trimmedUser) {
    const session = readGlobeChatSession(input.graphId);
    const last = session?.messages[session.messages.length - 1];
    const alreadyShown =
      last?.kind === "text" &&
      last.role === "user" &&
      last.text.trim() === trimmedUser;
    if (!alreadyShown) {
      appendGlobeChatTextMessage({ graphId: input.graphId, role: "user", text: trimmedUser });
    }
  }
  if (input.assistantText.trim()) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: input.assistantText,
    });
  }
}

/** Clarify turn with chip / category picker UI. Returns false if no choices (no empty pick). */
export function syncPortalComposeClarifyToChat(input: {
  graphId: string;
  userText: string;
  questionKo: string;
  clarifyKind: ComposeClarifyKind;
  slotId: string;
  choices?: readonly { id: string; labelKo: string }[];
  categoryOptions?: readonly { id: string; labelKo: string }[];
}): boolean {
  const hasChoices = Boolean(
    (input.choices && input.choices.length > 0) ||
      (input.categoryOptions && input.categoryOptions.length > 0),
  );
  if (!hasChoices) {
    return false;
  }
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
  return true;
}

export function syncPortalComposeProgramInstallToChat(input: {
  graphId: string;
  userText: string;
  assistantText: string;
  query: string;
}): void {
  const trimmedUser = input.userText.trim();
  if (trimmedUser) {
    const session = readGlobeChatSession(input.graphId);
    const last = session?.messages[session.messages.length - 1];
    const alreadyShown =
      last?.kind === "text" &&
      last.role === "user" &&
      last.text.trim() === trimmedUser;
    if (!alreadyShown) {
      appendGlobeChatTextMessage({ graphId: input.graphId, role: "user", text: trimmedUser });
    }
  }
  appendGlobeChatProgramInstallMessage({
    graphId: input.graphId,
    text: input.assistantText,
    query: input.query,
  });
}
