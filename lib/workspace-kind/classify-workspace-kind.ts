/**
 * NL → WorkspaceKind (deterministic). Globe AI gate: which workspace to prepare.
 * Fail closed → null (do not invent a kind).
 * Travel includes dest+work (호텔/맛집) so Globe never waits for 「작업장 열기」.
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

const MARKET_BUY_SIGNAL =
  /(?:삽니다|구합니다|구해|구함|구하기|구매|구입|찾아요|찾습니다|사고\s*싶|살만|사줄|wanted)/iu;
const MARKET_SELL_SIGNAL =
  /(?:팔(?:고|아|래|아요)?|팝니다|판매|나눔|양도|내놓|sell)/iu;

/** Driver / daeri / ride-hail work cues. */
export function isDriverWorkspaceUtterance(text: string): boolean {
  const t = normalize(text);
  if (!t) {
    return false;
  }
  return (
    /대리\s*(?:기\s*)?(?:사|뛰|할|가|출|시작)|대리\s*뛰|콜\s*받|호출\s*받|드라이버\s*모드|daeri|ride\s*hail/iu.test(
      t,
    ) || /오늘\s*대리|밤에\s*대리|대리\s*갈게/iu.test(t)
  );
}

/** Marketplace / used-goods Context cues (same OS as travel — ADR-032). */
export function isUsedGoodsWorkspaceUtterance(text: string): boolean {
  const t = normalize(text);
  if (!t) {
    return false;
  }
  if (isDriverWorkspaceUtterance(t)) {
    return false;
  }
  return isMarketComposeInput(t) || isBareMarketComposeInput(t);
}

/** sell = listing · buy = seeking */
export function classifyMarketWorkspaceRole(
  utterance: string,
): "sell" | "buy" {
  const t = normalize(utterance);
  if (MARKET_BUY_SIGNAL.test(t) && !MARKET_SELL_SIGNAL.test(t)) {
    return "buy";
  }
  if (MARKET_SELL_SIGNAL.test(t)) {
    return "sell";
  }
  if (MARKET_BUY_SIGNAL.test(t)) {
    return "buy";
  }
  return "sell";
}

/** Travel / trip frame cues (destination or trip length). */
export function isTravelWorkspaceUtterance(text: string): boolean {
  const t = normalize(text);
  if (!t) {
    return false;
  }
  if (isDriverWorkspaceUtterance(t) || isUsedGoodsWorkspaceUtterance(t)) {
    return false;
  }
  if (
    /(?:여행|트립|trip|휴가|출장).*(?:갈|가|잡|만들|계획|준비)|(?:갈|가)\s*(?:거야|게|자|려고).*(?:여행|트립)|여행\s*(?:갈|가|준비|계획)/iu.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\d{1,2}\s*박\s*\d{1,2}\s*일|\d{1,2}\s*박|\d{1,2}\s*일\s*(?:여행|일정)/iu.test(
      t,
    )
  ) {
    return true;
  }
  // Dest + go (any overseas/domestic place) — 「하와이로 간다」「오사카 가요」.
  const dest = extractTravelDestination(t);
  if (
    dest &&
    /(?:갈(?:게|래|까|자)?|간(?:다|다요|다구요|다고)?|가(?:자|서|요)?|여행|트립|출장)/iu.test(
      t,
    )
  ) {
    return true;
  }
  // Dest + domain work — 「오사카 호텔 찾아줘」「제주 렌터카」auto-open Travel.
  if (
    dest &&
    /(?:호텔|숙소|맛집|식당|카페|렌터\s*카?|렌트|관광|놀거리|티켓|온천|일정|추천|찾아|보여|검색)/iu.test(
      t,
    )
  ) {
    return true;
  }
  // Lodging / eatery find alone — soft Travel (Destination filled from context later).
  if (
    /(?:호텔|숙소).*(?:찾아|보여|검색|추천)|(?:찾아|보여|검색|추천).*(?:호텔|숙소)/iu.test(
      t,
    ) ||
    /(?:맛집|식당|카페).*(?:찾아|보여|검색|추천)|(?:찾아|보여|검색|추천).*(?:맛집|식당|카페)/iu.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Decide which prepared Workspace to open.
 * Driver → used_goods → travel when cues compete.
 */
export function classifyWorkspaceKind(
  utterance: string,
): WorkspaceKind | null {
  const text = normalize(utterance);
  if (!text) {
    return null;
  }
  if (isDriverWorkspaceUtterance(text)) {
    return "driver";
  }
  if (isUsedGoodsWorkspaceUtterance(text)) {
    return "used_goods";
  }
  if (isTravelWorkspaceUtterance(text)) {
    return "travel";
  }
  return null;
}
