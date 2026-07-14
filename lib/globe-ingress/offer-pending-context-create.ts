/**
 * Offer Draft Context create preview in Globe chat (no SSOT write).
 */

import {
  appendGlobeChatSlotPromptMessage,
  appendGlobeChatTextMessage,
} from "@/lib/globe/chat/globe-chat-session-store";
import { buildPendingContextCreatePreviewText } from "@/lib/globe-ingress/format-pending-context-create-preview";
import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";
import { writePendingContextCreate } from "@/lib/globe-ingress/pending-context-create-store";
import { copy } from "@/lib/copy/human-ko";

export const CONTEXT_CREATE_SLOT_ID = "context_create";
export const CONTEXT_CREATE_CHOICE_CREATE = "create";
export const CONTEXT_CREATE_CHOICE_CANCEL = "cancel";

export function offerPendingContextCreate(input: {
  draft: PendingContextCreateDraft;
  /** When true, skip re-appending the user utterance (dispatch already did). */
  skipUserEcho?: boolean;
}): void {
  writePendingContextCreate(input.draft);
  const graphId = input.draft.graphId;
  const preview = buildPendingContextCreatePreviewText(input.draft);
  if (!input.skipUserEcho && input.draft.utterance.trim()) {
    appendGlobeChatTextMessage({
      graphId,
      role: "user",
      text: input.draft.utterance,
    });
  }
  appendGlobeChatTextMessage({
    graphId,
    role: "assistant",
    text: preview,
  });
  appendGlobeChatSlotPromptMessage({
    graphId,
    text: copy.globe.contextAnchor.chipPrompt,
    clarifyKind: "context_create",
    slotId: CONTEXT_CREATE_SLOT_ID,
    choices: [
      {
        id: CONTEXT_CREATE_CHOICE_CREATE,
        labelKo: copy.globe.contextAnchor.createCta,
      },
      {
        id: CONTEXT_CREATE_CHOICE_CANCEL,
        labelKo: copy.globe.contextAnchor.cancelCta,
      },
    ],
  });
}
