/**
 * AI pre-label — vision/OCR → Suggested Reality Patch (R3).
 */

import type { OcrResult } from "@/lib/vision/types";
import type { SuggestedRealityPatch } from "@/lib/reality-data-network/types";

export type PreLabelInput = {
  readonly domain: SuggestedRealityPatch["domain"];
  readonly titleKo?: string | null;
  readonly targetLabelKo?: string | null;
  readonly ocr?: OcrResult | null;
  readonly visionLabels?: readonly string[] | null;
  readonly mediaUrl?: string | null;
};

const LODGING_KEYWORDS: readonly RegExp[] = [
  /호텔|hotel|room|객실|bed|욕조|bathtub|view|전망|double|twin|suite/i,
];

function inferLodgingAttributes(text: string, labels: readonly string[]): Record<string, unknown> {
  const blob = `${text} ${labels.join(" ")}`.toLowerCase();
  const attrs: Record<string, unknown> = {};

  if (/double|더블/i.test(blob)) attrs.bed = "double";
  if (/twin|트윈/i.test(blob)) attrs.bed = "twin";
  if (/욕조|bathtub|bath/i.test(blob)) attrs.bathtub = true;
  if (/desk|책상/i.test(blob)) attrs.desk = true;
  if (/window|창/i.test(blob)) attrs.window = true;
  if (/city|시티|urban/i.test(blob)) attrs.view = "city";
  if (/ocean|sea|바다/i.test(blob)) attrs.view = "ocean";

  if (Object.keys(attrs).length === 0) {
    attrs.roomType = "unknown";
    attrs.note = "AI pre-label — 검수 필요";
  }

  return attrs;
}

/** Build Suggested patch from capture/vision signals — never Confirmed. */
export function buildSuggestedRealityPatch(input: PreLabelInput): SuggestedRealityPatch {
  const ocrText = input.ocr?.text?.trim() ?? "";
  const visionLabels = [
    ...(input.ocr?.vision?.labels ?? []),
    ...(input.ocr?.vision?.bestGuessLabels ?? []),
    ...(input.visionLabels ?? []),
  ];

  const source: SuggestedRealityPatch["source"] = input.ocr?.vision
    ? "vision"
    : ocrText
      ? "ocr"
      : "heuristic";

  let attributes: Record<string, unknown> = {};
  let confidence = 0.45;

  if (input.domain === "lodging") {
    attributes = inferLodgingAttributes(ocrText, visionLabels);
    confidence = Object.keys(attributes).length > 2 ? 0.62 : 0.48;
  } else if (input.domain === "eatery") {
    attributes = { category: "restaurant", note: ocrText.slice(0, 120) || "eatery capture" };
    confidence = 0.5;
  } else {
    attributes = { label: input.targetLabelKo ?? input.titleKo ?? "poi" };
    confidence = 0.4;
  }

  if (LODGING_KEYWORDS.some((re) => re.test(ocrText))) {
    confidence = Math.min(0.75, confidence + 0.1);
  }

  return {
    epistemic: confidence >= 0.55 ? "inferred" : "suggested",
    domain: input.domain,
    attributes,
    source,
    confidence: Math.round(confidence * 100) / 100,
    summaryKo: `AI pre-label (${source}) — ${Object.keys(attributes).join(", ")}`,
  };
}

/** Flatten patch for task aiPreLabel field. */
export function patchToAiPreLabel(patch: SuggestedRealityPatch): Record<string, unknown> {
  return {
    ...patch.attributes,
    _epistemic: patch.epistemic,
    _source: patch.source,
    _confidence: patch.confidence,
  };
}
