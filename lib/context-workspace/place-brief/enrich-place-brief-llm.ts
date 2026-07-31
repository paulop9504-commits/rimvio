/**
 * Optional LLM polish for Place Brief — grounded on FactPack only.
 */

import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import type { PlaceBrief, PlaceBriefFactPack } from "@/lib/context-workspace/place-brief/types";
import { buildPlaceBriefFromFacts } from "@/lib/context-workspace/place-brief/build-place-brief-from-facts";

type LlmBriefJson = {
  introKo?: string;
  featuresKo?: string[];
  reviewSummaryKo?: string;
  atmosphereKo?: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, 5);
}

export async function enrichPlaceBriefWithLlm(input: {
  readonly pack: PlaceBriefFactPack;
  readonly base?: PlaceBrief | null;
}): Promise<PlaceBrief> {
  const base = input.base ?? buildPlaceBriefFromFacts(input.pack);

  const raw = await callLlmTextJson({
    temperature: 0.2,
    systemPrompt: [
      "You write short Korean place briefs for a travel Workspace.",
      "ONLY use facts in the user JSON. Never invent check-in times, amenities, prices, or phone numbers.",
      "If a fact is missing, omit it — do not guess.",
      "Return JSON: { introKo, featuresKo: string[<=5], reviewSummaryKo, atmosphereKo }",
      "introKo: 2 short sentences max.",
      "featuresKo: concrete bullets from facts (route, price, rating, amenities).",
      "reviewSummaryKo: one sentence from rating/reviewCount only.",
      "atmosphereKo: one optional sentence or empty string.",
    ].join(" "),
    userText: JSON.stringify({
      facts: input.pack,
      seed: {
        introKo: base.introKo,
        featuresKo: base.featuresKo,
        reviewSummaryKo: base.reviewSummaryKo,
      },
    }),
  });

  if (!raw?.trim()) {
    return base;
  }

  let parsed: LlmBriefJson;
  try {
    parsed = JSON.parse(raw) as LlmBriefJson;
  } catch {
    return base;
  }

  const introKo = asString(parsed.introKo) ?? base.introKo;
  const features = asStringList(parsed.featuresKo);
  const featuresKo = features.length > 0 ? features : base.featuresKo;
  const reviewSummaryKo =
    asString(parsed.reviewSummaryKo) ?? base.reviewSummaryKo;
  const atmosphereKo = asString(parsed.atmosphereKo);

  return {
    ...base,
    introKo,
    featuresKo,
    reviewSummaryKo,
    atmosphereKo,
    // knowBefore + routeFit stay factual — never LLM-overwritten
    source: "facts+llm",
  };
}
