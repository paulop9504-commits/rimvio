import { copy } from "@/lib/copy/human-ko";
import {
  findNextFlowStep,
  isFlowComplete,
  type FlowStep,
} from "@/lib/portal/compose-draft/flow-step-types";
import { SELL_ITEM_FLOW, sellItemFlowReadyToPublish } from "@/lib/portal/compose-draft/sell-item-flow";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";
import { buildComposeDraftReply, buildComposeIntentReply } from "@/lib/portal/compose-draft/build-compose-assistant-reply";
import { composeDraftHasValues } from "@/lib/portal/compose-draft/draft-utils";
import { generateConversationalReply } from "@/lib/portal/compose-intent/generate-conversational-reply";
import type { ComposeIntentMessage } from "@/lib/portal/compose-intent/intent-state-types";

function readFlow(schemaId: ComposeSchemaId): readonly FlowStep[] {
  if (schemaId === "sell_item") {
    return SELL_ITEM_FLOW;
  }
  return [];
}

function fallbackNudge(step: FlowStep, draft: Partial<SellItemDraft>): string {
  switch (step.slotKey) {
    case "productName":
      return copy.portal.composeDraftNeedProduct;
    case "priceKrw":
      return draft.productName?.trim()
        ? copy.portal.composeDraftNeedPrice(draft.productName.trim())
        : copy.portal.composeDraftNeedPrice("이 물건");
    case "photos":
      return copy.portal.composeDraftNudgePhoto;
    case "note":
      return copy.portal.composeDraftNudgeDescription;
    default:
      return copy.portal.composeDraftPartial;
  }
}

/**
 * Confirmed-stage reply — uses persona chat (not extractor prompt).
 * Slot filling is handled separately by extractDraftSlots.
 */
export async function generateComposeNudgeMessage(input: {
  schemaId: ComposeSchemaId;
  draft: Partial<SellItemDraft>;
  history?: ComposeIntentMessage[];
  historyKo?: string;
  isResume?: boolean;
}): Promise<string> {
  if (!composeDraftHasValues(input.draft)) {
    return buildComposeIntentReply(input.schemaId);
  }

  const flow = readFlow(input.schemaId);
  if (flow.length === 0) {
    return buildComposeDraftReply({
      schemaId: input.schemaId,
      draft: input.draft,
      isResume: input.isResume ?? false,
    });
  }

  if (sellItemFlowReadyToPublish(input.draft) && isFlowComplete(input.draft, flow.slice(0, -1))) {
    return copy.portal.composeDraftReadyToSubmit;
  }

  const history: ComposeIntentMessage[] =
    input.history ??
    (input.historyKo
      ? input.historyKo
          .split(/\n+/u)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^(user|assistant):\s*(.+)$/iu);
            if (match) {
              return {
                role: match[1]!.toLowerCase() === "assistant" ? ("assistant" as const) : ("user" as const),
                text: match[2]!.trim(),
              };
            }
            return { role: "user" as const, text: line };
          })
      : []);

  const conversational = await generateConversationalReply({
    intentStage: { stage: "confirmed", resourceType: input.schemaId },
    history,
    newMessage: history[history.length - 1]?.text ?? "",
    draft: input.draft,
  });
  if (conversational) {
    return conversational;
  }

  const next = findNextFlowStep(input.draft, flow.slice(0, -1));
  if (!next) {
    return copy.portal.composeDraftReady;
  }
  return fallbackNudge(next, input.draft);
}
