import { copy } from "@/lib/copy/human-ko";
import type { GlobeChatMessage } from "@/lib/globe/chat/globe-chat-session-types";
import { sellItemDraftCanPublish } from "@/lib/portal/compose-draft/draft-utils";
import type {
  ComposeClarifyKind,
  ComposeSlotId,
  ProductCategoryId,
} from "@/lib/portal/compose-draft/product-category-types";
import { findNextSellItemFlowStep, readSellItemFlowOptionsFromComposeState } from "@/lib/portal/compose-draft/sell-item-flow";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

export type GlobeChatActionHintPill = {
  id: string;
  labelKo: string;
  /** When set, sent to composer instead of labelKo. */
  submitKo?: string;
};

export type GlobeChatActionHint = {
  bodyKo: string;
  pills: readonly GlobeChatActionHintPill[];
};

function withPills(
  bodyKo: string,
  pills: readonly GlobeChatActionHintPill[],
): GlobeChatActionHint {
  return { bodyKo, pills };
}

function tapOrType(pills: readonly GlobeChatActionHintPill[]): GlobeChatActionHint {
  return withPills(copy.globe.chatActionHintTapOrType, pills);
}

function textOnly(bodyKo: string): GlobeChatActionHint {
  return withPills(bodyKo, []);
}

function slotPromptHasChips(message: GlobeChatMessage): boolean {
  if (message.kind !== "slot_prompt") {
    return false;
  }
  return (message.choices?.length ?? 0) > 0 || (message.categoryOptions?.length ?? 0) > 0;
}

function pillsForCondition(categoryId: ProductCategoryId | null | undefined): GlobeChatActionHint {
  switch (categoryId) {
    case "laptop":
      return tapOrType(copy.globe.chatActionPills.conditionLaptop);
    case "clothing":
      return tapOrType(copy.globe.chatActionPills.conditionClothing);
    case "furniture":
      return tapOrType(copy.globe.chatActionPills.conditionFurniture);
    default:
      return tapOrType(copy.globe.chatActionPills.condition);
  }
}

function hintForSlotId(
  slotId: string,
  clarifyKind: ComposeClarifyKind | null | undefined,
  categoryId: ProductCategoryId | null | undefined,
): GlobeChatActionHint | null {
  if (clarifyKind === "price_confirm") {
    return tapOrType(copy.globe.chatActionPills.priceConfirm);
  }
  if (clarifyKind === "category_confirm") {
    return tapOrType(copy.globe.chatActionPills.categoryConfirm);
  }

  switch (slotId as ComposeSlotId) {
    case "productName":
      return tapOrType(copy.globe.chatActionPills.productName);
    case "storage":
      return tapOrType(copy.globe.chatActionPills.storage);
    case "cpuRam":
      return tapOrType(copy.globe.chatActionPills.cpuRam);
    case "sizeLabel":
      return tapOrType(copy.globe.chatActionPills.size);
    case "condition":
      return pillsForCondition(categoryId);
    case "priceKrw":
      return tapOrType(copy.globe.chatActionPills.price);
    case "placeLabel":
      return tapOrType(copy.globe.chatActionPills.place);
    case "note":
      return tapOrType(copy.globe.chatActionPills.note);
    default:
      return null;
  }
}

function hintFromComposeState(state: PortalComposeRunState | null): GlobeChatActionHint | null {
  if (!state) {
    return null;
  }

  const categoryId = state.productCategoryId ?? state.proposedCategoryId ?? null;
  const draft = state.composeDraft ?? {};
  const flowOptions = readSellItemFlowOptionsFromComposeState(state);
  const nextFlow = findNextSellItemFlowStep(draft, flowOptions);

  if (state.composeSchemaId === "sell_item") {
    if (nextFlow?.slotKey === "photos") {
      return textOnly(copy.globe.chatActionHintPhotos);
    }
    if (state.macroStage === "description_ready" && state.descriptionDraftKo?.trim()) {
      return textOnly(copy.globe.chatActionHintDescriptionDraft);
    }
    if (nextFlow?.slotKey === "note") {
      return tapOrType(copy.globe.chatActionPills.note);
    }
    if (
      state.status === "ready" &&
      sellItemDraftCanPublish(draft) &&
      nextFlow?.slotKey === "status"
    ) {
      return textOnly(copy.globe.chatActionHintPublish);
    }
  }

  if (state.pendingSlotId) {
    const slotHint = hintForSlotId(
      state.pendingSlotId,
      state.pendingClarifyKind,
      categoryId,
    );
    if (slotHint) {
      return slotHint;
    }
  }

  if (state.intentStage?.stage === "soft_signal") {
    return withPills(copy.globe.chatActionHintSoftConfirm, copy.globe.chatActionPills.softConfirm);
  }

  if (state.intentStage?.stage === "chatting") {
    return tapOrType(copy.globe.chatActionPills.chatting);
  }

  return null;
}

/**
 * “지금 할 일” — short line + tap-to-fill example pills (not the AI bubble).
 */
export function buildGlobeChatActionHint(input: {
  composeState: PortalComposeRunState | null;
  messages: readonly GlobeChatMessage[];
}): GlobeChatActionHint | null {
  if (input.messages.length === 0 && !input.composeState?.intentStage) {
    return tapOrType(copy.globe.chatActionPills.chatting);
  }

  const last = input.messages[input.messages.length - 1];
  if (last?.kind === "program_install") {
    return null;
  }
  if (last?.kind === "slot_prompt") {
    if (slotPromptHasChips(last)) {
      return null;
    }
    const categoryId =
      input.composeState?.productCategoryId ??
      input.composeState?.proposedCategoryId ??
      null;
    return (
      hintForSlotId(last.slotId, last.clarifyKind, categoryId) ??
      hintFromComposeState(input.composeState)
    );
  }

  if (last?.role === "user") {
    return hintFromComposeState(input.composeState);
  }

  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.kind === "slot_prompt") {
      if (slotPromptHasChips(message)) {
        return null;
      }
      const categoryId =
        input.composeState?.productCategoryId ??
        input.composeState?.proposedCategoryId ??
        null;
      return (
        hintForSlotId(message.slotId, message.clarifyKind, categoryId) ??
        hintFromComposeState(input.composeState)
      );
    }
  }

  return hintFromComposeState(input.composeState);
}
