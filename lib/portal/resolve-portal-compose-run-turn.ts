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
  buildMarketIntentFromComposeDraft,
  sellItemDraftToComposeText,
} from "@/lib/portal/compose-draft/draft-to-market-intent";
import {
  detectComposeSchemaFromText,
  getComposeSchema,
} from "@/lib/portal/compose-draft/schema-registry";
import { buildComposeIntentReply } from "@/lib/portal/compose-draft/build-compose-assistant-reply";
import type { ComposeClarifyKind } from "@/lib/portal/compose-draft/product-category-types";
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
    composeSchemaId: input.composeSchemaId ?? null,
    composeDraft: input.composeDraft ?? null,
    marketDraft: input.marketDraft ?? null,
    intentStage: input.intentStage ?? null,
    socialSlots: input.socialSlots,
    productCategoryId: input.productCategoryId ?? null,
    productCategoryStatus: input.productCategoryStatus ?? "unset",
    proposedCategoryId: input.proposedCategoryId ?? null,
    pendingClarifyKind: input.pendingClarifyKind ?? "slot",
    slotExtras: input.slotExtras ?? null,
    skippedSlots: input.skippedSlots ?? null,
    detailSlotFill: input.detailSlotFill ?? false,
    pendingPriceConfirmKrw: input.pendingPriceConfirmKrw ?? null,
    updatedAt: new Date().toISOString(),
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
        intentStage,
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

  const baseStateInput = {
    graphId: input.graphId,
    intentId: input.intentId,
    categoryId: input.categoryId,
    composeSeed: input.resumeState?.composeSeed ?? input.composeText.trim(),
    accumulatedText: accumulated,
    eventId: input.eventId,
    composeSchemaId: schemaId,
    intentStage,
    productCategoryId: slotTurn.productCategoryId,
    productCategoryStatus: slotTurn.productCategoryStatus,
    proposedCategoryId: slotTurn.proposedCategoryId,
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
    return {
      kind: "clarify",
      questionKo: slotTurn.questionKo,
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
        pendingSlotId:
          slotTurn.kind === "slot_question"
            ? slotTurn.slotId
            : slotTurn.kind === "price_confirm"
              ? "priceKrw"
              : "__category__",
        composeDraft: slotTurn.draft,
        skippedSlots: slotTurn.skippedSlots,
        pendingPriceConfirmKrw: readComposePendingPriceConfirmKrw(slotTurn),
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

  const reviewState = buildState({
    ...baseStateInput,
    status: canPublish ? "ready" : "drafting",
    pendingSlotId: null,
    composeDraft,
    marketDraft,
    skippedSlots: slotTurn.skippedSlots,
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
        ...reviewState,
        marketDraft: quickDraft,
      }),
    };
  }

  return {
    kind: "compose_draft",
    assistantKo: slotTurn.assistantKo,
    schemaId,
    draft: composeDraft,
    canPublish,
    state: reviewState,
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
  });
}
