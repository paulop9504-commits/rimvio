import { copy } from "@/lib/copy/human-ko";
import {
  mergeComposeDraft,
  sellItemDraftCanPublish,
} from "@/lib/portal/compose-draft/draft-utils";
import {
  parseCategoryConfirmResponse,
  parseCategoryPickResponse,
} from "@/lib/portal/compose-draft/parse-category-response";
import {
  isSlotFilled,
  mergeSlotExtrasIntoDraft,
  parseSlotAnswer,
  type SlotExtras,
} from "@/lib/portal/compose-draft/parse-slot-answer";
import type {
  ComposeClarifyKind,
  ComposeSlotId,
  ProductCategoryId,
  ProductCategoryStatus,
} from "@/lib/portal/compose-draft/product-category-types";
import { prefillComposeDraftFromTurn } from "@/lib/portal/compose-draft/prefill-compose-draft-from-turn";
import {
  getProductCategorySchema,
  listPickableProductCategories,
  listSlotsForMode,
} from "@/lib/portal/compose-draft/product-category-registry";
import {
  readCategoryConfirmChoices,
  readSlotChoices,
  resolveSlotChoiceLabel,
  type SlotChoiceOption,
} from "@/lib/portal/compose-draft/slot-choice-registry";
import { suggestProductCategoryHybrid } from "@/lib/portal/compose-draft/suggest-product-category";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

const CATEGORY_PENDING_SLOT = "__category__";

export type ComposeSlotFillResult = {
  productCategoryStatus: ProductCategoryStatus;
  productCategoryId: ProductCategoryId | null;
  proposedCategoryId: ProductCategoryId | null;
} & (
  | {
      kind: "category_confirm";
      questionKo: string;
      suggestedCategoryId: ProductCategoryId;
      suggestedLabelKo: string;
      schemaId: ComposeSchemaId;
      draft: Partial<SellItemDraft>;
      slotExtras: SlotExtras;
      skippedSlots: ComposeSlotId[];
      detailSlotFill: boolean;
      choices: readonly SlotChoiceOption[];
    }
  | {
      kind: "category_pick";
      questionKo: string;
      schemaId: ComposeSchemaId;
      draft: Partial<SellItemDraft>;
      slotExtras: SlotExtras;
      skippedSlots: ComposeSlotId[];
      detailSlotFill: boolean;
      categoryOptions: readonly { id: ProductCategoryId; labelKo: string }[];
    }
  | {
      kind: "slot_question";
      questionKo: string;
      slotId: ComposeSlotId;
      categoryId: ProductCategoryId;
      schemaId: ComposeSchemaId;
      draft: Partial<SellItemDraft>;
      slotExtras: SlotExtras;
      skippedSlots: ComposeSlotId[];
      detailSlotFill: boolean;
      choices?: readonly SlotChoiceOption[];
    }
  | {
      kind: "slot_review";
      assistantKo: string;
      categoryId: ProductCategoryId;
      schemaId: ComposeSchemaId;
      draft: Partial<SellItemDraft>;
      slotExtras: SlotExtras;
      skippedSlots: ComposeSlotId[];
      canPublish: boolean;
      detailSlotFill: boolean;
    }
);

function readConfirmedCategoryId(
  state: PortalComposeRunState | null,
): ProductCategoryId | null {
  if (state?.productCategoryStatus === "confirmed" && state.productCategoryId) {
    return state.productCategoryId;
  }
  if (!state?.productCategoryStatus && state?.productCategoryId) {
    return state.productCategoryId;
  }
  return null;
}

function readCategoryStatus(state: PortalComposeRunState | null): ProductCategoryStatus {
  return state?.productCategoryStatus ?? "unset";
}

function resolveNextSlot(input: {
  categoryId: ProductCategoryId;
  draft: Partial<SellItemDraft>;
  slotExtras: SlotExtras;
  skippedSlots: ReadonlySet<ComposeSlotId>;
  detailSlotFill: boolean;
}): ComposeSlotId | null {
  const schema = getProductCategorySchema(input.categoryId);
  const slots = listSlotsForMode(schema, input.detailSlotFill);
  for (const slotId of schema.slotOrder) {
    if (!slots.includes(slotId)) {
      continue;
    }
    if (!isSlotFilled(slotId, input.draft, input.slotExtras, input.skippedSlots)) {
      return slotId;
    }
  }
  return null;
}

function buildCategoryPickOptions(): readonly { id: ProductCategoryId; labelKo: string }[] {
  return listPickableProductCategories().map((id) => ({
    id,
    labelKo: getProductCategorySchema(id).labelKo,
  }));
}

function withCategoryMeta(
  result: Record<string, unknown> & { kind: ComposeSlotFillResult["kind"] },
  input: {
    categoryStatus: ProductCategoryStatus;
    confirmedCategoryId: ProductCategoryId | null;
    proposedCategoryId: ProductCategoryId | null;
  },
): ComposeSlotFillResult {
  return {
    ...result,
    productCategoryStatus: input.categoryStatus,
    productCategoryId: input.confirmedCategoryId,
    proposedCategoryId: input.proposedCategoryId,
  } as ComposeSlotFillResult;
}

function resolveSlotAnswerText(input: {
  slotId: ComposeSlotId;
  answerText: string;
  categoryId: ProductCategoryId;
}): string {
  const choices = readSlotChoices({ categoryId: input.categoryId, slotId: input.slotId });
  if (!choices) {
    return input.answerText;
  }
  return resolveSlotChoiceLabel(choices, input.answerText) ?? input.answerText;
}

/**
 * One turn = category confirm/pick OR one slot question. Card only after required slots.
 */
export async function runComposeSlotFillTurn(input: {
  resumeState: PortalComposeRunState | null;
  message: string;
  answerText?: string | null;
  schemaId: ComposeSchemaId;
  graphId: string;
  accumulatedText: string;
}): Promise<ComposeSlotFillResult> {
  const incoming = input.answerText?.trim() || input.message.trim();
  const previousDraft = input.resumeState?.composeDraft ?? {};
  const previousExtras = (input.resumeState?.slotExtras ?? {}) as SlotExtras;
  const skippedSlots = new Set<ComposeSlotId>(
    (input.resumeState?.skippedSlots ?? []) as ComposeSlotId[],
  );
  const detailSlotFill = input.resumeState?.detailSlotFill ?? false;
  const pendingClarifyKind = input.resumeState?.pendingClarifyKind ?? "slot";
  const pendingSlotId = input.resumeState?.pendingSlotId as ComposeSlotId | null;

  let draft = { ...previousDraft };
  let slotExtras = { ...previousExtras };
  let categoryStatus = readCategoryStatus(input.resumeState);
  let confirmedCategoryId = readConfirmedCategoryId(input.resumeState);
  let proposedCategoryId = input.resumeState?.proposedCategoryId ?? null;

  if (pendingClarifyKind === "category_confirm" && input.answerText?.trim()) {
    const verdict = parseCategoryConfirmResponse(input.answerText);
    if (verdict === "yes" && proposedCategoryId) {
      categoryStatus = "confirmed";
      confirmedCategoryId = proposedCategoryId;
    } else if (verdict === "no") {
      categoryStatus = "picking";
      proposedCategoryId = null;
    }
  } else if (pendingClarifyKind === "category_pick" && input.answerText?.trim()) {
    const picked = parseCategoryPickResponse(input.answerText);
    if (picked) {
      categoryStatus = "confirmed";
      confirmedCategoryId = picked;
      proposedCategoryId = null;
    }
  } else if (pendingClarifyKind === "slot" && pendingSlotId && input.answerText?.trim()) {
    const categoryForParse = confirmedCategoryId ?? "generic";
    const answerText = resolveSlotAnswerText({
      slotId: pendingSlotId,
      answerText: input.answerText,
      categoryId: categoryForParse,
    });
    const parsed = parseSlotAnswer(pendingSlotId, answerText);
    draft = mergeComposeDraft(draft, parsed.draft);
    slotExtras = { ...slotExtras, ...parsed.extras };
    if (parsed.skipped) {
      skippedSlots.add(pendingSlotId);
    }
  }

  const prefilled = await prefillComposeDraftFromTurn({
    schemaId: input.schemaId,
    graphId: input.graphId,
    accumulatedText: input.accumulatedText,
    incoming,
    draft,
    slotExtras,
    pendingClarifyKind,
    pendingSlotId,
    answerText: input.answerText,
  });
  draft = prefilled.draft;
  slotExtras = prefilled.slotExtras;

  draft = mergeSlotExtrasIntoDraft(draft, slotExtras);

  const productNamed = Boolean(draft.productName?.trim());

  if (productNamed && categoryStatus !== "confirmed") {
    if (categoryStatus === "picking") {
      return withCategoryMeta(
        {
          kind: "category_pick",
          questionKo: copy.portal.slotCategoryPickAsk,
          schemaId: input.schemaId,
          draft,
          slotExtras,
          skippedSlots: [...skippedSlots],
          detailSlotFill,
          categoryOptions: buildCategoryPickOptions(),
        },
        { categoryStatus, confirmedCategoryId, proposedCategoryId },
      );
    }

    if (categoryStatus === "proposed" && proposedCategoryId) {
      const schema = getProductCategorySchema(proposedCategoryId);
      return withCategoryMeta(
        {
          kind: "category_confirm",
          questionKo: copy.portal.slotCategoryConfirmAsk(
            schema.labelKo,
            draft.productName!.trim(),
          ),
          suggestedCategoryId: proposedCategoryId,
          suggestedLabelKo: schema.labelKo,
          schemaId: input.schemaId,
          draft,
          slotExtras,
          skippedSlots: [...skippedSlots],
          detailSlotFill,
          choices: readCategoryConfirmChoices(),
        },
        { categoryStatus, confirmedCategoryId, proposedCategoryId },
      );
    }

    const suggestion = await suggestProductCategoryHybrid({
      productName: draft.productName!.trim(),
      context: incoming,
    });
    proposedCategoryId = suggestion.categoryId;
    categoryStatus = "proposed";
    return withCategoryMeta(
      {
        kind: "category_confirm",
        questionKo: copy.portal.slotCategoryConfirmAsk(
          suggestion.labelKo,
          draft.productName!.trim(),
        ),
        suggestedCategoryId: suggestion.categoryId,
        suggestedLabelKo: suggestion.labelKo,
        schemaId: input.schemaId,
        draft,
        slotExtras,
        skippedSlots: [...skippedSlots],
        detailSlotFill,
        choices: readCategoryConfirmChoices(),
      },
      { categoryStatus, confirmedCategoryId, proposedCategoryId },
    );
  }

  const categoryId = confirmedCategoryId ?? "generic";

  const nextSlot = resolveNextSlot({
    categoryId,
    draft,
    slotExtras,
    skippedSlots,
    detailSlotFill,
  });

  if (!nextSlot) {
    const publishDraft = mergeSlotExtrasIntoDraft(draft, slotExtras);
    return withCategoryMeta(
      {
        kind: "slot_review",
        assistantKo: copy.portal.slotReviewReady,
        categoryId,
        schemaId: input.schemaId,
        draft: publishDraft,
        slotExtras,
        skippedSlots: [...skippedSlots],
        canPublish: sellItemDraftCanPublish(publishDraft),
        detailSlotFill,
      },
      { categoryStatus, confirmedCategoryId: categoryId, proposedCategoryId: null },
    );
  }

  const schema = getProductCategorySchema(categoryId);
  const questionKo = schema.questions[nextSlot] ?? copy.portal.slotAskProductName;
  const choices = readSlotChoices({ categoryId, slotId: nextSlot }) ?? undefined;

  return withCategoryMeta(
    {
      kind: "slot_question",
      questionKo,
      slotId: nextSlot,
      categoryId,
      schemaId: input.schemaId,
      draft,
      slotExtras,
      skippedSlots: [...skippedSlots],
      detailSlotFill,
      choices,
    },
    {
      categoryStatus: confirmedCategoryId ? "confirmed" : "unset",
      confirmedCategoryId,
      proposedCategoryId: null,
    },
  );
}

export function readComposeClarifyKind(result: ComposeSlotFillResult): ComposeClarifyKind {
  if (result.kind === "category_confirm") {
    return "category_confirm";
  }
  if (result.kind === "category_pick") {
    return "category_pick";
  }
  return "slot";
}

export function readComposeClarifySlotId(result: ComposeSlotFillResult): string {
  if (result.kind === "slot_question") {
    return result.slotId;
  }
  return CATEGORY_PENDING_SLOT;
}

/** Enable optional slot questions after review card "자세히 맞추기". */
export function beginComposeDetailSlotFill(state: PortalComposeRunState): PortalComposeRunState {
  return {
    ...state,
    detailSlotFill: true,
    status: "waiting_slot",
    pendingSlotId: null,
    pendingClarifyKind: "slot",
    updatedAt: new Date().toISOString(),
  };
}
