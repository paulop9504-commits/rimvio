import { buildPortalSocialTitle, nextPortalSocialQuestion, type PortalSocialSlotId } from "@/lib/portal/portal-social-slots";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { portalIntentToMarketRole } from "@/lib/portal/portal-intent-registry";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import {
  buildMarketQuickListDraft,
  canQuickListMarketCompose,
} from "@/lib/globe/market/build-market-quick-list-draft";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { copy } from "@/lib/copy/human-ko";
import { mergeSituationMessages } from "@/lib/experience-run/classify-experience-run-intent";
import { buildComposeIntentHistory } from "@/lib/portal/compose-intent/build-compose-intent-history";
import { classifyComposeIntent } from "@/lib/portal/compose-intent/classify-compose-intent";
import { generateConversationalReply } from "@/lib/portal/compose-intent/generate-conversational-reply";
import type { IntentState } from "@/lib/portal/compose-intent/intent-state-types";
import {
  composeDraftHasValues,
  sellItemDraftCanPublish,
} from "@/lib/portal/compose-draft/draft-utils";
import {
  buildSaleDescriptionDraftSourceKey,
} from "@/lib/portal/compose-draft/generate-sale-description-draft";
import {
  buildMarketIntentFromComposeDraft,
  sellItemDraftToComposeText,
} from "@/lib/portal/compose-draft/draft-to-market-intent";
import {
  readSellItemDescriptionStage,
  readSellItemFlowOptionsFromComposeState,
} from "@/lib/portal/compose-draft/sell-item-flow";
import {
  detectComposeSchemaFromText,
  getComposeSchema,
} from "@/lib/portal/compose-draft/schema-registry";
import { buildComposeIntentReply } from "@/lib/portal/compose-draft/build-compose-assistant-reply";
import type { ComposeClarifyKind } from "@/lib/portal/compose-draft/product-category-types";
import {
  resolveProductTaxonomyBinding,
  type DescriptionDraftStatus,
  type MarketMacroStage,
  type ProductTaxonomyLeafId,
  type ProductTaxonomyStatus,
} from "@/lib/portal/compose-draft/product-taxonomy-registry";
import type { SlotChoiceOption } from "@/lib/portal/compose-draft/slot-choice-registry";
import {
  beginComposeDetailSlotFill,
  readComposeClarifyKind,
  readComposeClarifySlotId,
  readComposePendingPriceConfirmKrw,
  runComposeSlotFillTurn,
} from "@/lib/portal/compose-draft/run-compose-slot-fill";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";

export const PORTAL_COMPOSE_MAX_QUESTIONS = 3;

export type PortalComposeRunComposeConverse = {
  kind: "compose_converse";
  assistantKo: string;
  intentStage: IntentState;
  state: PortalComposeRunState;
};

export type PortalComposeRunClarify = {
  kind: "clarify";
  questionKo: string;
  slotId: string;
  clarifyKind: ComposeClarifyKind;
  choices?: readonly SlotChoiceOption[];
  categoryOptions?: readonly { id: string; labelKo: string }[];
  state: PortalComposeRunState;
};

export type PortalComposeRunComposeIntent = {
  kind: "compose_intent";
  assistantKo: string;
  schemaId: ComposeSchemaId;
  state: PortalComposeRunState;
};

export type PortalComposeRunComposeDraft = {
  kind: "compose_draft";
  assistantKo: string;
  schemaId: ComposeSchemaId;
  draft: Partial<SellItemDraft>;
  canPublish: boolean;
  state: PortalComposeRunState;
};

export type PortalComposeRunLaunchWizard = {
  kind: "launch_wizard";
  draft: MarketIntentDraft;
  eventId: string;
  composeText: string;
  intentId: PortalIntentId;
};

export type PortalComposeRunQuickListReady = {
  kind: "quick_list_ready";
  composeText: string;
  eventId: string;
  productName: string;
};

export type PortalComposeRunSocialReady = {
  kind: "social_ready";
  eventId: string;
  intentId: "together" | "join";
  categoryId: PortalCategoryId | null;
  title: string;
  summaryKo: string;
  socialSlots: Partial<Record<PortalSocialSlotId, string>>;
};

export type PortalComposeRunTurnResult =
  | PortalComposeRunClarify
  | PortalComposeRunComposeConverse
  | PortalComposeRunComposeIntent
  | PortalComposeRunComposeDraft
  | PortalComposeRunLaunchWizard
  | PortalComposeRunQuickListReady
  | PortalComposeRunSocialReady;

function buildState(input: {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  composeSeed: string;
  accumulatedText: string;
  eventId: string;
  status: PortalComposeRunState["status"];
  composeSchemaId?: ComposeSchemaId | null;
  composeDraft?: Partial<SellItemDraft> | null;
  marketDraft?: MarketIntentDraft | null;
  intentStage?: IntentState | null;
  socialSlots?: Partial<Record<PortalSocialSlotId, string>>;
  pendingSlotId?: string | null;
  askedCount?: number;
  productCategoryId?: PortalComposeRunState["productCategoryId"];
  productCategoryStatus?: PortalComposeRunState["productCategoryStatus"];
  proposedCategoryId?: PortalComposeRunState["proposedCategoryId"];
  pendingClarifyKind?: PortalComposeRunState["pendingClarifyKind"];
  slotExtras?: PortalComposeRunState["slotExtras"];
  skippedSlots?: PortalComposeRunState["skippedSlots"];
  detailSlotFill?: boolean;
  pendingPriceConfirmKrw?: number | null;
  macroStage?: PortalComposeRunState["macroStage"];
  marketRole?: PortalComposeRunState["marketRole"];
  taxonomyStatus?: PortalComposeRunState["taxonomyStatus"];
  taxonomyLeafId?: PortalComposeRunState["taxonomyLeafId"];
  taxonomyCandidateIds?: PortalComposeRunState["taxonomyCandidateIds"];
  marketCategoryId?: PortalComposeRunState["marketCategoryId"];
  descriptionStatus?: PortalComposeRunState["descriptionStatus"];
  descriptionDraftKo?: PortalComposeRunState["descriptionDraftKo"];
}): PortalComposeRunState {
  return {
    graphId: input.graphId,
    intentId: input.intentId,
    categoryId: input.categoryId,
    composeSeed: input.composeSeed,
    accumulatedText: input.accumulatedText,
    eventId: input.eventId,
    pendingSlotId: input.pendingSlotId ?? null,
    askedCount: input.askedCount ?? 0,
    status: input.status,
    macroStage: input.macroStage ?? "chatting",
    composeSchemaId: input.composeSchemaId ?? null,
    composeDraft: input.composeDraft ?? null,
    marketDraft: input.marketDraft ?? null,
    intentStage: input.intentStage ?? null,
    marketRole: input.marketRole ?? null,
    socialSlots: input.socialSlots,
    taxonomyStatus: input.taxonomyStatus ?? "unset",
    taxonomyLeafId: input.taxonomyLeafId ?? null,
    taxonomyCandidateIds: input.taxonomyCandidateIds ?? null,
    productCategoryId: input.productCategoryId ?? null,
    productCategoryStatus: input.productCategoryStatus ?? "unset",
    proposedCategoryId: input.proposedCategoryId ?? null,
    marketCategoryId: input.marketCategoryId ?? null,
    pendingClarifyKind: input.pendingClarifyKind ?? "slot",
    slotExtras: input.slotExtras ?? null,
    skippedSlots: input.skippedSlots ?? null,
    detailSlotFill: input.detailSlotFill ?? false,
    pendingPriceConfirmKrw: input.pendingPriceConfirmKrw ?? null,
    descriptionStatus: input.descriptionStatus ?? "idle",
    descriptionDraftKo: input.descriptionDraftKo ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function readConversationMacroStage(intentStage: IntentState): MarketMacroStage {
  if (intentStage.stage === "soft_signal") {
    return "intent_soft";
  }
  if (intentStage.stage === "confirmed") {
    return "role_confirm";
  }
  return "chatting";
}

function readTaxonomyMeta(input: {
  confirmedCategoryId?: PortalComposeRunState["productCategoryId"];
  proposedCategoryId?: PortalComposeRunState["proposedCategoryId"];
  categoryStatus?: PortalComposeRunState["productCategoryStatus"];
}): {
  taxonomyStatus: ProductTaxonomyStatus;
  taxonomyLeafId: ProductTaxonomyLeafId | null;
  taxonomyCandidateIds: ProductTaxonomyLeafId[] | null;
  marketCategoryId: PortalComposeRunState["marketCategoryId"];
} {
  const confirmed = resolveProductTaxonomyBinding(input.confirmedCategoryId ?? null);
  if (input.categoryStatus === "confirmed" && confirmed) {
    return {
      taxonomyStatus: "confirmed",
      taxonomyLeafId: confirmed.taxonomyLeafId,
      taxonomyCandidateIds: [confirmed.taxonomyLeafId],
      marketCategoryId: confirmed.marketCategoryId,
    };
  }
  const proposed = resolveProductTaxonomyBinding(input.proposedCategoryId ?? null);
  if ((input.categoryStatus === "proposed" || input.categoryStatus === "picking") && proposed) {
    return {
      taxonomyStatus: input.categoryStatus === "proposed" ? "proposed" : "hypothesis",
      taxonomyLeafId: proposed.taxonomyLeafId,
      taxonomyCandidateIds: [proposed.taxonomyLeafId],
      marketCategoryId: proposed.marketCategoryId,
    };
  }
  return {
    taxonomyStatus: "unset",
    taxonomyLeafId: null,
    taxonomyCandidateIds: null,
    marketCategoryId: null,
  };
}

function readTurnMacroStage(input: {
  kind: "category_confirm" | "category_pick" | "slot_question" | "price_confirm" | "slot_review";
  canPublish?: boolean;
}): { macroStage: MarketMacroStage; descriptionStatus: DescriptionDraftStatus } {
  if (input.kind === "category_confirm" || input.kind === "category_pick") {
    return { macroStage: "category_scope", descriptionStatus: "idle" };
  }
  if (input.kind === "slot_review") {
    return input.canPublish
      ? { macroStage: "publish_review", descriptionStatus: "ready" }
      : { macroStage: "description_ready", descriptionStatus: "ready" };
  }
  return { macroStage: "slot_fill", descriptionStatus: "idle" };
}

function maybeAddSlotTransitionLead(input: {
  questionKo: string;
  kind: "category_confirm" | "category_pick" | "slot_question" | "price_confirm" | "slot_review";
  previousClarifyKind?: PortalComposeRunState["pendingClarifyKind"];
  answeredText?: string | null;
}): string {
  if (input.kind !== "slot_question") {
    return input.questionKo;
  }
  const answered = input.answeredText?.trim();
  if (!answered) {
    return input.questionKo;
  }
  if (
    input.previousClarifyKind === "category_confirm" ||
    input.previousClarifyKind === "category_pick"
  ) {
    return `${copy.portal.slotTransitionAfterCategoryConfirm}\n${input.questionKo}`;
  }
  return input.questionKo;
}

function readReviewMacroStage(input: {
  draft: Partial<SellItemDraft>;
  state: PortalComposeRunState;
}): { macroStage: MarketMacroStage; descriptionStatus: DescriptionDraftStatus } {
  return readSellItemDescriptionStage({
    draft: input.draft,
    flowOptions: readSellItemFlowOptionsFromComposeState(input.state),
    descriptionDraftKo: input.state.descriptionDraftKo,
  });
}

function readDescriptionSourceKey(state: PortalComposeRunState | null | undefined): string {
  return buildSaleDescriptionDraftSourceKey({
    draft: state?.composeDraft ?? {},
    productCategoryId: state?.productCategoryId ?? state?.proposedCategoryId ?? null,
    slotExtras: state?.slotExtras ?? null,
  });
}

async function finalizeDescriptionDraftState(input: {
  state: PortalComposeRunState;
  resumeState?: PortalComposeRunState | null;
}): Promise<Pick<PortalComposeRunState, "descriptionStatus" | "descriptionDraftKo">> {
  const { state, resumeState } = input;
  const previousDraftKo = resumeState?.descriptionDraftKo?.trim() ?? null;

  if (state.macroStage === "description_ready") {
    const currentKey = readDescriptionSourceKey(state);
    const previousKey = readDescriptionSourceKey(resumeState);
    if (previousDraftKo && currentKey === previousKey) {
      return {
        descriptionStatus: resumeState?.descriptionStatus ?? "ready",
        descriptionDraftKo: previousDraftKo,
      };
    }
    return {
      descriptionStatus: "ready",
      descriptionDraftKo: null,
    };
  }

  if (state.macroStage === "publish_review") {
    if (state.composeDraft?.note?.trim()) {
      return {
        descriptionStatus: previousDraftKo ? "edited" : state.descriptionStatus ?? "edited",
        descriptionDraftKo: previousDraftKo,
      };
    }
    return {
      descriptionStatus: previousDraftKo ? resumeState?.descriptionStatus ?? "ready" : "ready",
      descriptionDraftKo: previousDraftKo,
    };
  }

  return {
    descriptionStatus: "idle",
    descriptionDraftKo: null,
  };
}

async function resolveComposeMarketTurn(input: {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  composeText: string;
  eventId: string;
  liveLat: number | null;
  liveLng: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
  memoryNotesKo?: string | null;
}): Promise<PortalComposeRunTurnResult> {
  const role = portalIntentToMarketRole(input.intentId);
  if (!role) {
    throw new Error("Market portal run requires offer/seek intent");
  }

  let accumulated = input.resumeState?.accumulatedText ?? input.composeText.trim();
  const incoming = input.answerText?.trim() || input.composeText.trim();

  if (input.answerText?.trim() && input.resumeState) {
    accumulated = mergeSituationMessages(accumulated, input.answerText.trim());
  }

  const history = buildComposeIntentHistory({
    graphId: input.graphId,
    accumulatedText: accumulated,
    newMessage: incoming,
  });

  const previousStage = input.resumeState?.intentStage ?? null;
  const alreadyConfirmed = previousStage?.stage === "confirmed";
  const previousClarifyKind = input.resumeState?.pendingClarifyKind ?? null;

  let intentStage: IntentState;
  if (alreadyConfirmed) {
    intentStage = previousStage;
  } else {
    intentStage = await classifyComposeIntent({
      history,
      newMessage: incoming,
      previousStage,
    });
  }

  if (intentStage.stage !== "confirmed") {
    const assistantKo = await generateConversationalReply({
      intentStage,
      history,
      newMessage: incoming,
      memoryNotesKo: input.memoryNotesKo,
    });
    return {
      kind: "compose_converse",
      assistantKo,
      intentStage,
      state: buildState({
        graphId: input.graphId,
        intentId: input.intentId,
        categoryId: input.categoryId,
        composeSeed: input.resumeState?.composeSeed ?? input.composeText.trim(),
        accumulatedText: accumulated,
        eventId: input.eventId,
        status: "conversing",
        macroStage: readConversationMacroStage(intentStage),
        intentStage,
        marketRole: role,
        composeSchemaId: null,
        composeDraft: null,
        marketDraft: null,
      }),
    };
  }

  const schemaId =
    intentStage.resourceType ??
    input.resumeState?.composeSchemaId ??
    detectComposeSchemaFromText(accumulated) ??
    "sell_item";

  const slotTurn = await runComposeSlotFillTurn({
    resumeState: input.resumeState ?? null,
    message: incoming,
    answerText: input.answerText,
    schemaId,
    graphId: input.graphId,
    accumulatedText: accumulated,
  });

  const clarifyKind = readComposeClarifyKind(slotTurn);
  const clarifySlotId = readComposeClarifySlotId(slotTurn);
  const taxonomyMeta = readTaxonomyMeta({
    confirmedCategoryId: slotTurn.productCategoryId,
    proposedCategoryId: slotTurn.proposedCategoryId,
    categoryStatus: slotTurn.productCategoryStatus,
  });

  const baseStateInput = {
    graphId: input.graphId,
    intentId: input.intentId,
    categoryId: input.categoryId,
    composeSeed: input.resumeState?.composeSeed ?? input.composeText.trim(),
    accumulatedText: accumulated,
    eventId: input.eventId,
    composeSchemaId: schemaId,
    intentStage,
    marketRole: role,
    productCategoryId: slotTurn.productCategoryId,
    productCategoryStatus: slotTurn.productCategoryStatus,
    proposedCategoryId: slotTurn.proposedCategoryId,
    taxonomyStatus: taxonomyMeta.taxonomyStatus,
    taxonomyLeafId: taxonomyMeta.taxonomyLeafId,
    taxonomyCandidateIds: taxonomyMeta.taxonomyCandidateIds,
    marketCategoryId: taxonomyMeta.marketCategoryId,
    pendingClarifyKind: clarifyKind,
    slotExtras: slotTurn.slotExtras,
    detailSlotFill: slotTurn.detailSlotFill,
  };

  if (
    slotTurn.kind === "category_confirm" ||
    slotTurn.kind === "category_pick" ||
    slotTurn.kind === "slot_question" ||
    slotTurn.kind === "price_confirm"
  ) {
    const stageMeta = readTurnMacroStage({ kind: slotTurn.kind });
    const questionKo = maybeAddSlotTransitionLead({
      questionKo: slotTurn.questionKo,
      kind: slotTurn.kind,
      previousClarifyKind,
      answeredText: input.answerText,
    });
    return {
      kind: "clarify",
      questionKo,
      slotId: clarifySlotId,
      clarifyKind,
      choices:
        slotTurn.kind === "category_confirm" ||
        slotTurn.kind === "price_confirm"
          ? slotTurn.choices
          : slotTurn.kind === "slot_question"
            ? slotTurn.choices
            : undefined,
      categoryOptions:
        slotTurn.kind === "category_pick" ? slotTurn.categoryOptions : undefined,
      state: buildState({
        ...baseStateInput,
        status: "waiting_slot",
        macroStage: stageMeta.macroStage,
        pendingSlotId:
          slotTurn.kind === "slot_question"
            ? slotTurn.slotId
            : slotTurn.kind === "price_confirm"
              ? "priceKrw"
              : "__category__",
        composeDraft: slotTurn.draft,
        skippedSlots: slotTurn.skippedSlots,
        pendingPriceConfirmKrw: readComposePendingPriceConfirmKrw(slotTurn),
        descriptionStatus: stageMeta.descriptionStatus,
        askedCount: (input.resumeState?.askedCount ?? 0) + 1,
      }),
    };
  }

  const composeDraft = slotTurn.draft;
  const composeText = sellItemDraftToComposeText(composeDraft) || accumulated;

  const marketDraft = buildMarketIntentFromComposeDraft({
    eventId: input.eventId,
    intentId: input.intentId,
    composeText,
    liveLat: input.liveLat,
    liveLng: input.liveLng,
    draft: composeDraft,
    existing: input.resumeState?.marketDraft,
  });

  if (!marketDraft) {
    throw new Error("Failed to build market draft");
  }

  const canPublish = slotTurn.canPublish;
  const draftingReviewState = buildState({
    ...baseStateInput,
    status: canPublish ? "ready" : "drafting",
    macroStage: "slot_fill",
    pendingSlotId: null,
    composeDraft,
    marketDraft,
    skippedSlots: slotTurn.skippedSlots,
    descriptionStatus: "idle",
  });
  const reviewMeta = readReviewMacroStage({
    draft: composeDraft,
    state: draftingReviewState,
  });
  const reviewState = buildState({
    ...draftingReviewState,
    macroStage: reviewMeta.macroStage,
    descriptionStatus: reviewMeta.descriptionStatus,
  });
  const descriptionMeta = await finalizeDescriptionDraftState({
    state: reviewState,
    resumeState: input.resumeState ?? null,
  });
  const finalizedReviewState = buildState({
    ...reviewState,
    descriptionStatus: descriptionMeta.descriptionStatus,
    descriptionDraftKo: descriptionMeta.descriptionDraftKo,
  });

  if (
    canPublish &&
    canQuickListMarketCompose(composeText) &&
    buildMarketQuickListDraft({
      text: composeText,
      eventId: input.eventId,
      liveLat: input.liveLat,
      liveLng: input.liveLng,
    })
  ) {
    const quickDraft = buildMarketQuickListDraft({
      text: composeText,
      eventId: input.eventId,
      liveLat: input.liveLat,
      liveLng: input.liveLng,
    })!;
    return {
      kind: "compose_draft",
      assistantKo: slotTurn.assistantKo,
      schemaId,
      draft: composeDraft,
      canPublish: true,
      state: buildState({
        ...finalizedReviewState,
        marketDraft: quickDraft,
        marketCategoryId: quickDraft.categoryId,
      }),
    };
  }

  return {
    kind: "compose_draft",
    assistantKo: slotTurn.assistantKo,
    schemaId,
    draft: composeDraft,
    canPublish,
    state: finalizedReviewState,
  };
}

function resolveSocialTurn(input: {
  graphId: string;
  intentId: "together" | "join";
  categoryId: PortalCategoryId | null;
  composeText: string;
  eventId: string;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
}): PortalComposeRunTurnResult {
  const filled: Partial<Record<PortalSocialSlotId, string>> = {
    ...(input.resumeState?.socialSlots ?? {}),
  };
  let askedCount = input.resumeState?.askedCount ?? 0;
  let accumulated = input.resumeState?.accumulatedText ?? input.composeText.trim();

  if (input.answerText?.trim() && input.resumeState?.pendingSlotId) {
    filled[input.resumeState.pendingSlotId as PortalSocialSlotId] =
      input.answerText.trim();
    accumulated = mergeSituationMessages(accumulated, input.answerText.trim());
    askedCount += 1;
  }

  const next =
    askedCount < PORTAL_COMPOSE_MAX_QUESTIONS
      ? nextPortalSocialQuestion({
          intentId: input.intentId,
          categoryId: input.categoryId,
          filled,
        })
      : null;

  if (next) {
    return {
      kind: "clarify",
      questionKo: next.questionKo,
      slotId: next.slotId,
      clarifyKind: "slot",
      state: buildState({
        graphId: input.graphId,
        intentId: input.intentId,
        categoryId: input.categoryId,
        composeSeed: input.resumeState?.composeSeed ?? input.composeText.trim(),
        accumulatedText: accumulated,
        eventId: input.eventId,
        pendingSlotId: next.slotId,
        askedCount,
        status: "waiting_slot",
        macroStage: "slot_fill",
        socialSlots: filled,
      }),
    };
  }

  const title = buildPortalSocialTitle({
    intentId: input.intentId,
    categoryId: input.categoryId,
    filled,
  });

  return {
    kind: "social_ready",
    eventId: input.eventId,
    intentId: input.intentId,
    categoryId: input.categoryId,
    title,
    summaryKo: copy.portal.composeSocialSummary(title),
    socialSlots: filled,
  };
}

export async function resolvePortalComposeRunTurn(input: {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  message: string;
  eventId: string;
  liveLat?: number | null;
  liveLng?: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
  memoryNotesKo?: string | null;
}): Promise<PortalComposeRunTurnResult> {
  const liveLat = input.liveLat ?? null;
  const liveLng = input.liveLng ?? null;

  if (input.intentId === "together" || input.intentId === "join") {
    return resolveSocialTurn({
      graphId: input.graphId,
      intentId: input.intentId,
      categoryId: input.categoryId,
      composeText: input.message,
      eventId: input.eventId,
      resumeState: input.resumeState,
      answerText: input.answerText,
    });
  }

  const schemaProbe = detectComposeSchemaFromText(input.message);
  if (schemaProbe && schemaProbe !== "sell_item") {
    const schema = getComposeSchema(schemaProbe);
    return {
      kind: "compose_intent",
      assistantKo: copy.portal.composeDraftSchemaSoon(schema.labelKo),
      schemaId: schemaProbe,
      state: buildState({
        graphId: input.graphId,
        intentId: input.intentId,
        categoryId: input.categoryId,
        composeSeed: input.message.trim(),
        accumulatedText: input.message.trim(),
        eventId: input.eventId,
        status: "drafting",
        composeSchemaId: schemaProbe,
        composeDraft: {},
      }),
    };
  }

  return resolveComposeMarketTurn({
    graphId: input.graphId,
    intentId: input.intentId,
    categoryId: input.categoryId,
    composeText: input.message,
    eventId: input.eventId,
    liveLat,
    liveLng,
    resumeState: input.resumeState,
    answerText: input.answerText,
    memoryNotesKo: input.memoryNotesKo,
  });
}
