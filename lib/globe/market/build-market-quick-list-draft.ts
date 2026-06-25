import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { prefillMarketIntentDraft } from "@/lib/globe/market/prefill-market-intent-draft";
import { prefillMarketPrioritySlots } from "@/lib/globe/market/prefill-market-priority-slots";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { readMarketComposeQuery } from "@/lib/globe/market/detect-market-compose-input";

function readComposeBody(text: string): string {
  const query = readMarketComposeQuery(text);
  if (query) {
    return query;
  }
  return text.replace(/^@\S+\s*/u, "").trim();
}

/** One-line @중고 → draft when product name is parseable (wizard skip gate). */
export function buildMarketQuickListDraft(input: {
  text: string;
  eventId: string;
  liveLat?: number | null;
  liveLng?: number | null;
}): MarketIntentDraft | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }

  const body = readComposeBody(text);
  const normalized = normalizeMarketIntentFromText({
    text: body || text,
    eventId: input.eventId,
  });
  if (!normalized) {
    return null;
  }
  if (!isValidMarketProductName(normalized.detail.productName)) {
    return null;
  }

  const placeFromText = parseMarketPlaceFromText(text);
  let draft = prefillMarketPrioritySlots(
    prefillMarketIntentDraft({
      draft: {
        ...normalized,
        detail: {
          ...normalized.detail,
          sourceText: text,
        },
        prefillSources: [...normalized.prefillSources, "quick_list"],
      },
      liveLat: input.liveLat ?? null,
      liveLng: input.liveLng ?? null,
    }),
  );

  if (placeFromText && !draft.placeLabel.trim()) {
    draft = { ...draft, placeLabel: placeFromText };
  }

  return draft;
}

export function canQuickListMarketCompose(text: string): boolean {
  return buildMarketQuickListDraft({ text: text.trim(), eventId: "probe" }) !== null;
}
