import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";

export type RunPlaceAnchor = {
  placeLabel: string;
  lat: number;
  lng: number;
};

const NEARBY_SUFFIX =
  /(?:근처|주변|부근|일대|쯤|쪽|에서|에요|예요|이에요|입니다|이야|야)(?=\s|$|[.!?,])/giu;

/** Strip conversational tails — keep 동·구·시 names intact. */
export function normalizeNaturalPlaceReply(text: string): string {
  return text
    .trim()
    .replace(NEARBY_SUFFIX, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function anchorFromLabel(label: string): RunPlaceAnchor | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  const known = matchKoreaKnownPlace(trimmed);
  if (known) {
    return { placeLabel: known.label, lat: known.lat, lng: known.lng };
  }
  const metro = matchKoreaMetroDistrict(trimmed);
  if (metro) {
    return { placeLabel: metro.label, lat: metro.lat, lng: metro.lng };
  }
  return null;
}

/**
 * Parse human place replies — "둔산동 근처", "해운대 쪽", "대전 둔산" (not lat/lng).
 */
export function resolveRunPlaceFromText(message: string): RunPlaceAnchor | null {
  const raw = message.trim();
  if (!raw) {
    return null;
  }

  const candidates = [
    raw,
    normalizeNaturalPlaceReply(raw),
    raw.replace(/^(?:여기|저기)\s*/iu, "").trim(),
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  for (const candidate of candidates) {
    const hit = anchorFromLabel(candidate);
    if (hit) {
      return hit;
    }
  }

  const dongMatch = raw.match(/([가-힣]{2,14}(?:동|읍|면|리))/iu);
  if (dongMatch?.[1]) {
    const hit = anchorFromLabel(dongMatch[1]);
    if (hit) {
      return hit;
    }
    const withNearby = anchorFromLabel(`${dongMatch[1]} 근처`);
    if (withNearby) {
      return withNearby;
    }
  }

  const guMatch = raw.match(/([가-힣]{2,10}구)/iu);
  if (guMatch?.[1]) {
    const hit = anchorFromLabel(guMatch[1]);
    if (hit) {
      return hit;
    }
  }

  return null;
}
