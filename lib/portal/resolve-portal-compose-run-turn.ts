import { applyPortalMarketSlotAnswer } from "@/lib/portal/apply-portal-market-slot-answer";
import { buildPortalMarketDraft } from "@/lib/portal/build-portal-market-draft";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  buildPortalSocialTitle,
  nextPortalSocialQuestion,
  type PortalSocialSlotId,
} from "@/lib/portal/portal-social-slots";
import { portalIntentToMarketRole } from "@/lib/portal/portal-intent-registry";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import {
  buildMarketQuickListDraft,
  canQuickListMarketCompose,
} from "@/lib/globe/market/build-market-quick-list-draft";
import { resolveMarketQuestionPlan } from "@/lib/globe/market/preference-memory/resolve-market-question-plan";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { mergeSituationMessages } from "@/lib/experience-run/classify-experience-run-intent";

export const PORTAL_COMPOSE_MAX_QUESTIONS = 3;

export type PortalComposeRunClarify = {
  kind: "clarify";
  questionKo: string;
  slotId: string;
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
  pendingSlotId: string | null;
  askedCount: number;
  status: PortalComposeRunState["status"];
  marketDraft?: MarketIntentDraft | null;
  socialSlots?: Partial<Record<PortalSocialSlotId, string>>;
}): PortalComposeRunState {
  return {
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

function buildMarketDraft(input: {
  eventId: string;
  intentId: PortalIntentId;
  composeText: string;
  liveLat: number | null;
  liveLng: number | null;
  existing?: MarketIntentDraft | null;
}): MarketIntentDraft | null {
  const event = findLifeEventCandidate(input.eventId);
  if (!event) {
    return null;
  }
  const fresh = buildPortalMarketDraft({
    event,
    intentId: input.intentId,
    composeText: input.composeText,
    liveLat: input.liveLat,
    liveLng: input.liveLng,
  });
  if (!fresh) {
    return null;
  }
  if (!input.existing) {
    return fresh;
  }
  return {
    ...fresh,
    ...input.existing,
    detail: {
      ...fresh.detail,
      ...input.existing.detail,
      prioritySlots: {
        ...fresh.detail.prioritySlots,
        ...input.existing.detail.prioritySlots,
      },
    },
    placeLabel: input.existing.placeLabel || fresh.placeLabel,
    priceMinKrw: input.existing.priceMinKrw ?? fresh.priceMinKrw,
    priceMaxKrw: input.existing.priceMaxKrw ?? fresh.priceMaxKrw,
  };
}

function resolveMarketQuestion(input: {
  draft: MarketIntentDraft;
  composeText: string;
}): { slotId: string; questionKo: string } | null {
  const productName = input.draft.detail.productName?.trim() ?? "";
  if (!isValidMarketProductName(productName)) {
    return {
      slotId: "product_name",
      questionKo: copy.portal.composeAskProduct,
    };
  }

  const plan = resolveMarketQuestionPlan({
    text: input.composeText,
    productName,
    categoryId: input.draft.categoryId,
    role: input.draft.role,
    existingDetail: input.draft.detail,
    priceMinKrw: input.draft.priceMinKrw,
    priceMaxKrw: input.draft.priceMaxKrw,
  });

  const next = plan.questions[0];
  if (!next) {
    return null;
  }
  return {
    slotId: next.slotId,
    questionKo: next.question,
  };
}

function resolveMarketTurn(input: {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  composeText: string;
  eventId: string;
  liveLat: number | null;
  liveLng: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
}): PortalComposeRunTurnResult {
  const role = portalIntentToMarketRole(input.intentId);
  if (!role) {
    throw new Error("Market portal run requires offer/seek intent");
  }

  let composeText = input.composeText.trim();
  let askedCount = input.resumeState?.askedCount ?? 0;
  let draft =
    input.resumeState?.marketDraft ??
    buildMarketDraft({
      eventId: input.eventId,
      intentId: input.intentId,
      composeText,
      liveLat: input.liveLat,
      liveLng: input.liveLng,
    });

  if (!draft) {
    throw new Error("Failed to build market draft");
  }

  if (input.answerText?.trim() && input.resumeState?.pendingSlotId) {
    draft = applyPortalMarketSlotAnswer({
      draft,
      slotId: input.resumeState.pendingSlotId,
      answerText: input.answerText.trim(),
    });
    composeText = mergeSituationMessages(
      input.resumeState.accumulatedText,
      input.answerText.trim(),
    );
    askedCount += 1;
  }

  if (
    askedCount < PORTAL_COMPOSE_MAX_QUESTIONS &&
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
    const productName = quickDraft.detail.productName.trim();
    return {
      kind: "quick_list_ready",
      composeText,
      eventId: input.eventId,
      productName,
    };
  }

  const question =
    askedCount < PORTAL_COMPOSE_MAX_QUESTIONS
      ? resolveMarketQuestion({ draft, composeText })
      : null;

  if (question) {
    return {
      kind: "clarify",
      questionKo: question.questionKo,
      slotId: question.slotId,
      state: buildState({
        graphId: input.graphId,
        intentId: input.intentId,
        categoryId: input.categoryId,
        composeSeed: input.resumeState?.composeSeed ?? composeText,
        accumulatedText: composeText,
        eventId: input.eventId,
        pendingSlotId: question.slotId,
        askedCount,
        status: "waiting_slot",
        marketDraft: draft,
      }),
    };
  }

  return {
    kind: "launch_wizard",
    draft,
    eventId: input.eventId,
    composeText,
    intentId: input.intentId,
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

export function resolvePortalComposeRunTurn(input: {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  message: string;
  eventId: string;
  liveLat?: number | null;
  liveLng?: number | null;
  resumeState?: PortalComposeRunState | null;
  answerText?: string | null;
}): PortalComposeRunTurnResult {
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

  return resolveMarketTurn({
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
