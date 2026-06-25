import { resolveMarketCategoryId } from "@/lib/globe/market/market-category-registry";
import { parseStorageGb } from "@/lib/globe/market/parse-storage-gb";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { sanitizeMarketProductNameFromParse } from "@/lib/globe/market/sanitize-market-product-name";
import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";

export type MarketListingInferenceSource = "ocr" | "filename" | "draft" | "none";

export type MarketListingMediaInference = {
  productName: string;
  categoryId: MarketCategoryId;
  snippet: string;
  source: MarketListingInferenceSource;
  storageGb?: number;
};

function buildInference(input: {
  corpus: string;
  source: MarketListingInferenceSource;
  storageGb?: number;
}): MarketListingMediaInference | null {
  const parsed = parseMarketProductFromText(input.corpus);
  const productName = sanitizeMarketProductNameFromParse(parsed.productName);
  if (!productName) {
    return null;
  }
  return {
    productName,
    categoryId: resolveMarketCategoryId(`${productName} ${input.corpus}`),
    snippet: input.corpus.slice(0, 160),
    source: input.source,
    ...(input.storageGb ? { storageGb: input.storageGb } : {}),
  };
}

/** Filename heuristics — e.g. IMG_… or "iPhone_15_Pro_256GB.jpg". */
export function inferMarketListingFromFilename(
  filename: string,
): MarketListingMediaInference | null {
  const base = filename.replace(/\.[a-z0-9]{2,5}$/iu, "").replace(/[_-]+/gu, " ");
  const storageGb = parseStorageGb(base) ?? undefined;
  return buildInference({
    corpus: base,
    source: "filename",
    storageGb,
  });
}

/** Portal / composer prefill before OCR runs. */
export function inferMarketListingFromDraftHints(input: {
  title?: string;
  sourceText?: string;
}): MarketListingMediaInference | null {
  const corpus = `${input.sourceText ?? ""} ${input.title ?? ""}`.trim();
  if (!corpus) {
    return null;
  }
  const storageGb = parseStorageGb(corpus) ?? undefined;
  return buildInference({
    corpus,
    source: "draft",
    storageGb,
  });
}

export function inferMarketListingFromOcrText(
  text: string,
): MarketListingMediaInference | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const storageGb = parseStorageGb(trimmed) ?? undefined;
  return buildInference({
    corpus: trimmed,
    source: "ocr",
    storageGb,
  });
}

/** Ordered fallback: OCR text → filename → draft hints. */
export function resolveMarketListingMediaInference(input: {
  ocrText?: string;
  filename?: string;
  draftHints?: { title?: string; sourceText?: string };
}): MarketListingMediaInference | null {
  const fromOcr = input.ocrText ? inferMarketListingFromOcrText(input.ocrText) : null;
  if (fromOcr) {
    return fromOcr;
  }
  const fromFilename = input.filename
    ? inferMarketListingFromFilename(input.filename)
    : null;
  if (fromFilename) {
    return fromFilename;
  }
  if (input.draftHints) {
    return inferMarketListingFromDraftHints(input.draftHints);
  }
  return null;
}
