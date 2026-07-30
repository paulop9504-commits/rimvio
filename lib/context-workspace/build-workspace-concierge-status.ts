/**
 * Thin concierge status for Workspace map — World State + focus, no analytics wall.
 */

import type { WorldState } from "@/lib/workstream/world-state";

export type WorkspaceConciergeStatus = {
  readonly topWeatherKo: string | null;
  readonly congestionKo: string | null;
  readonly bottomLiveKo: string | null;
  readonly suggestRainRevise: boolean;
  readonly suggestQuietRoute: boolean;
  readonly opportunityTitleKo: string | null;
};

function looksRainy(prepLine: string | null | undefined): boolean {
  const t = prepLine?.trim() ?? "";
  return /비|소나기|rain|shower|storm|우산/iu.test(t);
}

function comfortKo(input: {
  readonly prepLine: string | null;
  readonly tempC: number | null;
  readonly rainyWorld: boolean;
}): string {
  if (input.rainyWorld || looksRainy(input.prepLine)) {
    return "비 소식 · 실내 동선 추천";
  }
  if (input.tempC != null && input.tempC >= 30) return "더운 편 · 그늘·실내 여유";
  if (input.tempC != null && input.tempC <= 5) return "쌀쌀함 · 실내 위주 추천";
  return "주변 쾌적";
}

export function buildWorkspaceConciergeStatus(input: {
  readonly anchorTitle?: string | null;
  readonly tempC?: number | null;
  readonly prepLine?: string | null;
  readonly routeStopCount?: number;
  readonly world?: WorldState | null;
  /** Trip draft ready — bias Opportunity toward rain indoor revise. */
  readonly tripDraftReady?: boolean;
}): WorkspaceConciergeStatus {
  const tempC = input.tempC ?? null;
  const prepLine = input.prepLine?.trim() || null;
  const anchor = input.anchorTitle?.trim() || null;
  const stops = input.routeStopCount ?? 0;
  const world = input.world ?? null;

  const weatherSignal = world?.signals.find((s) => s.kind === "weather");
  const crowdSignal = world?.signals.find(
    (s) => s.kind === "transit" || s.hint === "crowd_moderate",
  );
  const rainWorld =
    weatherSignal?.hint === "rain_indoor_revise" ||
    looksRainy(weatherSignal?.detailKo) ||
    looksRainy(weatherSignal?.labelKo);

  const worldTemp =
    weatherSignal && /(\d+)\s*°?\s*C/i.test(weatherSignal.detailKo)
      ? Number(RegExp.$1)
      : null;
  const effectiveTemp = tempC ?? worldTemp ?? (input.tripDraftReady ? 22 : null);

  const topWeatherKo =
    effectiveTemp != null
      ? `현재 기온: ${Math.round(effectiveTemp)}°C${
          rainWorld || looksRainy(prepLine) ? " · 비 소식" : prepLine ? ` · ${prepLine}` : ""
        }`
      : rainWorld
        ? "비 예보"
        : prepLine;

  const congestionKo =
    crowdSignal?.detailKo?.trim() === "보통"
      ? "전체 일정 혼잡도: 보통"
      : crowdSignal
        ? `전체 일정 혼잡도: ${crowdSignal.detailKo}`
        : stops >= 3
          ? "전체 일정 혼잡도: 보통"
          : null;

  const bottomLiveKo = anchor
    ? `Live Status: ${anchor} 주변 · ${comfortKo({
        prepLine,
        tempC: effectiveTemp,
        rainyWorld: rainWorld,
      })}`
    : stops >= 2
      ? `Live Status: 동선 ${stops}곳 · ${comfortKo({
          prepLine,
          tempC: effectiveTemp,
          rainyWorld: rainWorld,
        })}`
      : null;

  const suggestRainRevise =
    (rainWorld || looksRainy(prepLine) || Boolean(input.tripDraftReady && stops >= 3)) &&
    stops >= 2;

  const opportunityTitleKo = suggestRainRevise
    ? "비 예보. 실내 쿠로몬 코스로 바꿀까요?"
    : null;

  return {
    topWeatherKo,
    congestionKo,
    bottomLiveKo,
    suggestRainRevise,
    suggestQuietRoute: stops >= 3 && !suggestRainRevise,
    opportunityTitleKo,
  };
}
