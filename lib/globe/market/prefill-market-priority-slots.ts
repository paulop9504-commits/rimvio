/**
 * Prefill category priority slots from text + legacy detail fields.
 */

import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import {
  getTopPrioritySlots,
  type MarketPrioritySlotId,
} from "@/lib/globe/market/market-priority-matrix";
import { parseStorageGb } from "@/lib/globe/market/parse-storage-gb";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";

function mapConditionToAbc(
  conditionId: MarketIntentDraft["detail"]["conditionId"],
): string | null {
  if (!conditionId) {
    return null;
  }
  switch (conditionId) {
    case "sealed":
      return "S";
    case "like_new":
      return "A";
    case "good":
      return "B";
    case "fair":
      return "C";
    case "for_parts":
      return "D";
    default:
      return null;
  }
}

function parseStorageFromText(text: string): number | null {
  return parseStorageGb(text);
}

function parseBatteryFromText(text: string): number | null {
  const match = text.match(/배터리\s*(\d{2,3})\s*%?/iu);
  if (!match?.[1]) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}

function parseYearFromText(text: string): string | null {
  const year = text.match(/\b(20\d{2})\b/u)?.[1];
  if (year) {
    return year;
  }
  const model = text.match(/(?:아이폰|iphone|갤럭시|galaxy)\s*(\d{1,2})/iu)?.[1];
  return model ? `모델 ${model}` : null;
}

function parseColorFromText(text: string): string | null {
  const match = text.match(
    /(?:블랙|화이트|실버|골드|핑크|블루|그린|레드|black|white|silver|gold|pink|blue|green|red)/iu,
  );
  return match?.[0] ?? null;
}

function parseCosmeticFromText(text: string): MarketIntentDraft["detail"]["conditionId"] | null {
  if (/미개봉|sealed|unopened|새제품\s*그대로/iu.test(text)) {
    return "sealed";
  }
  return null;
}

export function prefillMarketPrioritySlots(draft: MarketIntentDraft): MarketIntentDraft {
  const text = draft.detail.sourceText || draft.title;
  const { productName } = parseMarketProductFromText(text);
  const slots = { ...(draft.detail.prioritySlots ?? {}) };
  const top = getTopPrioritySlots(draft.categoryId);
  const parsedCosmetic = parseCosmeticFromText(text);
  const conditionId = draft.detail.conditionId ?? parsedCosmetic;

  for (const slot of top) {
    const current = slots[slot.field];
    if (current !== undefined && current !== null && current !== "") {
      continue;
    }
    switch (slot.field as MarketPrioritySlotId) {
      case "battery_health": {
        const battery = parseBatteryFromText(text);
        if (battery !== null) {
          slots.battery_health = battery;
        }
        break;
      }
      case "storage_gb": {
        const storage = parseStorageFromText(text);
        if (storage !== null) {
          slots.storage_gb = storage;
        }
        break;
      }
      case "cosmetic_grade":
        if (conditionId) {
          slots.cosmetic_grade = conditionId;
        }
        break;
      case "condition_abc": {
        const abc = mapConditionToAbc(conditionId);
        if (abc) {
          slots.condition_abc = abc;
        }
        break;
      }
      case "repair_history":
        if (/수리\s*(?:없|무)|무사고/iu.test(text)) {
          slots.repair_history = true;
        }
        break;
      case "color_design": {
        const color = parseColorFromText(text);
        if (color) {
          slots.color_design = color;
        }
        break;
      }
      case "model_year": {
        const year = parseYearFromText(text);
        if (year) {
          slots.model_year = year;
        } else if (productName) {
          slots.model_year = productName;
        }
        break;
      }
      case "distance":
        slots.distance = `${draft.radiusKm}km`;
        break;
      default:
        break;
    }
  }

  return {
    ...draft,
    detail: {
      ...draft.detail,
      conditionId: conditionId ?? draft.detail.conditionId,
      productName: draft.detail.productName || productName,
      prioritySlots: slots,
    },
  };
}
