import { KOREA_KNOWN_POIS } from "@/lib/globe/korea-known-pois";
import { KOREA_KNOWN_PLACES } from "@/lib/globe/korea-known-places";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

const HINT_FROM_POI = KOREA_KNOWN_POIS.map((row) => ({
  pattern: row.pattern,
  label: row.label,
}));

const HINT_FROM_CITY = KOREA_KNOWN_PLACES.map((row) => ({
  pattern: row.pattern,
  label: row.label,
}));

/** Overseas / special cases not in the city table. */
const EXTRA_HINTS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /오사카/u, label: "오사카" },
  { pattern: /독일|베를린|뮌헨|프랑크푸르트/u, label: "독일" },
];

const CITY_TOKEN =
  /서울|부산|대구|인천|광주|대전|울산|세종|수원|성남|용인|제주|강릉|속초|춘천|전주|여수|포항|창원|청주/;

const NON_PLACE_MEMO =
  /(만원|원\b|할인|판매|구해|만나자|약속|몇시|라멘|맥북|아이폰|갤럭시|노트북)/u;

const TRAILING_PARTICLES = /(?:에서|에|로|까지)\s*$/u;

function stripPlaceParticles(text: string): string {
  return text.replace(TRAILING_PARTICLES, "").trim();
}

function extractCompoundCityVenue(text: string): string | null {
  const hay = stripPlaceParticles(normalizePlaceLabel(text));
  const match = hay.match(
    new RegExp(`(${CITY_TOKEN.source})\\s+([가-힣a-z]{2,12})`, "iu"),
  );
  if (!match?.[1] || !match?.[2]) {
    return null;
  }
  return normalizePlaceLabel(`${match[1]} ${stripPlaceParticles(match[2])}`);
}

/** Short bare label — user typed only a place name (e.g. 「수원」, 「대전 갤러리아」). */
export function inferBarePlaceLabel(text?: string | null): string | null {
  const hay = normalizePlaceLabel(text);
  if (!hay || hay.length < 2 || hay.length > 16) {
    return null;
  }
  if (/https?:|@|#|\n/u.test(hay)) {
    return null;
  }
  if (hay.split(/\s+/u).length > 2) {
    return null;
  }
  if (NON_PLACE_MEMO.test(hay)) {
    return null;
  }
  if (!/[가-힣a-z]/iu.test(hay)) {
    return null;
  }
  if (/^[가-힣]{2,8}(\s+[가-힣]{2,10})?$/u.test(hay)) {
    return hay;
  }
  return null;
}

export function extractPlaceHintFromText(text?: string | null): string | null {
  const hay = stripPlaceParticles(normalizePlaceLabel(text));
  if (!hay) {
    return null;
  }

  const compound = extractCompoundCityVenue(hay);
  if (compound) {
    return compound;
  }

  for (const entry of [...HINT_FROM_POI, ...EXTRA_HINTS]) {
    if (entry.pattern.test(hay)) {
      return entry.label;
    }
  }

  for (const entry of HINT_FROM_CITY) {
    if (entry.pattern.test(hay)) {
      return entry.label;
    }
  }

  return inferBarePlaceLabel(hay);
}
