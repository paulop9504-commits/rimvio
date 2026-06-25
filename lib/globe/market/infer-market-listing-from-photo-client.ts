"use client";

import {
  resolveMarketListingMediaInference,
  type MarketListingMediaInference,
} from "@/lib/globe/market/infer-market-listing-from-media";
import { isMarketListingPhotoFile } from "@/lib/globe/market/market-listing-media";

export type MarketListingPhotoInference = MarketListingMediaInference;

type OcrPayload = {
  text?: string;
  kernel?: { shadow_intent?: { query?: string } };
  refinement?: { kernel?: { shadow_intent?: { query?: string } } };
};

function readOcrCorpus(payload: OcrPayload): string {
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const kernelQuery =
    payload.kernel?.shadow_intent?.query?.trim() ??
    payload.refinement?.kernel?.shadow_intent?.query?.trim() ??
    "";
  return text || kernelQuery;
}

/** Listing recognize — OCR first, then filename / draft fallback. */
export async function inferMarketListingFromPhotoFiles(
  files: readonly File[],
  draftHints?: { title?: string; sourceText?: string },
): Promise<MarketListingPhotoInference | null> {
  const photo = files.find(isMarketListingPhotoFile);
  if (!photo) {
    return inferMarketListingFromDraftHintsOnly(draftHints);
  }

  let ocrText = "";
  try {
    const formData = new FormData();
    formData.append("image", photo);
    const response = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      const payload = (await response.json()) as OcrPayload;
      ocrText = readOcrCorpus(payload);
    }
  } catch {
    // fall through to filename / draft
  }

  return resolveMarketListingMediaInference({
    ocrText: ocrText || undefined,
    filename: photo.name,
    draftHints,
  });
}

function inferMarketListingFromDraftHintsOnly(
  draftHints?: { title?: string; sourceText?: string },
): MarketListingPhotoInference | null {
  if (!draftHints) {
    return null;
  }
  return resolveMarketListingMediaInference({ draftHints });
}
