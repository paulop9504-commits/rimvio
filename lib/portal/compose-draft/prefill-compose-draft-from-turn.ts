import { buildComposeIntentHistory } from "@/lib/portal/compose-intent/build-compose-intent-history";
import { mergeComposeDraft, mergeComposeDraftIfEmpty } from "@/lib/portal/compose-draft/draft-utils";
import {
  extractDraftSlots,
  extractDraftSlotsRulesOnly,
} from "@/lib/portal/compose-draft/extract-draft-slots";
import {
  extractProductNameFromMessage,
  parseSlotAnswer,
  type SlotExtras,
} from "@/lib/portal/compose-draft/parse-slot-answer";
import type { ComposeClarifyKind, ComposeSlotId } from "@/lib/portal/compose-draft/product-category-types";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";

const EXTRA_SLOT_IDS: ComposeSlotId[] = ["storage", "cpuRam", "sizeLabel"];

function shouldPrefillFromTurn(input: {
  incoming: string;
  pendingClarifyKind: ComposeClarifyKind;
  answerText?: string | null;
}): boolean {
  if (!input.incoming.trim()) {
    return false;
  }
  if (
    input.answerText?.trim() &&
    (input.pendingClarifyKind === "category_confirm" ||
      input.pendingClarifyKind === "category_pick")
  ) {
    return false;
  }
  return true;
}

function shouldUseLlmPrefill(input: {
  incoming: string;
  answerText?: string | null;
}): boolean {
  const text = input.incoming.trim();
  if (!text) {
    return false;
  }
  if (!input.answerText?.trim()) {
    return text.length >= 12;
  }
  return text.length > 20;
}

function prefillSlotExtrasIfEmpty(input: {
  message: string;
  slotExtras: SlotExtras;
}): SlotExtras {
  const next: SlotExtras = { ...input.slotExtras };
  for (const slotId of EXTRA_SLOT_IDS) {
    if (next[slotId]?.trim()) {
      continue;
    }
    const parsed = parseSlotAnswer(slotId, input.message);
    const value = parsed.extras[slotId]?.trim();
    if (value) {
      next[slotId] = value;
    }
  }
  return next;
}

function reconcilePrefillProductName(input: {
  incoming: string;
  draft: Partial<SellItemDraft>;
  patch: Partial<SellItemDraft>;
  pendingSlotId: string | null;
  answerText?: string | null;
}): Partial<SellItemDraft> {
  if (input.draft.productName?.trim()) {
    return input.patch;
  }
  if (input.answerText?.trim() && input.pendingSlotId === "productName") {
    return input.patch;
  }
  const narrow = extractProductNameFromMessage(input.incoming);
  if (narrow.productName) {
    return { ...input.patch, productName: narrow.productName };
  }
  if (!input.patch.productName?.trim()) {
    return input.patch;
  }
  const { productName: _ignored, ...rest } = input.patch;
  return rest;
}

/**
 * Card-era bulk extract, decomposed: fill empty draft fields from each turn's text.
 * Rules always; LLM when the message is substantive (not a short chip answer).
 */
export async function prefillComposeDraftFromTurn(input: {
  schemaId: ComposeSchemaId;
  graphId: string;
  accumulatedText: string;
  incoming: string;
  draft: Partial<SellItemDraft>;
  slotExtras: SlotExtras;
  pendingClarifyKind: ComposeClarifyKind;
  pendingSlotId?: string | null;
  answerText?: string | null;
}): Promise<{ draft: Partial<SellItemDraft>; slotExtras: SlotExtras }> {
  if (!shouldPrefillFromTurn(input)) {
    return { draft: input.draft, slotExtras: input.slotExtras };
  }

  const incoming = input.incoming.trim();
  let draft = { ...input.draft };
  let slotExtras = { ...input.slotExtras };

  if (input.schemaId === "sell_item") {
    const rulesPatch = extractDraftSlotsRulesOnly(incoming);
    let patch = rulesPatch;

    if (shouldUseLlmPrefill(input)) {
      const history = buildComposeIntentHistory({
        graphId: input.graphId,
        accumulatedText: input.accumulatedText,
        newMessage: incoming,
      });
      const llmPatch = await extractDraftSlots({
        schemaId: input.schemaId,
        history,
        currentDraft: draft,
        newMessage: incoming,
      });
      patch = mergeComposeDraft(rulesPatch, llmPatch);
    }

    patch = reconcilePrefillProductName({
      incoming,
      draft,
      patch,
      pendingSlotId: input.pendingSlotId ?? null,
      answerText: input.answerText,
    });

    draft = mergeComposeDraftIfEmpty(draft, patch);
    slotExtras = prefillSlotExtrasIfEmpty({ message: incoming, slotExtras });
  } else {
    const history = buildComposeIntentHistory({
      graphId: input.graphId,
      accumulatedText: input.accumulatedText,
      newMessage: incoming,
    });
    const patch = await extractDraftSlots({
      schemaId: input.schemaId,
      history,
      currentDraft: draft,
      newMessage: incoming,
    });
    draft = mergeComposeDraftIfEmpty(draft, patch);
  }

  return { draft, slotExtras };
}
