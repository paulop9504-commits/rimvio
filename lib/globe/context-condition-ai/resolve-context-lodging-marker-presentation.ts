import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";

export type ContextLodgingMarkerPresentationVariant =
  | "price_pill"
  | "preview_chip"
  | "reason_chip";

/** What should pop first on the map — not arbitrary rotation. */
export type LodgingMapCue = "price" | "looks" | "near" | "people" | "fit";

const SWEET_PRICE_KRW = 85_000;

function formatMapPriceLabel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}/박`;
}

function shortenForMap(text: string, max = 22): string {
  const trimmed = text.trim().replace(/\s+/gu, " ");
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function reasonBlob(reasonKo: string, matchReasons?: readonly string[]): string {
  return [reasonKo.trim(), ...(matchReasons ?? []).map((row) => row.trim())]
    .filter(Boolean)
    .join(" ");
}

function isPriceCue(text: string): boolean {
  return /싸|가격|가성비|저렴|할인|박당|부담 없|budget|cheap|price/i.test(text);
}

function isVisualCue(text: string): boolean {
  return /뷰|전망|예쁘|이쁘|깔끔|인테리어|사진|분위기|감성|조용|아늑|루프탑|오션|야경|모던|호캉스|view|photo|interior/i.test(
    text,
  );
}

function isNearCue(text: string): boolean {
  return /가까|도보|역|거리|근처|이동 부담|걸어|분 거리|within reach|near/i.test(text);
}

function isPeopleCue(text: string): boolean {
  return /다녀간|친구|패턴|여행 맥락|people/i.test(text);
}

function isSweetPrice(priceKrw: number | null | undefined): boolean {
  return priceKrw != null && Number.isFinite(priceKrw) && priceKrw <= SWEET_PRICE_KRW;
}

function hasUsableThumbnail(thumbnailUrl: string | null | undefined): boolean {
  return Boolean(thumbnailUrl?.trim());
}

export function resolveLodgingMapCue(input: {
  reasonKo?: string | null;
  matchReasons?: readonly string[];
  priceKrw?: number | null;
  distanceKm?: number | null;
  rankIndex: number;
}): LodgingMapCue {
  const blob = reasonBlob(input.reasonKo?.trim() ?? "", input.matchReasons);

  if (isPeopleCue(blob)) {
    return "people";
  }
  if (isNearCue(blob) || (input.distanceKm != null && input.distanceKm <= 2)) {
    return "near";
  }
  if (isVisualCue(blob)) {
    return "looks";
  }
  if (isPriceCue(blob) || isSweetPrice(input.priceKrw)) {
    return "price";
  }
  if (
    !blob &&
    input.priceKrw != null &&
    Number.isFinite(input.priceKrw)
  ) {
    return "price";
  }
  if (input.rankIndex === 0) {
    return "fit";
  }
  return "fit";
}

function extractVisualHook(reason: string): string | null {
  const trimmed = reason.trim();
  const patterns = [
    /(야경[^,.·]{0,8})/u,
    /(오션[^,.·]{0,8})/u,
    /(루프탑[^,.·]{0,8})/u,
    /(전망[^,.·]{0,8})/u,
    /(인테리어[^,.·]{0,8})/u,
    /(분위기[^,.·]{0,8})/u,
    /(조용[^,.·]{0,6})/u,
    /(깔끔[^,.·]{0,6})/u,
    /(예쁜[^,.·]{0,8})/u,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return shortenForMap(match[1], 14);
    }
  }
  return null;
}

function extractPeopleHook(reason: string): string | null {
  const match = reason.match(/(.{1,8}?)\s*다녀간/u);
  if (match?.[1]) {
    return shortenForMap(`${match[1].trim()} 다녀간 곳`, 18);
  }
  if (/여행 맥락/u.test(reason)) {
    return "여행 맥락과 맞아요";
  }
  return null;
}

function extractNearHook(
  reason: string,
  distanceKm: number | null | undefined,
): string | null {
  const walkMatch = reason.match(/(도보\s*\d+\s*분|걸어\s*\d+\s*분)/u);
  if (walkMatch?.[1]) {
    return shortenForMap(walkMatch[1], 16);
  }
  if (distanceKm != null && distanceKm <= 0.8) {
    return "여기서 가까워요";
  }
  if (distanceKm != null && distanceKm <= 2) {
    return "걸어갈 만해요";
  }
  if (/가까/u.test(reason)) {
    return "여기서 가까워요";
  }
  if (/이동 부담/u.test(reason)) {
    return "이동 부담 적어요";
  }
  return null;
}

function extractPriceHint(reason: string): string | null {
  if (/가성비/u.test(reason)) {
    return "가성비";
  }
  if (/부담 없/u.test(reason)) {
    return "부담 없는 가격";
  }
  if (/저렴|싸/u.test(reason)) {
    return "저렴해요";
  }
  return null;
}

/** One scannable line for map chips — tuned for glance, not card copy. */
export function composeLodgingMapHintLine(input: {
  cue: LodgingMapCue;
  reasonKo?: string | null;
  matchReasons?: readonly string[];
  distanceKm?: number | null;
  rankIndex: number;
}): string {
  const primary =
    input.reasonKo?.trim() ||
    input.matchReasons?.find((row) => row.trim())?.trim() ||
    "";

  switch (input.cue) {
    case "looks":
      return (
        extractVisualHook(primary) ||
        shortenForMap(primary.replace(/호텔|숙소/gu, "").trim()) ||
        "사진으로 보기 좋아요"
      );
    case "near":
      return (
        extractNearHook(primary, input.distanceKm) ||
        shortenForMap(primary) ||
        "가까워요"
      );
    case "people":
      return extractPeopleHook(primary) || shortenForMap(primary) || "아는 분이 다녀갔어요";
    case "price":
      return extractPriceHint(primary) || "";
    case "fit":
      if (input.rankIndex === 0) {
        return shortenForMap(primary) || "맥락 1순위";
      }
      return shortenForMap(primary) || "맥락에 맞아요";
    default:
      return shortenForMap(primary);
  }
}

/** Scout map pin — price · preview thumb · reason line (context-led, mixed OK). */
export function resolveContextLodgingMarkerPresentation(input: {
  reasonKo?: string | null;
  matchReasons?: readonly string[];
  priceKrw?: number | null;
  thumbnailUrl?: string | null;
  distanceKm?: number | null;
  rankIndex: number;
}): Pick<
  GlobeLodgingMapMarker,
  "displayVariant" | "mapHintLine" | "discoveryPriceLabel"
> {
  const priceLabel = formatMapPriceLabel(input.priceKrw);
  const hasThumb = hasUsableThumbnail(input.thumbnailUrl);
  const cue = resolveLodgingMapCue(input);
  const mapHintLine = composeLodgingMapHintLine({
    cue,
    reasonKo: input.reasonKo,
    matchReasons: input.matchReasons,
    distanceKm: input.distanceKm,
    rankIndex: input.rankIndex,
  });

  if (cue === "price" && priceLabel) {
    return {
      displayVariant: "price_pill",
      mapHintLine: mapHintLine || null,
      discoveryPriceLabel: priceLabel,
    };
  }

  if (cue === "looks" && hasThumb) {
    return {
      displayVariant: "preview_chip",
      mapHintLine: mapHintLine,
      discoveryPriceLabel: priceLabel,
    };
  }

  if (cue === "people" && hasThumb) {
    return {
      displayVariant: "preview_chip",
      mapHintLine: mapHintLine,
      discoveryPriceLabel: priceLabel,
    };
  }

  if (cue === "fit" && input.rankIndex === 0 && hasThumb) {
    return {
      displayVariant: "preview_chip",
      mapHintLine: mapHintLine,
      discoveryPriceLabel: priceLabel,
    };
  }

  if (cue === "near" || cue === "people" || cue === "fit") {
    return {
      displayVariant: "reason_chip",
      mapHintLine: mapHintLine || priceLabel || "",
      discoveryPriceLabel: priceLabel,
    };
  }

  if (hasThumb && mapHintLine) {
    return {
      displayVariant: "preview_chip",
      mapHintLine,
      discoveryPriceLabel: priceLabel,
    };
  }

  if (priceLabel) {
    return {
      displayVariant: "price_pill",
      mapHintLine: mapHintLine || priceLabel,
      discoveryPriceLabel: priceLabel,
    };
  }

  return {
    displayVariant: "reason_chip",
    mapHintLine: mapHintLine || "맥락에 맞아요",
    discoveryPriceLabel: priceLabel,
  };
}
