/**
 * Intent Grammar classifier — deterministic Korean cues (no LLM).
 */

import type { IntentFamily } from "@/lib/rule-engine/constitution";
import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import { isTripReviseUtterance } from "@/lib/intent-engine/is-trip-revise-utterance";
import {
  isLodgingStayReviseUtterance,
  isRelativeLodgingStayReviseUtterance,
} from "@/lib/globe/context-hub/parse-lodging-stay-revise";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

/** Noun-heavy domain utterance without 찾/추천 — still Search. */
function isDomainNounSearch(text: string): boolean {
  if (hasLodgingDomainCue(text) || hasEateryDomainCue(text)) {
    return true;
  }
  if (isAmenityLookupQuery(text)) {
    return true;
  }
  if (/약\s*사러|사러\s*갈|약\s*사러\s*가/iu.test(text)) {
    return true;
  }
  if (
    /(?:어디야|어디\s*있|어디에|어디\s*가)/iu.test(text) &&
    (hasLodgingDomainCue(text) ||
      hasEateryDomainCue(text) ||
      isAmenityLookupQuery(text))
  ) {
    return true;
  }
  return false;
}

/** Bare stay-length revise — 「2박으로」 (not 「2박 호텔 찾아줘」). */
function isBareStayLengthRevise(text: string): boolean {
  if (/(?:찾|추천|보여|알려|주변|근처|search|find)/iu.test(text)) {
    return false;
  }
  return (
    /^\d{1,2}\s*박(?:\s*\d{1,2}\s*일)?(?:\s*(?:로|으로))?$/u.test(text) ||
    /^\d{1,2}\s*박(?:\s*\d{1,2}\s*일)?\s*(?:로|으로)\s*(?:해|바꿔?|갈게|가자)?$/u.test(
      text,
    )
  );
}

/**
 * First-pass Intent family. One family only — compound plans use Action Planner.
 */
export function classifyIntentFamily(utterance: string): IntentFamily {
  const text = normalize(utterance);
  if (!text) {
    return "Unknown";
  }

  if (
    /(?:시뮬레이션|시뮬(?:해|레이션)?|만약|(?:이|하)라면|면\s*어때|이면\s*어때)/iu.test(
      text,
    )
  ) {
    return "Simulate";
  }
  if (
    /(?:어느\s*게|뭐가\s*더|어때|분석|analyze|그냥\s*해|골라)/iu.test(text) &&
    /비교|vs|이랑|랑/iu.test(text) === false &&
    /예약|예매|고정|삭제|빼|지워/iu.test(text) === false
  ) {
    if (/어때|분석|그냥\s*해|골라|고르/iu.test(text)) {
      return "Analyze";
    }
  }
  if (/비교|compare|vs/iu.test(text)) {
    return "Compare";
  }
  if (/(?:결제|구매|purchase|pay)/iu.test(text)) {
    return "Purchase";
  }
  if (
    /(?:예약\s*준비|예약해|예약할게|예약할래|예매|잡아(?:줘|요|주세요)?|부킹|reserve|이걸로\s*예약|첫\s*(?:번\s*)?째\s*예약|(?:두|세)\s*(?:번\s*)?째\s*예약)/iu.test(
      text,
    )
  ) {
    return "Reserve";
  }
  if (
    /(?:삭제|지워(?:버려)?|없애|빼\s*줘|빼줘|제거|빼\s*버려|지워버려)/iu.test(
      text,
    )
  ) {
    return "Delete";
  }
  // Project edit — absolute/relative stay · guests · trip revise (before Search / Filter).
  if (
    isBareStayLengthRevise(text) ||
    isRelativeLodgingStayReviseUtterance(text) ||
    isTripReviseUtterance(text) ||
    (isLodgingStayReviseUtterance(text) &&
      (/(\d{1,2})\s*박/u.test(text) ||
        /(?:인원|게스트|어른|성인)\s*\d{1,2}|\d{1,2}\s*명/u.test(text) ||
        /아이랑|애랑|아이와|키즈|어린이\s*랑|스위트|suite|패밀리\s*룸/iu.test(
          text,
        )))
  ) {
    return "Revise";
  }
  if (/(?:묶어|그룹|ungroup|풀어)/iu.test(text)) {
    return /풀어|ungroup|그룹\s*해제/iu.test(text) ? "Ungroup" : "Group";
  }
  // ADR-028 Context Command (migrate/clone) — not graph Move of selected places.
  if (
    /맥락으로\s*옮겨|옮겨(?:줘|요|주세요)?/iu.test(text) &&
    !classifyContextCommand(text)
  ) {
    return "Move";
  }
  if (/(?:메모|적어(?:줘|요|주세요)?|메모해)/iu.test(text)) {
    return "Note";
  }
  if (
    /(?:빨간|파란|초록|주황).*(?:표시|보여)|하이라이트|highlight/iu.test(text)
  ) {
    return "Highlight";
  }
  if (/항상\s*보여|숨겨|visibility/iu.test(text)) {
    return "Highlight";
  }
  if (/공유해|share|공유\s*하자|카톡으로|링크로\s*(?:보내|공유)/iu.test(text)) {
    return "Share";
  }
  if (
    /걸어서\s*\d+\s*분|예약\s*가능|현지인|가격\s*순|평점\s*순|가까운\s*순|싼\s*것만|더\s*싸게|싸게|저렴|필터|filter|만\s*(?:보여|남겨|남기)/iu.test(
      text,
    )
  ) {
    return "Filter";
  }
  if (
    /(?:고정해(?:줘|요|주세요)?|고정\s*해|고정(?:\s|$)|핀\s*해|핀해|핀\s*찍어|핀\s*고정|pin\b|글로브에\s*(?:고정|올려))/iu.test(
      text,
    )
  ) {
    return "Pin";
  }
  if (
    /(?:길\s*찾|내비|navigate|가는\s*길|가는\s*방법|지도로\s*가|길\s*알려|택시로|지하철로|도보로\s*가)/iu.test(
      text,
    )
  ) {
    return "Navigate";
  }
  if (
    /(?:캘린더|일정\s*(?:넣|추가)|일정에\s*넣|calendar|스케줄에\s*넣)/iu.test(
      text,
    )
  ) {
    return "Calendar";
  }
  if (/(?:예측|predict)/iu.test(text)) {
    return "Predict";
  }
  if (
    /(?:찾|추천|보여|알려|골라|주변|근처|near|around|search|find)/iu.test(text)
  ) {
    return "Search";
  }
  // Domain noun alone — 「오사카 캡슐호텔」「맛집」「편의점 어디야」
  if (isDomainNounSearch(text)) {
    return "Search";
  }
  if (/(?:만들|생성|create)/iu.test(text)) {
    return "Create";
  }

  return "Unknown";
}
