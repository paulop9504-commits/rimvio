import {
  estimatePlaceTravelMinutes,
  formatArrivalClock,
} from "@/lib/context-resolver/places/estimate-place-arrival";
import { copy } from "@/lib/copy/human-ko";

const STALE_TRAVEL_PATTERN = /(\d+)분 거리 · [^,·]+ 도착 예상/u;

/** Local device clock — deep night retail copy should not claim "open now". */
export function isDeepLocalNight(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 22 || hour < 6;
}

export function resolveLiveOpenNowLabel(
  openNow: boolean | null | undefined,
  now: Date,
): string | null {
  if (openNow == null) {
    return null;
  }
  if (!openNow) {
    return copy.globe.feedEntityClosedNow;
  }
  if (isDeepLocalNight(now)) {
    return copy.globe.feedEntityHoursCheck;
  }
  return copy.globe.feedEntityOpenNow;
}

function replaceOpenNowPhrase(text: string, label: string | null): string {
  if (!label) {
    return text
      .replace(/,? ?지금 영업 중/u, "")
      .replace(/,? ?영업 종료/u, "")
      .replace(/,? ?영업 시간 확인/u, "")
      .trim()
      .replace(/^,\s*/u, "")
      .replace(/,\s*$/u, "");
  }
  if (/지금 영업 중|영업 종료|영업 시간 확인/u.test(text)) {
    return text
      .replace(/지금 영업 중/u, label)
      .replace(/영업 종료/u, label)
      .replace(/영업 시간 확인/u, label);
  }
  return text.includes(label) ? text : [label, text].filter(Boolean).join(", ");
}

export function refreshLivePlaceReasonKo(input: {
  reasonKo: string;
  openNow?: boolean | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
  placeLat?: number | null;
  placeLng?: number | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  let reason = input.reasonKo.trim();
  if (!reason) {
    return reason;
  }

  const openLabel = resolveLiveOpenNowLabel(input.openNow, now);
  reason = replaceOpenNowPhrase(reason, openLabel);

  let travelMinutes: number | null = null;
  const staleMatch = reason.match(STALE_TRAVEL_PATTERN);
  if (staleMatch) {
    travelMinutes = Number(staleMatch[1]);
  }
  if (
    travelMinutes == null &&
    input.viewerLat != null &&
    input.viewerLng != null &&
    input.placeLat != null &&
    input.placeLng != null
  ) {
    travelMinutes = estimatePlaceTravelMinutes({
      from: { lat: input.viewerLat, lng: input.viewerLng },
      to: { lat: input.placeLat, lng: input.placeLng },
    });
  }

  if (travelMinutes != null && Number.isFinite(travelMinutes)) {
    const arriveClock = formatArrivalClock(travelMinutes, now);
    const travelLine = `${travelMinutes}분 거리 · ${arriveClock} 도착 예상`;
    if (STALE_TRAVEL_PATTERN.test(reason)) {
      reason = reason.replace(STALE_TRAVEL_PATTERN, travelLine);
    } else {
      reason = reason ? `${reason}, ${travelLine}` : travelLine;
    }
  }

  return reason.replace(/,\s*,/g, ",").replace(/^,\s*/u, "").trim();
}

export function refreshLivePlaceMetaLine(input: {
  metaLine: string | null | undefined;
  openNow?: boolean | null;
  now?: Date;
}): string | null {
  const meta = input.metaLine?.trim();
  if (!meta) {
    return null;
  }
  const now = input.now ?? new Date();
  const openLabel = resolveLiveOpenNowLabel(input.openNow, now);
  if (!openLabel) {
    return meta.replace(/ · 영업 중/u, "").replace(/ · 영업 종료/u, "").replace(/ · 영업 시간 확인/u, "");
  }
  if (/ · 영업 중/u.test(meta) || / · 영업 종료/u.test(meta) || / · 영업 시간 확인/u.test(meta)) {
    return meta
      .replace(/ · 영업 중/u, ` · ${openLabel}`)
      .replace(/ · 영업 종료/u, ` · ${openLabel}`)
      .replace(/ · 영업 시간 확인/u, ` · ${openLabel}`);
  }
  if (openLabel === copy.globe.feedEntityOpenNow && isDeepLocalNight(now)) {
    return `${meta} · ${copy.globe.feedEntityHoursCheck}`;
  }
  return meta;
}
