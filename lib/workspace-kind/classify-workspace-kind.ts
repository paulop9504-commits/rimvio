/**
 * NL → WorkspaceKind (deterministic). Globe AI gate: which workspace to prepare.
 * Fail closed → null (do not invent a kind).
 */

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
  // City + go (light trip frame) — Osaka / Jeju style.
  if (
    /(?:오사카|도쿄|후쿠오카|교토|나고야|삿포로|제주|부산|서울|파리|뉴욕|방콕|다낭|타이베이).{0,12}(?:갈|가|여행|트립)/iu.test(
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
