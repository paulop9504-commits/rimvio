import { sellItemDraftCanPublish } from "@/lib/portal/compose-draft/draft-utils";
import { sellItemDraftToComposeText } from "@/lib/portal/compose-draft/draft-to-market-intent";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { readActiveRunState } from "@/lib/context-run/run-state-store";

export type PendingMarketComposeAction = {
  kind: "wizard" | "quick_list";
  eventId: string;
  composeText: string;
  draft?: MarketIntentDraft;
};

export function resolveComposeSessionGraphId(): string | null {
  return (
    readActiveRunState()?.graphId?.trim() ||
    readPortalComposeRunState()?.graphId?.trim() ||
    null
  );
}

/** Rehydrate CTA payload when the in-memory ref was lost (chat reopen, HMR). */
export function resolvePendingMarketComposeAction(
  graphId?: string | null,
): PendingMarketComposeAction | null {
  const resolvedGraphId = graphId?.trim() || resolveComposeSessionGraphId();
  const state = resolvedGraphId
    ? readPortalComposeRunState(resolvedGraphId)
    : readPortalComposeRunState();
  if (!state || state.status !== "ready" || !state.composeDraft) {
    return null;
  }
  if (!sellItemDraftCanPublish(state.composeDraft)) {
    return null;
  }
  const composeText =
    sellItemDraftToComposeText(state.composeDraft) || state.accumulatedText.trim();
  if (!composeText) {
    return null;
  }
  return {
    kind: "quick_list",
    eventId: state.eventId,
    composeText,
    draft: state.marketDraft ?? undefined,
  };
}
