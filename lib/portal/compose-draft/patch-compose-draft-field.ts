import {
  patchComposeDraftFieldOnFeed,
} from "@/lib/context-run/sync-compose-draft-to-feed";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";
import { buildMarketIntentFromComposeDraft } from "@/lib/portal/compose-draft/draft-to-market-intent";
import { sellItemDraftToComposeText } from "@/lib/portal/compose-draft/draft-to-market-intent";

function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const man = trimmed.match(/^(\d+(?:\.\d+)?)\s*만/u);
  if (man?.[1]) {
    return Math.round(Number.parseFloat(man[1]) * 10_000);
  }
  const digits = trimmed.replace(/[^\d]/gu, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value >= 10_000 ? value : null;
}

export function patchComposeDraftField(input: {
  graphId: string;
  fieldId: keyof SellItemDraft;
  rawValue: string;
}): Partial<SellItemDraft> | null {
  const state = readPortalComposeRunState(input.graphId);
  if (!state?.composeSchemaId) {
    return null;
  }

  const schemaId = state.composeSchemaId as ComposeSchemaId;
  const draft: Partial<SellItemDraft> = { ...(state.composeDraft ?? {}) };

  if (input.fieldId === "priceKrw") {
    draft.priceKrw = parsePriceInput(input.rawValue);
  } else if (input.fieldId === "productName") {
    draft.productName = input.rawValue.trim() || null;
  } else if (input.fieldId === "condition") {
    draft.condition = input.rawValue.trim() || null;
  } else if (input.fieldId === "placeLabel") {
    draft.placeLabel = input.rawValue.trim() || null;
  } else if (input.fieldId === "note") {
    draft.note = input.rawValue.trim() || null;
  } else if (input.fieldId === "role") {
    draft.role =
      input.rawValue.trim() === "seeking"
        ? "seeking"
        : input.rawValue.trim() === "listing"
          ? "listing"
          : draft.role ?? null;
  }

  const composeText =
    sellItemDraftToComposeText(draft) || state.accumulatedText;
  const marketDraft = buildMarketIntentFromComposeDraft({
    eventId: state.eventId,
    intentId: state.intentId,
    composeText,
    liveLat: null,
    liveLng: null,
    draft,
    existing: state.marketDraft,
  });

  writePortalComposeRunState({
    ...state,
    composeDraft: draft,
    marketDraft,
    accumulatedText: composeText,
    updatedAt: new Date().toISOString(),
  });

  patchComposeDraftFieldOnFeed({
    graphId: input.graphId,
    schemaId,
    draft,
  });

  return draft;
}
