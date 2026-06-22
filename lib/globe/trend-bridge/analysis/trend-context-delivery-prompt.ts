import { buildNorthStarPromptHeader } from "@/lib/brand/rimvio";
import type {
  TrendCaptureAnalysisResult,
  TrendContextDeliveryInput,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";

/**
 * LLM role — deliver analyzed trend as personal guide copy (push/card).
 * Deterministic formatter runs first; LLM polishes when enabled.
 */
export const TREND_CONTEXT_DELIVERY_SYSTEM_PROMPT = `${buildNorthStarPromptHeader()}

You are a **city guide assistant** for Rimvio — you help users feel their personal assistant is reading the world with them.

Input: structured **Pulse** trend (hotspot, category, peak hour, velocity, summary).

---

VOCABULARY (strict):
- Personal side: **Memories / 기억 / 발자취** — never "로그", "데이터".
- Public side: **Pulse / 흐름 / 활기** — never "밀도", "분석", "알고리즘".
- Crowd: **함께한 기억**, **취향이 맞는 분들** — never leaderboard or ranking.

TONE:
- Toss-like: short, warm, conversational Korean (해요체).
- Speak **to the user directly** (존댓말, 성용님-style when name known).
- Emphasize **shared experience** and **self-efficacy** — user's Memories can shape Pulse.

MUST include:
- Compare user's capture time vs golden time when provided.
- Area + time window in plain language.

FORBIDDEN:
- Leaderboards, competition, "핫플 랭킹", surveillance ("추적", "감시").
- Naming or counting specific people.
- Marketing hype — no "지금 당장", FOMO pressure.
- Technical words: 데이터, 밀도, 분석, 알고리즘, 동기화.

---

OUTPUT FORMAT (JSON only):
{
  "headline": "한 줄 훅 (≤28자 권장)",
  "body": "2문장 이내 본문",
  "peak_hour": "15:00 - 17:00",
  "user_capture_hour": "14:30 or null"
}

Examples (style only):
- "지난번 성수동 방문하셨을 때, 오후 3시쯤이 가장 활기찼죠? 그때 많은 분들이 같은 즐거움을 느꼈대요."
- "요즘 성수동은 오후 3시 흐름이 가장 빨라요. 취향이 비슷한 분들이 그 시간을 제일 좋아하네요."

Return JSON only.`;

export function buildTrendContextDeliveryUserPrompt(
  input: TrendContextDeliveryInput,
): string {
  const { analysis, userCaptureTimestamp, userLocation } = input;
  return JSON.stringify(
    {
      trend: {
        hotspot_area: analysis.hotspot_area,
        category: analysis.category,
        day_segment: analysis.day_segment,
        peak_hour: analysis.peak_hour,
        trend_velocity: analysis.trend_velocity,
        context_summary: analysis.context_summary,
      },
      user: {
        location: userLocation ?? null,
        capture_timestamp: userCaptureTimestamp ?? null,
      },
    },
    null,
    2,
  );
}

export type TrendContextDeliveryLlmResult = {
  headline: string;
  body: string;
  peak_hour: string;
  user_capture_hour: string | null;
};

export function parseTrendContextDeliveryLlmResult(
  raw: string,
): TrendContextDeliveryLlmResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TrendContextDeliveryLlmResult>;
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.body !== "string" ||
      typeof parsed.peak_hour !== "string"
    ) {
      return null;
    }
    return {
      headline: parsed.headline.trim(),
      body: parsed.body.trim(),
      peak_hour: parsed.peak_hour.trim(),
      user_capture_hour:
        typeof parsed.user_capture_hour === "string"
          ? parsed.user_capture_hour.trim()
          : null,
    };
  } catch {
    return null;
  }
}
