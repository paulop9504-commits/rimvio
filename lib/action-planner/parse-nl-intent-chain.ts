/**
 * Deterministic multi-intent atom parser — contrast (말고) + conjunction +
 * multi-domain trip spine (숙소·맛집·동선) for complex Korean NL.
 * Reject atoms are preserved (not stripped).
 */

import type {
  IntentAtom,
  IntentAtomFamily,
  ParsedNlIntentChain,
} from "@/lib/action-planner/intent-atom-types";
import { hasConcurrentMultiDomainSearchCues } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { parseOrdinalIndex } from "@/lib/graph-command/resolve-selection-ref";
import type { IntentFamily } from "@/lib/rule-engine/constitution";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

/** Route / itinerary — must beat Reserve's 「잡아」. */
function isRouteOptimizeCue(cue: string): boolean {
  return /동선|루트|일정\s*(?:최적화|짜|잡아)|optimize\s*route|길\s*(?:잡|짜|최적화)|내비(?:로)?\s*(?:가|열어)|가는\s*길/iu.test(
    cue,
  );
}

function isKeepReplacePatchCue(cue: string): boolean {
  return (
    /(?:숙소|호텔).*(?:그대로|유지|안\s*바꿔|빼고)|(?:맛집|식당).*(?:바꿔|교체|다시)|(?:맛집|식당)만|(?:숙소|호텔)만/iu.test(
      cue,
    ) || /그대로\s*두(?:고|고서)?\s*.*(?:바꿔|교체)/iu.test(cue)
  );
}

function familyFromCue(cue: string): IntentAtomFamily | null {
  const t = cue.trim();
  if (!t) {
    return null;
  }
  // Route before Reserve — 「동선 잡아」 must not become Reserve.
  if (isRouteOptimizeCue(t)) {
    return "Navigate";
  }
  if (
    /그거|이거|저거|그것|이것|저것|첫\s*(?:번\s*)?째|두\s*(?:번\s*)?째|세\s*(?:번\s*)?째|\d+\s*번/iu.test(
      t,
    ) &&
    !/예약|결제|길|공유|찾|삭제|옮겨|필터|싸게|넣고|추가/iu.test(t)
  ) {
    return "Select";
  }
  if (/결제|구매|pay|purchase/iu.test(t)) {
    return "Purchase";
  }
  if (/예약|예매|부킹|reserve/iu.test(t) && !isRouteOptimizeCue(t)) {
    return "Reserve";
  }
  // Bare 「잡아」 without route → Reserve only when booking-ish.
  if (/잡아/iu.test(t) && /예약|방|자리|표|티켓/iu.test(t)) {
    return "Reserve";
  }
  if (/공유|카톡|링크로|share/iu.test(t)) {
    return "Share";
  }
  if (/길|내비|지도|택시|지하철|도보|navigate/iu.test(t)) {
    return "Navigate";
  }
  if (/옮겨|맥락으로/iu.test(t)) {
    return "Move";
  }
  if (/싸게|필터|걸러|남기|가성비|filter/iu.test(t) && !/찾|검색|넣고|추가/iu.test(t)) {
    return "Filter";
  }
  if (/비교|compare|vs/iu.test(t)) {
    return "Compare";
  }
  if (
    /찾|검색|추천|보여|search|find|넣고|추가해|추가\s*해|넣어\s*줘|넣어줘/iu.test(t) ||
    isKeepReplacePatchCue(t)
  ) {
    return "Search";
  }
  if (/삭제|지워|빼|없애/iu.test(t)) {
    return "Delete";
  }
  if (/메모|적어/iu.test(t)) {
    return "Note";
  }
  if (/만들|생성|create/iu.test(t)) {
    return "Create";
  }
  if (parseOrdinalIndex(t) != null) {
    return "Select";
  }
  // Domain noun alone in a chain fragment → Search.
  if (
    hasLodgingDomainCue(t) ||
    hasEateryDomainCue(t) ||
    isAmenityLookupQuery(t) ||
    /놀거리|명소|관광|poi/iu.test(t)
  ) {
    return "Search";
  }
  return null;
}

function selectionFromCue(cue: string): IntentAtom["selection"] {
  const ordinal = parseOrdinalIndex(cue);
  const deictic = /그거|이거|저거|그것|이것|저것/iu.test(cue);
  if (ordinal == null && !deictic) {
    return undefined;
  }
  return {
    ordinal: ordinal,
    deictic: deictic || undefined,
  };
}

function expandNavigateCue(cue: string): string {
  const t = cue.trim();
  if (/^길만$/iu.test(t) || /^길$/iu.test(t)) {
    return "길 찾아";
  }
  if (/길만/iu.test(t) && !/찾|내비/iu.test(t)) {
    return t.replace(/길만/iu, "길 찾아");
  }
  if (
    isRouteOptimizeCue(t) &&
    !/찾|최적화|열어|잡아/iu.test(t)
  ) {
    return `${t} 최적화해줘`;
  }
  return t;
}

function atom(
  family: IntentAtomFamily,
  polarity: IntentAtom["polarity"],
  cueSpan: string,
  order: number,
): IntentAtom {
  const cue =
    polarity === "do" && family === "Navigate"
      ? expandNavigateCue(cueSpan)
      : cueSpan.trim();
  return {
    family,
    polarity,
    cueSpan: cue,
    selection: selectionFromCue(cue),
    order,
  };
}

/**
 * Split complex Korean conjunctions — 하고 / 그리고 / 넣고 / 도 / 서.
 */
function splitConjunction(text: string): string[] {
  const parts = text
    .split(
      /\s*(?:하고\s+|그리고\s+|,\s*|\s+다음에\s+|\s+후에\s+|\s*넣은\s*다음\s*|\s*넣은\s*뒤\s*)/u,
    )
    .map((p) => p.trim())
    .filter((p) => p.length >= 1);
  if (parts.length <= 1) {
    const seo = text.split(
      /(?<=(?:찾아|검색해|비교해|옮겨|필터해|남겨|넣어|넣고|추가해))\s*서\s+/u,
    );
    if (seo.length > 1) {
      return seo.map((p) => p.trim()).filter(Boolean);
    }
  }
  // 「A 찾고 B도 넣고 C 잡아」 — domain/action boundaries.
  if (parts.length <= 1) {
    const multi = text.split(
      /(?<=(?:찾아(?:줘|요|주세요)?|검색해(?:줘)?|넣어(?:줘)?|넣고|추가해(?:줘)?))\s*(?=(?:근처\s*)?(?:맛집|식당|카페|호텔|숙소|놀거리|명소|동선|루트|일정))/u,
    );
    if (multi.length > 1) {
      return multi.map((p) => p.trim()).filter(Boolean);
    }
  }
  // 「맛집도 넣고」「동선도 잡아」 mid-clause.
  if (parts.length <= 1) {
    const also = text.split(
      /\s+(?=(?:근처\s*)?(?:맛집|식당|카페|호텔|숙소|놀거리|명소|동선|루트|일정)(?:도|만)?\s*(?:넣|찾|잡|짜|추가|추천|보여|최적화))/u,
    );
    if (also.length > 1) {
      return also.map((p) => p.trim()).filter(Boolean);
    }
  }
  return parts.length > 0 ? parts : [text];
}

function parseContrast(text: string): IntentAtom[] | null {
  const m = text.match(
    /^(?:아니(?:요|야|오)?\s*)?(?:(.+?)\s+)?말고\s+(.+)$/iu,
  );
  if (!m?.[2]?.trim()) {
    return null;
  }
  let rejectedRaw = (m[1] ?? "").trim();
  const keptRaw = m[2].trim();
  if (!rejectedRaw) {
    return null;
  }

  rejectedRaw = rejectedRaw.replace(/(?:은|는|을|를|이|가)$/u, "").trim();
  const rejectFamily =
    familyFromCue(rejectedRaw) ?? familyFromCue(`${rejectedRaw} 예약`);
  const keepCue = expandNavigateCue(keptRaw);
  const keepFamily = familyFromCue(keepCue) ?? "Select";

  const atoms: IntentAtom[] = [];
  if (rejectFamily) {
    atoms.push(atom(rejectFamily, "reject", rejectedRaw, 0));
  }
  atoms.push(atom(keepFamily, "do", keepCue, 1));
  return atoms;
}

function expandCompoundFragment(part: string): string[] {
  const t = part.trim();
  if (/찾아|검색/iu.test(t) && /결제|구매/iu.test(t)) {
    return ["숙소 찾아줘", "결제해"];
  }
  if (/찾아|검색/iu.test(t) && /예약/iu.test(t) && !isRouteOptimizeCue(t)) {
    return ["숙소 찾아줘", "예약해"];
  }
  if (/옮겨/iu.test(t) && /공유/iu.test(t)) {
    return ["옮겨줘", "공유해"];
  }
  if (/비교/iu.test(t) && /싸게|필터|남기/iu.test(t)) {
    return ["비교해 봐", "싸게만"];
  }
  if (/싸게|필터|남기/iu.test(t) && /길|내비|동선/iu.test(t)) {
    return ["싸게만", "길 찾아"];
  }
  // Keep lodging · replace eatery in one fragment.
  if (isKeepReplacePatchCue(t)) {
    if (
      /숙소|호텔/iu.test(t) &&
      /그대로|유지|안\s*바꿔|빼고|두/iu.test(t) &&
      /맛집|식당/iu.test(t)
    ) {
      return ["맛집 찾아줘"];
    }
    if (
      /맛집|식당/iu.test(t) &&
      /그대로|유지/iu.test(t) &&
      /숙소|호텔/iu.test(t)
    ) {
      return ["숙소 찾아줘"];
    }
  }
  const seo = t.split(
    /(?<=(?:찾아|검색해|비교해|옮겨|필터해|남겨|넣어|넣고|추가해))\s*서\s+/u,
  );
  if (seo.length > 1) {
    return seo.map((p) => p.trim()).filter(Boolean);
  }
  return [t];
}

/**
 * When one blob still names 2+ discovery domains (+ optional route),
 * explode into ordered Search atoms + Navigate.
 */
function explodeMultiDomainBlob(text: string): IntentAtom[] | null {
  const t = normalize(text);
  if (!t) {
    return null;
  }
  const wantsRoute = isRouteOptimizeCue(t);
  const lodging = hasLodgingDomainCue(t);
  const eatery =
    hasEateryDomainCue(t) ||
    /맛집|식당|카페|restaurant/iu.test(t);
  const amenity = isAmenityLookupQuery(t);
  const poi = /놀거리|명소|관광|테마\s*파크|액티비티|poi/iu.test(t);
  const domainCount =
    Number(lodging) + Number(eatery) + Number(amenity) + Number(poi);

  if (domainCount < 2 && !(domainCount >= 1 && wantsRoute && /찾|검색|넣고|추가|추천/iu.test(t))) {
    if (!hasConcurrentMultiDomainSearchCues(t) && !wantsRoute) {
      return null;
    }
  }
  if (domainCount < 1) {
    return null;
  }
  // Need multi signal: 2 domains, or 1 domain + route with search verb, or concurrent helper.
  const multi =
    domainCount >= 2 ||
    (domainCount >= 1 && wantsRoute) ||
    hasConcurrentMultiDomainSearchCues(t);
  if (!multi) {
    return null;
  }

  const atoms: IntentAtom[] = [];
  let order = 0;
  if (lodging) {
    atoms.push(atom("Search", "do", "숙소 찾아줘", order++));
  }
  if (eatery) {
    atoms.push(atom("Search", "do", "맛집 찾아줘", order++));
  }
  if (poi) {
    atoms.push(atom("Search", "do", "놀거리 찾아줘", order++));
  }
  if (amenity) {
    atoms.push(atom("Search", "do", "편의시설 찾아줘", order++));
  }
  if (wantsRoute) {
    atoms.push(atom("Navigate", "do", "동선 최적화해줘", order++));
  }
  return atoms.length >= 2 ? atoms : null;
}

function parseConjunction(text: string): IntentAtom[] | null {
  const parts = splitConjunction(text).flatMap(expandCompoundFragment);
  if (parts.length < 2) {
    return explodeMultiDomainBlob(text);
  }
  const atoms: IntentAtom[] = [];
  let order = 0;
  for (const part of parts) {
    const family = familyFromCue(part);
    if (!family) {
      const exploded = explodeMultiDomainBlob(part);
      if (exploded) {
        for (const a of exploded) {
          atoms.push({ ...a, order: order++ });
        }
        continue;
      }
      continue;
    }
    // Search fragment that still names 2+ domains → explode.
    if (family === "Search") {
      const exploded = explodeMultiDomainBlob(part);
      if (exploded && exploded.length >= 2) {
        for (const a of exploded) {
          atoms.push({ ...a, order: order++ });
        }
        continue;
      }
    }
    atoms.push(atom(family, "do", part, order));
    order += 1;
  }
  if (atoms.length >= 2) {
    return atoms;
  }
  return explodeMultiDomainBlob(text);
}

/**
 * Parse utterance into ordered keep/reject atoms.
 * Empty / single-do without reject → isMulti false (legacy path).
 */
export function parseNlIntentChain(utterance: string): ParsedNlIntentChain {
  const text = normalize(utterance);
  if (!text) {
    return { atoms: [], isMulti: false };
  }

  const fromContrast = parseContrast(text);
  if (fromContrast && fromContrast.length >= 1) {
    const isMulti =
      fromContrast.some((a) => a.polarity === "reject") ||
      fromContrast.filter((a) => a.polarity === "do").length >= 2;
    return { atoms: fromContrast, isMulti };
  }

  const fromAnd = parseConjunction(text);
  if (fromAnd) {
    return { atoms: fromAnd, isMulti: true };
  }

  // Single blob multi-domain (no conjunction punctuation).
  const exploded = explodeMultiDomainBlob(text);
  if (exploded) {
    return { atoms: exploded, isMulti: true };
  }

  const family = familyFromCue(text);
  if (!family) {
    return { atoms: [], isMulti: false };
  }
  return {
    atoms: [atom(family, "do", text, 0)],
    isMulti: false,
  };
}

export function shouldRunMultiIntentPlanner(
  chain: ParsedNlIntentChain,
): boolean {
  return chain.isMulti;
}

/** Map atom family to IntentFamily for Rule Engine notes (Select → Unknown). */
export function intentFamilyFromAtom(
  family: IntentAtomFamily,
): IntentFamily {
  if (family === "Select") {
    return "Unknown";
  }
  return family;
}
