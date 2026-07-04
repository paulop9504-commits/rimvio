import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { isGeminiConfigured } from "@/lib/locate/gemini-config";
import type {
  RestaurantSearchCandidate,
  RestaurantSearchCountryBias,
  RestaurantSearchIntent,
} from "@/lib/restaurant-search/types";

type SpecialnessWire = {
  candidates?: Array<{
    placeId?: string;
    specialReasonKo?: string;
    boost?: number;
  }>;
};

function isConfigured(): boolean {
  return isOpenAiConfigured() || isGeminiConfigured();
}

function buildPrompt(input: {
  query: string;
  intent: RestaurantSearchIntent;
  countryBias: RestaurantSearchCountryBias;
  candidates: readonly RestaurantSearchCandidate[];
}): string {
  const candidateLines = input.candidates.map((candidate, index) => {
    return [
      `${index + 1}. placeId=${candidate.placeId}`,
      `name=${candidate.name}`,
      `address=${candidate.address ?? "-"}`,
      `rating=${candidate.rating ?? "-"}`,
      `openNow=${candidate.openNow == null ? "-" : candidate.openNow ? "yes" : "no"}`,
      `source=${candidate.source}`,
      `cuisineHint=${candidate.cuisineHint ?? "-"}`,
      `categoryLabel=${candidate.categoryLabel ?? "-"}`,
      `description=${candidate.description ?? "-"}`,
    ].join(" | ");
  });

  return [
    "사용자의 맛집 탐색 후보를 보고, '평범하지만 이 사용자에게는 특별할 수 있는 곳'을 짧게 설명하세요.",
    "검색어와 조건을 벗어나지 말고, 과장하거나 사실을 만들어내지 마세요.",
    "각 후보에 대해 한국어 한 문장 specialReasonKo와 0~20 boost만 반환하세요.",
    "boost는 아주 보수적으로 주고, 근거가 약하면 0을 주세요.",
    "JSON only.",
    "",
    `query=${input.query}`,
    `countryBias=${input.countryBias}`,
    `cuisine=${input.intent.cuisine ?? "-"}`,
    `excludeKeywords=${input.intent.excludeKeywords.join(",") || "-"}`,
    `vibe=${input.intent.vibe}`,
    `localityMode=${input.intent.localityMode}`,
    "",
    ...candidateLines,
  ].join("\n");
}

function parseWire(raw: string | null): SpecialnessWire | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SpecialnessWire;
    if (!parsed || !Array.isArray(parsed.candidates)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function requestRestaurantSpecialness(input: {
  query: string;
  intent: RestaurantSearchIntent;
  countryBias: RestaurantSearchCountryBias;
  candidates: readonly RestaurantSearchCandidate[];
}): Promise<Map<string, { specialReasonKo: string; boost: number }>> {
  const byPlaceId = new Map<string, { specialReasonKo: string; boost: number }>();
  if (!isConfigured() || input.candidates.length === 0) {
    return byPlaceId;
  }

  const wire = parseWire(
    await callLlmTextJson({
      systemPrompt:
        "You rank restaurant candidates for a personal context app. Return strict JSON only.",
      userText: buildPrompt(input),
      temperature: 0.15,
    }),
  );
  if (!wire?.candidates?.length) {
    return byPlaceId;
  }

  for (const row of wire.candidates) {
    const placeId = typeof row.placeId === "string" ? row.placeId.trim() : "";
    const specialReasonKo =
      typeof row.specialReasonKo === "string" ? row.specialReasonKo.trim() : "";
    const boost =
      typeof row.boost === "number" && Number.isFinite(row.boost)
        ? Math.max(0, Math.min(20, Math.round(row.boost)))
        : 0;
    if (!placeId || !specialReasonKo) {
      continue;
    }
    byPlaceId.set(placeId, { specialReasonKo, boost });
  }

  return byPlaceId;
}
