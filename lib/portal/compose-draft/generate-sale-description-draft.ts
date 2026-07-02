import { callLlmText } from "@/lib/llm/text-llm-client";
import type { ProductCategoryId } from "@/lib/portal/compose-draft/product-category-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import { readProductTaxonomyPathLabelKo } from "@/lib/portal/compose-draft/product-taxonomy-registry";

type KnownSaleFacts = {
  productName: string;
  priceKrw: number | null;
  condition: string | null;
  placeLabel: string | null;
  storage: string | null;
  cpuRam: string | null;
  sizeLabel: string | null;
  categoryLabelKo: string | null;
};

function toSingleLine(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim().replace(/\s+/g, " ");
}

function readKnownSaleFacts(input: {
  draft: Partial<SellItemDraft>;
  productCategoryId?: ProductCategoryId | null;
  slotExtras?: Partial<Record<string, string>> | null;
}): KnownSaleFacts | null {
  const productName = toSingleLine(input.draft.productName);
  if (!productName) {
    return null;
  }
  return {
    productName,
    priceKrw:
      input.draft.priceKrw != null && input.draft.priceKrw >= 10_000
        ? input.draft.priceKrw
        : null,
    condition: toSingleLine(input.draft.condition),
    placeLabel: toSingleLine(input.draft.placeLabel),
    storage: toSingleLine(input.slotExtras?.storage),
    cpuRam: toSingleLine(input.slotExtras?.cpuRam),
    sizeLabel: toSingleLine(input.slotExtras?.sizeLabel),
    categoryLabelKo: readProductTaxonomyPathLabelKo(input.productCategoryId ?? null),
  };
}

function formatPriceKrw(priceKrw: number | null): string | null {
  if (priceKrw == null || priceKrw < 10_000) {
    return null;
  }
  return `${priceKrw.toLocaleString("ko-KR")}원`;
}

function buildFallbackDescription(facts: KnownSaleFacts): string {
  const lines: string[] = [];
  const first = [facts.productName, facts.condition].filter(Boolean).join(" ");
  lines.push(first ? `${first} 상품이에요.` : `${facts.productName} 판매해요.`);

  const specParts = [
    facts.storage ? `용량은 ${facts.storage}예요.` : null,
    facts.cpuRam ? `사양은 ${facts.cpuRam}예요.` : null,
    facts.sizeLabel ? `사이즈는 ${facts.sizeLabel}예요.` : null,
  ].filter(Boolean);
  if (specParts.length > 0) {
    lines.push(specParts.join(" "));
  }

  const price = formatPriceKrw(facts.priceKrw);
  if (price && facts.placeLabel) {
    lines.push(`가격은 ${price}, 거래는 ${facts.placeLabel}에서 가능해요.`);
  } else if (price) {
    lines.push(`가격은 ${price}예요.`);
  } else if (facts.placeLabel) {
    lines.push(`거래는 ${facts.placeLabel}에서 가능해요.`);
  }

  return lines.join("\n").trim();
}

function sanitizeDescription(text: string | null | undefined): string | null {
  if (!text?.trim()) {
    return null;
  }
  const cleaned = text
    .replace(/[!]+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) {
    return null;
  }
  return cleaned.slice(0, 320).trim();
}

function buildPromptUserText(facts: KnownSaleFacts): string {
  return [
    "사실 JSON:",
    JSON.stringify(
      {
        productName: facts.productName,
        condition: facts.condition,
        priceKrw: facts.priceKrw,
        placeLabel: facts.placeLabel,
        storage: facts.storage,
        cpuRam: facts.cpuRam,
        sizeLabel: facts.sizeLabel,
        categoryLabelKo: facts.categoryLabelKo,
      },
      null,
      2,
    ),
  ].join("\n");
}

/**
 * Sale description draft — LLM first, deterministic fallback.
 * Uses only known compose facts and never drives state transitions.
 */
export async function generateSaleDescriptionDraftKo(input: {
  draft: Partial<SellItemDraft>;
  productCategoryId?: ProductCategoryId | null;
  slotExtras?: Partial<Record<string, string>> | null;
}): Promise<string | null> {
  const facts = readKnownSaleFacts(input);
  if (!facts) {
    return null;
  }

  const llm = sanitizeDescription(
    await callLlmText({
      systemPrompt:
        "너는 중고거래 상품설명 초안을 쓰는 한국어 도우미다. 반드시 제공된 사실만 사용하고 없는 정보는 절대 추측하지 마라. 포장, 배터리, 구매시기, 사용기간, 하자, 네고, 택배, 구성품, 정품 여부, 판매 이유를 사실에 없으면 쓰지 마라. 구매자에게 읽기 쉬운 2~4개의 짧은 문장으로만 작성하고, 과장/홍보/이모지/불릿 없이 평이하게 쓴다.",
      userText: buildPromptUserText(facts),
      temperature: 0.2,
      maxTokens: 180,
    }),
  );

  if (llm) {
    return llm;
  }
  return buildFallbackDescription(facts);
}

export function buildSaleDescriptionDraftSourceKey(input: {
  draft: Partial<SellItemDraft>;
  productCategoryId?: ProductCategoryId | null;
  slotExtras?: Partial<Record<string, string>> | null;
}): string {
  const facts = readKnownSaleFacts(input);
  return JSON.stringify(facts);
}
