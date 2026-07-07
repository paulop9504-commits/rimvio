/**
 * Everyday-amenity discovery dictionary — widens place search far beyond
 * 맛집/숙소/카페/놀거리 to the categories users search for most (약국, 병원,
 * 편의점, 은행, 주유소, 헬스장, 미용실, 노래방 …), plus a generic
 * "근처 OO 찾아줘" fallback so unlisted place types still resolve.
 *
 * Everything routes through the same Naver local-search path as activity, so a
 * matched entry only needs a good Naver search label.
 */

export type PlaceAmenityMatch = {
  /** Canonical keyword surfaced to the user (e.g. "약국"). */
  keyword: string;
  /** Naver local-search label used to fetch candidates. */
  naverLabel: string;
};

type AmenityEntry = {
  keyword: string;
  naverLabel: string;
  re: RegExp;
};

/**
 * Ordered by specificity — longer / more specific patterns first so "동물병원"
 * wins over "병원", "전기차 충전소" over "주유소", etc.
 */
const AMENITY_ENTRIES: AmenityEntry[] = [
  // 의료 · 건강
  { keyword: "약국", naverLabel: "약국", re: /약국|pharmacy|드럭스토어|올리브영/iu },
  { keyword: "응급실", naverLabel: "응급실", re: /응급실|응급의료|emergency\s*room/iu },
  { keyword: "동물병원", naverLabel: "동물병원", re: /동물병원|반려동물\s*병원|vet|동물\s*의료/iu },
  { keyword: "치과", naverLabel: "치과", re: /치과|dental/iu },
  { keyword: "피부과", naverLabel: "피부과", re: /피부과/iu },
  { keyword: "안과", naverLabel: "안과", re: /안과/iu },
  { keyword: "이비인후과", naverLabel: "이비인후과", re: /이비인후과/iu },
  { keyword: "정형외과", naverLabel: "정형외과", re: /정형외과/iu },
  { keyword: "소아과", naverLabel: "소아과", re: /소아과|소아청소년과/iu },
  { keyword: "산부인과", naverLabel: "산부인과", re: /산부인과/iu },
  { keyword: "내과", naverLabel: "내과", re: /내과/iu },
  { keyword: "한의원", naverLabel: "한의원", re: /한의원|한방병원/iu },
  { keyword: "병원", naverLabel: "병원", re: /병원|의원|clinic|hospital|진료/iu },
  { keyword: "보건소", naverLabel: "보건소", re: /보건소/iu },

  // 생활 · 편의
  { keyword: "편의점", naverLabel: "편의점", re: /편의점|convenience\s*store|cu|gs25|세븐일레븐|이마트24/iu },
  { keyword: "다이소", naverLabel: "다이소", re: /다이소|daiso/iu },
  { keyword: "대형마트", naverLabel: "대형마트", re: /대형마트|이마트|홈플러스|롯데마트|코스트코|트레이더스/iu },
  { keyword: "마트", naverLabel: "마트", re: /마트|슈퍼|mart|grocery|장\s*보/iu },
  { keyword: "세탁소", naverLabel: "세탁소", re: /세탁소|빨래방|코인빨래|laundry|드라이클리닝/iu },
  { keyword: "우체국", naverLabel: "우체국", re: /우체국|post\s*office|택배\s*보/iu },
  { keyword: "주민센터", naverLabel: "주민센터", re: /주민센터|행정복지센터|동사무소|구청|시청|공공기관/iu },
  { keyword: "도서관", naverLabel: "도서관", re: /도서관|library/iu },
  { keyword: "꽃집", naverLabel: "꽃집", re: /꽃집|플라워|florist|꽃\s*가게/iu },
  { keyword: "안경점", naverLabel: "안경점", re: /안경점|안경\s*가게|optical/iu },
  { keyword: "문구점", naverLabel: "문구점", re: /문구점|문방구|팬시/iu },
  { keyword: "서점", naverLabel: "서점", re: /서점|책방|bookstore/iu },

  // 금융
  { keyword: "ATM", naverLabel: "ATM", re: /atm|현금인출|현금\s*지급기|cash\s*machine/iu },
  { keyword: "은행", naverLabel: "은행", re: /은행|bank|환전|송금|무통장/iu },

  // 자동차 · 이동
  { keyword: "전기차 충전소", naverLabel: "전기차 충전소", re: /전기차\s*충전|ev\s*charg|충전소/iu },
  { keyword: "주유소", naverLabel: "주유소", re: /주유소|gas\s*station|기름\s*넣|셀프주유/iu },
  { keyword: "세차장", naverLabel: "세차장", re: /세차장|세차|car\s*wash/iu },
  { keyword: "카센터", naverLabel: "자동차 정비", re: /카센터|정비소|자동차\s*정비|타이어|공업사/iu },
  { keyword: "렌터카", naverLabel: "렌터카", re: /렌터카|렌트카|rent\s*a\s*car|차\s*빌/iu },
  { keyword: "주차장", naverLabel: "주차장", re: /주차장|parking|주차\s*가능|공영주차/iu },

  // 뷰티 · 피트니스
  { keyword: "헬스장", naverLabel: "헬스장", re: /헬스장|헬스|피트니스|gym|짐/iu },
  { keyword: "요가", naverLabel: "요가", re: /요가|yoga/iu },
  { keyword: "필라테스", naverLabel: "필라테스", re: /필라테스|pilates/iu },
  { keyword: "수영장", naverLabel: "수영장", re: /수영장|수영|swimming/iu },
  { keyword: "미용실", naverLabel: "미용실", re: /미용실|헤어샵|헤어\s*살롱|미장원|hair\s*salon|이발소|바버/iu },
  { keyword: "네일샵", naverLabel: "네일샵", re: /네일샵|네일아트|nail/iu },
  { keyword: "사우나", naverLabel: "사우나", re: /사우나|찜질방|목욕탕|spa|스파/iu },
  { keyword: "마사지", naverLabel: "마사지", re: /마사지|massage|안마|타이마사지/iu },

  // 여가 · 놀이
  { keyword: "노래방", naverLabel: "노래방", re: /노래방|코인노래|karaoke/iu },
  { keyword: "영화관", naverLabel: "영화관", re: /영화관|cgv|롯데시네마|메가박스|cinema|극장/iu },
  { keyword: "PC방", naverLabel: "PC방", re: /pc방|피시방|피씨방|pc\s*cafe/iu },
  { keyword: "볼링장", naverLabel: "볼링장", re: /볼링장|볼링|bowling/iu },
  { keyword: "당구장", naverLabel: "당구장", re: /당구장|당구|포켓볼|billiard/iu },
  { keyword: "방탈출", naverLabel: "방탈출카페", re: /방탈출|room\s*escape/iu },
  { keyword: "만화카페", naverLabel: "만화카페", re: /만화카페|만화방/iu },
  { keyword: "오락실", naverLabel: "오락실", re: /오락실|arcade/iu },
  { keyword: "키즈카페", naverLabel: "키즈카페", re: /키즈카페|kids\s*cafe/iu },

  // 쇼핑
  { keyword: "백화점", naverLabel: "백화점", re: /백화점|department\s*store/iu },
  { keyword: "아울렛", naverLabel: "아울렛", re: /아울렛|outlet/iu },
  { keyword: "쇼핑몰", naverLabel: "쇼핑몰", re: /쇼핑몰|쇼핑센터|shopping\s*mall/iu },
];

/**
 * A locator / find intent must be present so ordinary sentences that merely
 * mention a word (e.g. "은행 이자") don't hijack place discovery.
 */
const LOCATOR_HINT =
  /근처|주변|가까운|가까이|어디|찾아|찾기|찾|추천|알려|검색|있(?:나|어|을까|는)?|없(?:나|어|을까)?|가고\s*싶|가야/iu;

const NEARBY_ONLY = /근처|주변|가까운|가까이/iu;

/** Generic "근처 OO 찾아줘" fallback so unlisted place types still resolve. */
const GENERIC_NEARBY =
  /(?:근처|주변|가까운|가까이)\s*(?:에\s*)?([가-힣A-Za-z]{2,12})\s*(?:좀\s*)?(?:찾아|찾기|찾|추천|알려|검색|어디|있|없|가고)?/iu;

const GENERIC_FIND =
  /([가-힣A-Za-z]{2,12})\s*(?:좀\s*)?(?:찾아\s*줘|찾아줘|검색해\s*줘|추천해\s*줘|어디\s*(?:야|있|에))/iu;

/** Words that look like a noun but are not place types — keep generic fallback safe. */
const NON_PLACE_WORD =
  /^(?:그거|이거|저거|여기|거기|저기|가격|시간|위치|정보|방법|사람|친구|가족|사진|메모|일정|날씨|기분|생각|이름|번호|근처|주변|가까운|가까이|어디|추천|검색)$/iu;

export function extractPlaceAmenityKeyword(message: string): PlaceAmenityMatch | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (!LOCATOR_HINT.test(text)) {
    return null;
  }

  for (const entry of AMENITY_ENTRIES) {
    if (entry.re.test(text)) {
      return { keyword: entry.keyword, naverLabel: entry.naverLabel };
    }
  }

  // Generic fallback — only when an explicit locator/find intent frames a noun.
  const nearby = text.match(GENERIC_NEARBY)?.[1]?.trim();
  if (nearby && !NON_PLACE_WORD.test(nearby)) {
    return { keyword: nearby, naverLabel: nearby };
  }
  if (NEARBY_ONLY.test(text)) {
    const found = text.match(GENERIC_FIND)?.[1]?.trim();
    if (found && !NON_PLACE_WORD.test(found)) {
      return { keyword: found, naverLabel: found };
    }
  }

  return null;
}

export function isPlaceAmenityQuery(message: string): boolean {
  return extractPlaceAmenityKeyword(message) !== null;
}
