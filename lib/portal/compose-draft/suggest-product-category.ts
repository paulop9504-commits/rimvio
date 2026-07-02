import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import {
  classifyProductCategory,
  getProductCategorySchema,
} from "@/lib/portal/compose-draft/product-category-registry";
import type { ProductCategoryId } from "@/lib/portal/compose-draft/product-category-types";

export type CategorySuggestion = {
  categoryId: ProductCategoryId;
  source: "rule" | "llm";
  labelKo: string;
};

export type CategoryCandidateOption = {
  categoryId: ProductCategoryId;
  labelKo: string;
};

const LLM_IDS: ProductCategoryId[] = [
  "smartphone",
  "laptop",
  "clothing",
  "furniture",
  "generic",
];

async function suggestCategoryLlm(
  productName: string,
  context?: string,
): Promise<ProductCategoryId | null> {
  const raw = await callLlmTextJson({
    systemPrompt: [
      "Classify Korean marketplace product into one category.",
      `Return JSON: { "categoryId": ${LLM_IDS.map((id) => `"${id}"`).join("|")} }`,
      "smartphone: phones. laptop: notebooks. clothing: apparel/shoes/bags.",
      "furniture: desks/chairs/sofas. generic: everything else.",
    ].join(" "),
    userText: [productName, context?.trim()].filter(Boolean).join(" — "),
    temperature: 0.1,
  });
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { categoryId?: string };
    const id = parsed.categoryId?.trim() as ProductCategoryId | undefined;
    if (id && LLM_IDS.includes(id)) {
      return id;
    }
  } catch {
    return null;
  }
  return null;
}

/** Hybrid category suggestion — rules first, LLM when generic. */
export async function suggestProductCategoryHybrid(input: {
  productName: string;
  context?: string;
}): Promise<CategorySuggestion> {
  const productName = input.productName.trim();
  const ruleId = classifyProductCategory(productName);
  if (ruleId !== "generic") {
    return {
      categoryId: ruleId,
      source: "rule",
      labelKo: getProductCategorySchema(ruleId).labelKo,
    };
  }

  const llmId = await suggestCategoryLlm(productName, input.context);
  const categoryId = llmId ?? "generic";
  return {
    categoryId,
    source: llmId ? "llm" : "rule",
    labelKo: getProductCategorySchema(categoryId).labelKo,
  };
}

function pushUnique(
  list: CategoryCandidateOption[],
  categoryId: ProductCategoryId,
): void {
  if (list.some((item) => item.categoryId === categoryId)) {
    return;
  }
  list.push({
    categoryId,
    labelKo: categoryId === "generic" ? "기타" : getProductCategorySchema(categoryId).labelKo,
  });
}

export function buildCategoryPickShortlist(input: {
  productName: string;
  context?: string;
  preferredCategoryId?: ProductCategoryId | null;
}): CategoryCandidateOption[] {
  const text = [input.productName.trim(), input.context?.trim()].filter(Boolean).join(" ");
  const shortlist: CategoryCandidateOption[] = [];

  if (input.preferredCategoryId && input.preferredCategoryId !== "generic") {
    pushUnique(shortlist, input.preferredCategoryId);
  }

  const ruleId = classifyProductCategory(text);
  if (ruleId !== "generic") {
    pushUnique(shortlist, ruleId);
  }

  if (/(?:아이패드|ipad|태블릿|tablet)/iu.test(text)) {
    pushUnique(shortlist, "smartphone");
    pushUnique(shortlist, "laptop");
  } else if (/(?:아이폰|iphone|갤럭시|galaxy|핸드폰|스마트폰)/iu.test(text)) {
    pushUnique(shortlist, "smartphone");
    pushUnique(shortlist, "laptop");
  } else if (/(?:맥북|macbook|노트북|그램|laptop)/iu.test(text)) {
    pushUnique(shortlist, "laptop");
    pushUnique(shortlist, "smartphone");
  } else if (/(?:가방|운동화|신발|자켓|코트|셔츠|바지|의류|옷)/iu.test(text)) {
    pushUnique(shortlist, "clothing");
    pushUnique(shortlist, "furniture");
  } else if (/(?:책상|의자|소파|침대|테이블|선반|가구)/iu.test(text)) {
    pushUnique(shortlist, "furniture");
    pushUnique(shortlist, "clothing");
  }

  pushUnique(shortlist, "generic");
  return shortlist.slice(0, 4);
}
