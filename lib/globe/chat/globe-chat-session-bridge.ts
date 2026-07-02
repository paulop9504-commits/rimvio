import {
  appendGlobeChatImageMessage,
  appendGlobeChatTextMessage,
  patchGlobeChatImageMessage,
} from "@/lib/globe/chat/globe-chat-session-store";
import { patchComposeDraftFieldOnFeed } from "@/lib/context-run/sync-compose-draft-to-feed";
import { generateComposeNudgeMessage } from "@/lib/portal/compose-draft/generate-compose-nudge";
import {
  buildSaleDescriptionDraftSourceKey,
  generateSaleDescriptionDraftKo,
} from "@/lib/portal/compose-draft/generate-sale-description-draft";
import { mergeComposeDraft } from "@/lib/portal/compose-draft/draft-utils";
import {
  readSellItemDescriptionStage,
  readSellItemFlowOptionsFromComposeState,
} from "@/lib/portal/compose-draft/sell-item-flow";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import type { ComposeSchemaId } from "@/lib/portal/compose-draft/types";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

export function appendGlobeChatUserText(graphId: string, text: string): void {
  appendGlobeChatTextMessage({ graphId, role: "user", text });
}

export function appendGlobeChatAssistantText(graphId: string, text: string): void {
  appendGlobeChatTextMessage({ graphId, role: "assistant", text });
}

function readDescriptionSourceKey(state: PortalComposeRunState | null | undefined): string {
  return buildSaleDescriptionDraftSourceKey({
    draft: state?.composeDraft ?? {},
    productCategoryId: state?.productCategoryId ?? state?.proposedCategoryId ?? null,
    slotExtras: state?.slotExtras ?? null,
  });
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
      const latestState = readPortalComposeRunState(input.graphId) ?? state;
      const nextStage = readSellItemDescriptionStage({
        draft: nextDraft,
        flowOptions: readSellItemFlowOptionsFromComposeState(latestState),
        descriptionDraftKo: latestState.descriptionDraftKo,
      });
      let descriptionDraftKo = latestState.descriptionDraftKo ?? null;
      let descriptionStatus = nextStage.descriptionStatus;
      const nextStateBase: PortalComposeRunState = {
        ...latestState,
        composeDraft: nextDraft,
        macroStage: nextStage.macroStage,
        descriptionStatus,
        updatedAt: new Date().toISOString(),
      };

      if (
        schemaId === "sell_item" &&
        nextStage.macroStage === "description_ready" &&
        !descriptionDraftKo &&
        readDescriptionSourceKey(nextStateBase) !== readDescriptionSourceKey(state)
      ) {
        descriptionDraftKo = await generateSaleDescriptionDraftKo({
          draft: nextDraft,
          productCategoryId: latestState.productCategoryId ?? latestState.proposedCategoryId ?? null,
          slotExtras: latestState.slotExtras ?? null,
        });
        descriptionStatus = descriptionDraftKo ? "generated" : "ready";
      }

      writePortalComposeRunState({
        ...nextStateBase,
        descriptionStatus,
        descriptionDraftKo,
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
    draft: (readPortalComposeRunState(input.graphId) ?? state).composeDraft ?? draft,
    historyKo: state.accumulatedText,
    descriptionDraftKo: readPortalComposeRunState(input.graphId)?.descriptionDraftKo ?? null,
  });
  appendGlobeChatAssistantText(input.graphId, nudge);
}
