import {
  appendGlobeChatImageMessage,
  appendGlobeChatTextMessage,
  patchGlobeChatImageMessage,
} from "@/lib/globe/chat/globe-chat-session-store";
import { patchComposeDraftFieldOnFeed } from "@/lib/context-run/sync-compose-draft-to-feed";
import { generateComposeNudgeMessage } from "@/lib/portal/compose-draft/generate-compose-nudge";
import { mergeComposeDraft } from "@/lib/portal/compose-draft/draft-utils";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import type { ComposeSchemaId } from "@/lib/portal/compose-draft/types";

export function appendGlobeChatUserText(graphId: string, text: string): void {
  appendGlobeChatTextMessage({ graphId, role: "user", text });
}

export function appendGlobeChatAssistantText(graphId: string, text: string): void {
  appendGlobeChatTextMessage({ graphId, role: "assistant", text });
}

export async function ingestComposeChatPhoto(input: {
  graphId: string;
  file: File;
  upload?: (file: File) => Promise<string | null>;
}): Promise<void> {
  const localUrl = URL.createObjectURL(input.file);
  const imageMessage = appendGlobeChatImageMessage({
    graphId: input.graphId,
    localUrl,
    status: "uploading",
  });

  const state = readPortalComposeRunState(input.graphId);
  if (!state?.composeSchemaId) {
    patchGlobeChatImageMessage({
      graphId: input.graphId,
      messageId: imageMessage.id,
      status: "sent",
      remoteUrl: localUrl,
    });
    return;
  }

  const schemaId = state.composeSchemaId as ComposeSchemaId;
  const draft = mergeComposeDraft(state.composeDraft ?? {}, {
    photos: [...(state.composeDraft?.photos ?? []), localUrl],
  });

  writePortalComposeRunState({
    ...state,
    composeDraft: draft,
    updatedAt: new Date().toISOString(),
  });

  patchComposeDraftFieldOnFeed({ graphId: input.graphId, schemaId, draft });

  let remoteUrl: string | null = null;
  try {
    remoteUrl = (await input.upload?.(input.file)) ?? localUrl;
    patchGlobeChatImageMessage({
      graphId: input.graphId,
      messageId: imageMessage.id,
      status: "sent",
      remoteUrl,
    });
    if (remoteUrl !== localUrl) {
      const urls = (draft.photos ?? []).map((url) => (url === localUrl ? remoteUrl! : url));
      const nextDraft = { ...draft, photos: urls };
      writePortalComposeRunState({
        ...state,
        composeDraft: nextDraft,
        updatedAt: new Date().toISOString(),
      });
      patchComposeDraftFieldOnFeed({ graphId: input.graphId, schemaId, draft: nextDraft });
    }
  } catch {
    patchGlobeChatImageMessage({
      graphId: input.graphId,
      messageId: imageMessage.id,
      status: "failed",
      remoteUrl: localUrl,
    });
    return;
  }

  const nudge = await generateComposeNudgeMessage({
    schemaId,
    draft,
    historyKo: state.accumulatedText,
  });
  appendGlobeChatAssistantText(input.graphId, nudge);
}
