import { buildPortalMarketDraft } from "@/lib/portal/build-portal-market-draft";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export function sellItemDraftToComposeText(draft: Partial<SellItemDraft>): string {
  const parts: string[] = [];
  if (draft.productName?.trim()) {
    parts.push(draft.productName.trim());
  }
  if (draft.condition?.trim()) {
    parts.push(draft.condition.trim());
  }
  if (draft.priceKrw != null && draft.priceKrw >= 10_000) {
    const man = draft.priceKrw % 10_000 === 0 ? draft.priceKrw / 10_000 : null;
    parts.push(man != null ? `${man}만원` : `${draft.priceKrw.toLocaleString("ko-KR")}원`);
  }
  if (draft.placeLabel?.trim()) {
    parts.push(draft.placeLabel.trim());
  }
  if (draft.note?.trim()) {
    parts.push(draft.note.trim());
  }
  return parts.join(" ").trim();
}

export function buildMarketIntentFromComposeDraft(input: {
  eventId: string;
  intentId: PortalIntentId;
  composeText: string;
  liveLat: number | null;
  liveLng: number | null;
  draft: Partial<SellItemDraft>;
  existing?: MarketIntentDraft | null;
}): MarketIntentDraft | null {
  const event = findLifeEventCandidate(input.eventId);
  if (!event) {
    return null;
  }
  const mergedText =
    sellItemDraftToComposeText(input.draft) || input.composeText.trim();
  const fresh = buildPortalMarketDraft({
    event,
    intentId: input.intentId,
    composeText: mergedText,
    liveLat: input.liveLat,
    liveLng: input.liveLng,
  });
  if (!fresh) {
    return null;
  }
  const productName = input.draft.productName?.trim();
  const priceKrw = input.draft.priceKrw;
  const placeLabel = input.draft.placeLabel?.trim();
  const condition = input.draft.condition?.trim();

  const patched: MarketIntentDraft = {
    ...fresh,
    ...input.existing,
    role: input.draft.role ?? fresh.role,
    placeLabel: placeLabel || input.existing?.placeLabel || fresh.placeLabel,
    priceMinKrw: priceKrw ?? input.existing?.priceMinKrw ?? fresh.priceMinKrw,
    priceMaxKrw: priceKrw ?? input.existing?.priceMaxKrw ?? fresh.priceMaxKrw,
    detail: {
      ...fresh.detail,
      ...input.existing?.detail,
      productName: productName || input.existing?.detail.productName || fresh.detail.productName,
      prioritySlots: {
        ...fresh.detail.prioritySlots,
        ...input.existing?.detail.prioritySlots,
        ...(condition ? { condition } : {}),
      },
      detailNote:
        input.draft.note?.trim() ||
        input.existing?.detail.detailNote ||
        fresh.detail.detailNote,
    },
  };
  return patched;
}
