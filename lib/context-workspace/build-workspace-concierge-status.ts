/**
 * Thin concierge status for Workspace map — no analytics wall.
 */

export type WorkspaceConciergeStatus = {
  readonly topWeatherKo: string | null;
  readonly bottomLiveKo: string | null;
  readonly suggestRainRevise: boolean;
  readonly suggestQuietRoute: boolean;
};

function looksRainy(prepLine: string | null | undefined): boolean {
  const t = prepLine?.trim() ?? "";
  return /비|소나기|rain|shower|storm|우산/iu.test(t);
}

function comfortKo(input: {
  readonly prepLine: string | null;
  readonly tempC: number | null;
}): string {
  if (looksRainy(input.prepLine)) return "비 소식 · 실내 동선 추천";
  if (input.tempC != null && input.tempC >= 30) return "더운 편 · 그늘·실내 여유";
  if (input.tempC != null && input.tempC <= 5) return "쌀쌀함 · 실내 위주 추천";
  return "주변 쾌적";
}

export function buildWorkspaceConciergeStatus(input: {
  readonly anchorTitle?: string | null;
  readonly tempC?: number | null;
  readonly prepLine?: string | null;
  readonly routeStopCount?: number;
}): WorkspaceConciergeStatus {
  const tempC = input.tempC ?? null;
  const prepLine = input.prepLine?.trim() || null;
  const anchor = input.anchorTitle?.trim() || null;
  const stops = input.routeStopCount ?? 0;

  const topWeatherKo =
    tempC != null
      ? `${Math.round(tempC)}°C${prepLine ? ` · ${prepLine}` : ""}`
      : prepLine;

  const bottomLiveKo = anchor
    ? `${anchor} 주변 · ${comfortKo({ prepLine, tempC })}`
    : stops >= 2
      ? `동선 ${stops}곳 · ${comfortKo({ prepLine, tempC })}`
      : null;

  return {
    topWeatherKo,
    bottomLiveKo,
    suggestRainRevise: looksRainy(prepLine) && stops >= 2,
    suggestQuietRoute: stops >= 3 && !looksRainy(prepLine),
  };
}
