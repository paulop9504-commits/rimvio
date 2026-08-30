/**
 * Globe / Hub classifier — software Experience vs travel Context.
 * 「오사카 호텔 찾아줘」 stays on Globe. 「호텔 예약 플랫폼 만들어줘」 opens Hub.
 */

const SOFTWARE_CUE =
  /플랫폼|platform|쇼핑몰|saas|마켓플레이스|marketplace|웹사이트|website|웹앱|web\s*app|배달\s*(?:앱|플랫폼|서비스)|중고거래|커머스|commerce|커뮤니티|community|대시보드|dashboard|포트폴리오|portfolio|레스토랑\s*(?:앱|플랫폼)|교육\s*(?:플랫폼|앱)|온라인\s*(?:몰|샵|숍)|booking\s*platform/i;

const CREATE_CUE = /만들|생성|build|create|만들어/i;

const TRAVEL_SEARCH_ONLY =
  /(?:찾|추천|보여|알려|주변|근처|search|find)/i;

export function wantsExperienceOsCreate(utterance: string): boolean {
  const t = utterance.trim();
  if (!t) return false;
  if (!CREATE_CUE.test(t)) return false;
  if (SOFTWARE_CUE.test(t)) return true;
  if (TRAVEL_SEARCH_ONLY.test(t) && !/플랫폼|platform|서비스/.test(t)) {
    return false;
  }
  return false;
}

export function hubCreateHrefFromIdea(idea: string): string {
  const trimmed = idea.trim();
  return `/hub/create?idea=${encodeURIComponent(trimmed)}`;
}
