/**
 * Batch LLM blurbs for GPT-style place list cards — grounded on FactPack only.
 */

import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import type { PlaceBriefFactPack } from "@/lib/context-workspace/place-brief/types";
import { buildPlaceBriefFromFacts } from "@/lib/context-workspace/place-brief/build-place-brief-from-facts";

export type PlaceListBlurb = {
  readonly placeId: string;
  readonly blurbKo: string;
  readonly source: "facts" | "facts+llm";
};

type LlmBatchJson = {
  items?: Array<{ placeId?: string; blurbKo?: string }>;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

import { sanitizePlaceListBlurb } from "@/lib/context-workspace/place-list/sanitize-place-list-blurb";

function seedBlurb(pack: PlaceBriefFactPack): string {
  const brief = buildPlaceBriefFromFacts(pack);
  const intro = sanitizePlaceListBlurb(brief.introKo, [
    pack.amountLabel ?? "",
    pack.title,
  ]);
  if (intro) return intro;
  const summary = sanitizePlaceListBlurb(pack.summaryKo, [
    pack.amountLabel ?? "",
    pack.title,
  ]);
  if (summary) return summary;
  return "이 일정에 맞는지 짧게 적어둘게요.";
}

/**
 * One LLM call for up to N packs — short card lines like ChatGPT Maps.
 */
export async function enrichPlaceListBlurbsWithLlm(input: {
  readonly packs: readonly PlaceBriefFactPack[];
  readonly destinationKo?: string | null;
  readonly queryHintKo?: string | null;
}): Promise<readonly PlaceListBlurb[]> {
  const packs = input.packs.slice(0, 12);
  if (packs.length === 0) return [];

  const seeds = packs.map((pack) => ({
    placeId: pack.placeId,
    blurbKo: seedBlurb(pack),
  }));

  const raw = await callLlmTextJson({
    temperature: 0.25,
    systemPrompt: [
      "You write short Korean blurbs for a map place-list (ChatGPT Maps style).",
      "ONLY use facts in each item. Never invent prices, distances, or amenities.",
      "Each blurbKo: ONE short judgment sentence (why it fits) — traveler-facing.",
      "NEVER repeat rating stars, price, or category (호텔/Hotel) — those already show above the blurb.",
      "Prefer base / food access / station walk / value when facts support it.",
      'Return JSON: { items: [{ placeId, blurbKo }] } — one entry per input placeId.',
    ].join(" "),
    userText: JSON.stringify({
      destinationKo: input.destinationKo ?? null,
      queryHintKo: input.queryHintKo ?? null,
      places: packs.map((p) => ({
        placeId: p.placeId,
        kind: p.kind,
        title: p.title,
        summaryKo: p.summaryKo,
        amountLabel: p.amountLabel,
        rating: p.rating,
        reviewCount: p.reviewCount,
        amenities: p.amenities,
        partnerLabel: p.partnerLabel,
        seedBlurbKo: seedBlurb(p),
      })),
    }),
  });

  if (!raw?.trim()) {
    return seeds.map((s) => ({ ...s, source: "facts" as const }));
  }

  let parsed: LlmBatchJson;
  try {
    parsed = JSON.parse(raw) as LlmBatchJson;
  } catch {
    return seeds.map((s) => ({ ...s, source: "facts" as const }));
  }

  const byId = new Map<string, string>();
  for (const row of parsed.items ?? []) {
    const id = asString(row.placeId);
    const blurb = asString(row.blurbKo);
    if (id && blurb) byId.set(id, blurb);
  }

  return packs.map((pack) => {
    const seed = seeds.find((s) => s.placeId === pack.placeId)!;
    const llmRaw = byId.get(pack.placeId);
    const llm = sanitizePlaceListBlurb(llmRaw, [
      pack.amountLabel ?? "",
      pack.title,
    ]);
    return {
      placeId: pack.placeId,
      blurbKo: llm ?? seed.blurbKo,
      source: llm ? ("facts+llm" as const) : ("facts" as const),
    };
  });
}
