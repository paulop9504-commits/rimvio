import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { prefillMarketPrioritySlots } from "@/lib/globe/market/prefill-market-priority-slots";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";

function readPriceRange(text: string): {
  priceMinKrw: number | null;
  priceMaxKrw: number | null;
} {
  const normalized = normalizeMarketIntentFromText({
    text,
    eventId: "probe",
  });
  if (!normalized) {
    return { priceMinKrw: null, priceMaxKrw: null };
  }
  return {
    priceMinKrw: normalized.priceMinKrw,
    priceMaxKrw: normalized.priceMaxKrw,
  };
}

/** Merge one slot answer into a market draft during Portal compose Run. */
export function applyPortalMarketSlotAnswer(input: {
  draft: MarketIntentDraft;
  slotId: string;
  answerText: string;
}): MarketIntentDraft {
  const answer = input.answerText.trim();
  if (!answer) {
    return input.draft;
  }

  if (input.slotId === "product_name") {
    const productName = answer.slice(0, 120);
    if (!isValidMarketProductName(productName)) {
      return input.draft;
    }
    return {
      ...input.draft,
      detail: {
        ...input.draft.detail,
        productName,
        sourceText: `${input.draft.detail.sourceText ?? ""} ${answer}`.trim(),
      },
    };
  }

  if (input.slotId === "price") {
    const { priceMinKrw, priceMaxKrw } = readPriceRange(answer);
    if (priceMinKrw === null && priceMaxKrw === null) {
      return input.draft;
    }
    return {
      ...input.draft,
      priceMinKrw: priceMinKrw ?? input.draft.priceMinKrw,
      priceMaxKrw: priceMaxKrw ?? input.draft.priceMaxKrw,
    };
  }

  const place = parseMarketPlaceFromText(answer);
  if (place && (input.slotId === "distance" || input.slotId === "place")) {
    return {
      ...input.draft,
      placeLabel: place,
    };
  }

  const prioritySlotId = input.slotId as MarketPrioritySlotId;
  const prefilled = prefillMarketPrioritySlots({
    ...input.draft,
    detail: {
      ...input.draft.detail,
      sourceText: `${input.draft.detail.sourceText ?? ""} ${answer}`.trim(),
    },
  });

  const slots = { ...(prefilled.detail.prioritySlots ?? {}) };
  if (prioritySlotId === "battery_health" && /\d{2,3}/u.test(answer)) {
    slots.battery_health = answer.match(/\d{2,3}/u)?.[0] ?? answer;
  } else if (prioritySlotId === "storage_gb" && /\d+/u.test(answer)) {
    slots.storage_gb = answer.match(/\d+/u)?.[0] ?? answer;
  } else if (prioritySlotId === "cosmetic_grade") {
    slots.cosmetic_grade = answer.slice(0, 40);
  } else if (prioritySlotId === "condition_abc") {
    slots.condition_abc = answer.slice(0, 40);
  }

  return {
    ...prefilled,
    detail: {
      ...prefilled.detail,
      prioritySlots: slots,
    },
  };
}
