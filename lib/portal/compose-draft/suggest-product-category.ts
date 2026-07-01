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
