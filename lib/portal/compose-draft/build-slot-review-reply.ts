import { copy } from "@/lib/copy/human-ko";
import { findNextSellItemFlowStep } from "@/lib/portal/compose-draft/sell-item-flow";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";

/** Slot review assistant line — lead to the very next action (media, note, publish). */
export function buildSlotReviewAssistantKo(
  schemaId: ComposeSchemaId,
  draft: Partial<SellItemDraft>,
): string {
  if (schemaId !== "sell_item") {
    return copy.portal.slotReviewReady;
  }

  const next = findNextSellItemFlowStep(draft);
  if (next?.slotKey === "photos") {
    return copy.portal.slotReviewAskMedia;
  }
  if (next?.slotKey === "note") {
    return copy.portal.slotReviewAskDescription;
  }
  return copy.portal.slotReviewConfirmPublish;
}
