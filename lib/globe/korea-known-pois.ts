import type { KoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

/** Famous venues — checked before city-level fallbacks. */
export const KOREA_KNOWN_POIS: readonly KoreaKnownPlace[] = [
  { pattern: /에버랜드/u, label: "에버랜드", lat: 37.294, lng: 127.202 },
  { pattern: /롯데월드|롯데 월드/u, label: "롯데월드", lat: 37.5113, lng: 127.0982 },
  { pattern: /대전\s*갤러리아|갤러리아\s*타임월드|타임월드\s*갤러리아/u, label: "갤러리아 타임월드", lat: 36.3522, lng: 127.3884 },
  { pattern: /갤러리아\s*센터시티|센터시티\s*갤러리아/u, label: "갤러리아 센터시티", lat: 36.3508, lng: 127.3848 },
  { pattern: /갤러리아/u, label: "갤러리아", lat: 36.3522, lng: 127.3884 },
  { pattern: /코엑스|COEX/u, label: "코엑스", lat: 37.5118, lng: 127.059 },
  { pattern: /경복궁/u, label: "경복궁", lat: 37.5788, lng: 126.977 },
  { pattern: /N서울타워|남산타워|서울타워/u, label: "N서울타워", lat: 37.5512, lng: 126.9882 },
  { pattern: /인스파이어/u, label: "인스파이어", lat: 37.4692, lng: 126.6176 },
  { pattern: /킨텍스|KINTEX/u, label: "킨텍스", lat: 37.6688, lng: 126.7479 },
  { pattern: /스타필드\s*하남|하남\s*스타필드/u, label: "스타필드 하남", lat: 37.5456, lng: 127.223 },
  { pattern: /서울숲/u, label: "서울숲", lat: 37.5445, lng: 127.037 },
  { pattern: /인천공항/u, label: "인천공항", lat: 37.4602, lng: 126.4407 },
];

export function matchKoreaKnownPoi(placeLabel: string): KoreaKnownPlace | null {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return null;
  }
  for (const entry of KOREA_KNOWN_POIS) {
    if (entry.pattern.test(hay)) {
      return entry;
    }
  }
  return null;
}
