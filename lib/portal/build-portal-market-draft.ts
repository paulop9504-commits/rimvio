import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildMarketIntentDraftFromContextEvent } from "@/lib/globe/context-hub/build-market-intent-draft-from-context-event";
import { createMarketIntentDraftFromRole } from "@/lib/globe/market/create-market-intent-draft-from-role";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { prefillMarketIntentDraft } from "@/lib/globe/market/prefill-market-intent-draft";
import { prefillMarketPrioritySlots } from "@/lib/globe/market/prefill-market-priority-slots";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { portalIntentToMarketRole } from "@/lib/portal/portal-intent-registry";

export function buildPortalMarketDraft(input: {
  event: EventCandidate;
  intentId: PortalIntentId;
  composeText?: string;
  liveLat: number | null;
  liveLng: number | null;
}): MarketIntentDraft | null {
  const role = portalIntentToMarketRole(input.intentId);
  if (!role) {
    return null;
  }

  let base = buildMarketIntentDraftFromContextEvent(input.event, { role });
  const compose = input.composeText?.trim();
  if (compose) {
    const normalized = normalizeMarketIntentFromText({
      text: compose,
      eventId: input.event.id,
    });
    if (normalized) {
      base = { ...normalized, role, prefillSources: [...normalized.prefillSources, "portal"] };
    } else {
      base = {
        ...createMarketIntentDraftFromRole({ role, eventId: input.event.id }),
        detail: { ...base.detail, sourceText: compose },
        prefillSources: ["portal", "composer"],
      };
    }
  } else {
    base = { ...base, role, prefillSources: [...base.prefillSources, "portal"] };
  }

  return prefillMarketPrioritySlots(
    prefillMarketIntentDraft({
      draft: base,
      liveLat: input.liveLat,
      liveLng: input.liveLng,
    }),
  );
}
