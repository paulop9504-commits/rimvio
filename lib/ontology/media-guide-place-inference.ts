import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import { shortenExplicitPlacePhrase } from "@/lib/ontology/shorten-explicit-place-phrase";
import type { FeedCaptureMediaTextSignal } from "@/lib/ontology/feed-capture-wire";
import type {
  MediaGuideCandidateSource,
  MediaGuideNode,
  MediaGuidePlaceCandidate,
} from "@/lib/ontology/media-guide-types";

type CandidateSeed = {
  label: string;
  query: string;
  exactLat: number | null;
  exactLng: number | null;
  whyPlaceKo: string;
  placeLike: boolean;
};

type AreaHint = {
  label: string;
  query: string;
  lat: number | null;
  lng: number | null;
};

type TextLayer = {
  source: MediaGuideCandidateSource;
  sourceLabelKo: string;
  text: string;
  timeLabel: string | null;
  weight: number;
};

const EATERY_SIGNAL =
  /ramen|sushi|udon|soba|izakaya|yakitori|omakase|coffee|cafe|dessert|bakery|brunch|dinner|lunch|restaurant|food|meal|bar|라멘|스시|초밥|우동|소바|이자카야|야키토리|오마카세|카페|커피|디저트|베이커리|브런치|맛집|식당|밥집|먹거리|야식|술집/iu;
const LODGING_SIGNAL =
  /hotel|hostel|ryokan|stay|check[\s-]?in|check[\s-]?out|lodging|room|capsule|숙소|호텔|호스텔|료칸|체크인|체크아웃|객실|캡슐|머물/iu;
const INFO_SIGNAL =
  /station|terminal|airport|transit|route|ticket|pass|weather|tip|tips|wifi|esim|locker|gate|입장|팁|정보|교통|날씨|로밍|와이파이|역|공항|패스|환승|락커|게이트/iu;
const ACTIVITY_SIGNAL =
  /walk|walking|stroll|tour|viewpoint|museum|gallery|temple|shrine|market|park|beach|street|alley|shopping|night view|산책|도보|투어|전망|박물관|미술관|사원|신사|시장|공원|해변|거리|골목|쇼핑|야경/iu;
const PLACE_SUFFIX_SIGNAL =
  /(?:거리|시장|사원|신사|타워|공원|광장|해변|골목|입구|성|궁|역|호텔|료칸|카페|식당|gate|market|street|temple|shrine|tower|park|square|beach|station|hotel|ryokan|cafe|restaurant)/iu;
const TIMESTAMP_PREFIX = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/u;
const STOPWORD_SIGNAL =
  /^(guide|travel|trip|tour|vlog|walk|walking|city walk|산책|브이로그|가이드|여행|일정|코스)$/iu;
const GENERIC_PLACE_PREFIX =
  /^(?:있는|좋은|늦은|바로|근처|주변|여기|저기|이런|그런|가기|갈 수|먹기|보기|moving|late|near)(?:\s|$)/iu;
const PLACE_NEAR_SIGNAL = /near|around|close to|next to|by|근처|주변|부근|옆|근방|일대/iu;
const STATION_SIGNAL = /station|terminal|airport|역|공항|터미널|환승|gate|출구/iu;
const CHECKIN_SIGNAL = /check[\s-]?in|체크인|도착/u;
const CHECKOUT_SIGNAL = /check[\s-]?out|체크아웃|퇴실/u;
const LATE_SIGNAL = /late[\s-]?night|after dark|night|야식|심야|밤거리|늦은/u;
const BREAKFAST_SIGNAL = /breakfast|morning|아침/u;
const LUNCH_SIGNAL = /lunch|점심/u;
const DINNER_SIGNAL = /dinner|supper|저녁/u;
const WALKABLE_SIGNAL = /walk(?:ing)? distance|도보|걸어서/u;
const INDOOR_SIGNAL = /weather|rain|indoor|날씨|비|실내/u;
const GUIDE_CONTEXT_SIGNAL = /official|guide|visitor|travel|tour|tips|itinerary|공식|가이드|여행|방문/iu;
const LATIN_PROPER_NOUN_SIGNAL =
  /\b[A-Z][A-Za-z'&.-]+(?:\s+[A-Z][A-Za-z'&.-]+){1,3}\b/u;
const FOOD_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ramen|라멘/iu, label: "라멘" },
  { pattern: /sushi|스시|초밥/iu, label: "스시" },
  { pattern: /udon|우동/iu, label: "우동" },
  { pattern: /soba|소바/iu, label: "소바" },
  { pattern: /izakaya|이자카야/iu, label: "이자카야" },
  { pattern: /yakitori|야키토리/iu, label: "야키토리" },
  { pattern: /omakase|오마카세/iu, label: "오마카세" },
  { pattern: /coffee|cafe|카페|커피/iu, label: "카페" },
  { pattern: /dessert|bakery|디저트|베이커리/iu, label: "디저트" },
  { pattern: /brunch|브런치/iu, label: "브런치" },
];

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const safe = Math.floor(seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function semanticTypeLabelKo(
  semanticType: MediaGuidePlaceCandidate["semanticType"],
): string {
  switch (semanticType) {
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "info":
      return "정보";
    default:
      return "갈 곳";
  }
}

function sourceLabelKo(source: MediaGuideCandidateSource): string {
  switch (source) {
    case "title":
      return "제목";
    case "chapter":
      return "챕터";
    case "subtitle":
      return "자막";
    case "transcript":
      return "대본";
    default:
      return "설명";
  }
}

function collectTextLayers(input: {
  guide: Pick<MediaGuideNode, "title" | "description" | "moments">;
  mediaTextSignals?: readonly FeedCaptureMediaTextSignal[];
}): TextLayer[] {
  const layers: TextLayer[] = [];
  const seen = new Set<string>();
  const push = (
    source: MediaGuideCandidateSource,
    value: string | null | undefined,
    options?: { timeLabel?: string | null; weight?: number },
  ) => {
    const text = normalizeText(value).replace(TIMESTAMP_PREFIX, "");
    if (!text) {
      return;
    }
    const timeLabel = options?.timeLabel ?? null;
    const key = `${source}:${timeLabel ?? "-"}:${text.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    layers.push({
      source,
      sourceLabelKo: sourceLabelKo(source),
      text,
      timeLabel,
      weight: options?.weight ?? 1,
    });
  };

  push("title", input.guide.title, { weight: 1.04 });
  push("description", input.guide.description, { weight: 0.86 });
  for (const moment of input.guide.moments) {
    if (moment.title) {
      push("chapter", moment.title, { timeLabel: moment.timeLabel, weight: 1.08 });
    }
  }
  for (const signal of input.mediaTextSignals ?? []) {
    push(signal.source, signal.text, {
      timeLabel:
        typeof signal.startSeconds === "number" ? formatSeconds(signal.startSeconds) : null,
      weight:
        signal.source === "subtitle"
          ? 1.02
          : signal.source === "transcript"
            ? 0.94
            : signal.source === "chapter"
              ? 1.08
              : signal.source === "title"
                ? 1.04
                : 0.86,
    });
  }
  return layers;
}

function inferSemanticType(text: string): MediaGuidePlaceCandidate["semanticType"] {
  if (EATERY_SIGNAL.test(text)) {
    return "eatery";
  }
  if (LODGING_SIGNAL.test(text)) {
    return "lodging";
  }
  if (INFO_SIGNAL.test(text)) {
    return "info";
  }
  return "place";
}

function extractCuisineHint(text: string): string | null {
  for (const row of FOOD_HINTS) {
    if (row.pattern.test(text)) {
      return row.label;
    }
  }
  return null;
}

function extractSituationalHints(text: string): string[] {
  const hints: string[] = [];
  if (LATE_SIGNAL.test(text)) {
    hints.push("늦은 시간");
  }
  if (CHECKIN_SIGNAL.test(text)) {
    hints.push("체크인 뒤");
  }
  if (CHECKOUT_SIGNAL.test(text)) {
    hints.push("체크아웃 전");
  }
  if (STATION_SIGNAL.test(text) && PLACE_NEAR_SIGNAL.test(text)) {
    hints.push("역 근처");
  }
  if (STATION_SIGNAL.test(text) && !hints.includes("역 근처")) {
    hints.push("이동 동선");
  }
  if (BREAKFAST_SIGNAL.test(text)) {
    hints.push("아침 흐름");
  }
  if (LUNCH_SIGNAL.test(text)) {
    hints.push("점심 흐름");
  }
  if (DINNER_SIGNAL.test(text)) {
    hints.push("저녁 흐름");
  }
  if (WALKABLE_SIGNAL.test(text)) {
    hints.push("도보권");
  }
  if (INDOOR_SIGNAL.test(text)) {
    hints.push("날씨 영향");
  }
  return hints;
}

function hasPlaceCue(text: string): boolean {
  return (
    PLACE_SUFFIX_SIGNAL.test(text) ||
    EATERY_SIGNAL.test(text) ||
    LODGING_SIGNAL.test(text) ||
    INFO_SIGNAL.test(text) ||
    ACTIVITY_SIGNAL.test(text) ||
    (LATIN_PROPER_NOUN_SIGNAL.test(text) && GUIDE_CONTEXT_SIGNAL.test(text))
  );
}

function isUsableExplicitPhrase(value: string): boolean {
  const clean = normalizeText(value);
  if (!clean || STOPWORD_SIGNAL.test(clean) || GENERIC_PLACE_PREFIX.test(clean)) {
    return false;
  }
  if (/^(?:역|시장|사원|신사|호텔|료칸|카페|식당)$/u.test(clean)) {
    return false;
  }
  return true;
}

function buildExplicitPlacePhrase(text: string): string | null {
  const cleaned = normalizeText(text.replace(TIMESTAMP_PREFIX, ""));
  if (!cleaned || STOPWORD_SIGNAL.test(cleaned)) {
    return null;
  }
  const phraseMatch = cleaned.match(
    /([A-Za-z0-9가-힣]{2,20}(?:\s+[A-Za-z0-9가-힣]{1,20}){0,2}\s*(?:거리|시장|사원|신사|타워|공원|광장|해변|골목|입구|성|궁|역|호텔|료칸|카페|식당|gate|market|street|temple|shrine|tower|park|square|beach|station|hotel|ryokan|cafe|restaurant))(?=\s|$|[.!?,:;])/iu,
  );
  if (phraseMatch?.[1] && isUsableExplicitPhrase(phraseMatch[1])) {
    return normalizeText(phraseMatch[1]);
  }

  const properNounMatch = cleaned.match(
    /\b([A-Z][A-Za-z'&.-]+(?:\s+[A-Z][A-Za-z'&.-]+){1,3})\b(?=\s+(?:official|guide|visitor|travel|tour|tips|itinerary|in)\b|$)/u,
  );
  if (properNounMatch?.[1] && isUsableExplicitPhrase(properNounMatch[1])) {
    return normalizeText(properNounMatch[1]);
  }

  if (cleaned.length <= 24 && PLACE_SUFFIX_SIGNAL.test(cleaned) && isUsableExplicitPhrase(cleaned)) {
    return cleaned;
  }

  const shortened = shortenExplicitPlacePhrase(cleaned);
  if (shortened) {
    const displayLabel = normalizeText(shortened);
    if (
      displayLabel &&
      displayLabel.length <= 24 &&
      displayLabel !== cleaned &&
      !STOPWORD_SIGNAL.test(displayLabel) &&
      (!ACTIVITY_SIGNAL.test(cleaned) ||
        PLACE_SUFFIX_SIGNAL.test(displayLabel) ||
        cleaned.length <= displayLabel.length + 4) &&
      isUsableExplicitPhrase(displayLabel)
    ) {
      return displayLabel;
    }
  }
  const explicitTripAnchor = resolveTripContextAnchor(cleaned);
  if (
    explicitTripAnchor &&
    cleaned.length <= 18 &&
    !ACTIVITY_SIGNAL.test(cleaned) &&
    !EATERY_SIGNAL.test(cleaned) &&
    !LODGING_SIGNAL.test(cleaned) &&
    !INFO_SIGNAL.test(cleaned)
  ) {
    return explicitTripAnchor.placeLabel;
  }
  return null;
}

function containsLooseLabel(text: string, label: string): boolean {
  const hay = normalizeText(text).toLowerCase();
  const needle = normalizeText(label).toLowerCase();
  if (!hay || !needle) {
    return false;
  }
  return hay.includes(needle);
}

function expandAreaVariants(label: string): string[] {
  const clean = normalizeText(label);
  if (!clean) {
    return [];
  }
  const parts = clean.split(" ").filter(Boolean);
  const variants = new Set<string>([clean]);
  if (parts.length >= 2) {
    variants.add(parts.slice(-2).join(" "));
  }
  if (parts.length >= 3) {
    variants.add(parts.slice(-3).join(" "));
  }
  variants.add(parts.at(-1) ?? "");
  return [...variants].filter(Boolean);
}

function buildAreaHints(input: {
  event: EventCandidate;
  relatedPlaceLabel: string | null;
  capturePlaceLabel: string | null | undefined;
}): AreaHint[] {
  const context = buildContextInstance({ event: input.event });
  const anchorProfile = context.location.anchor.profile;
  const seedLabels = [
    input.capturePlaceLabel,
    input.relatedPlaceLabel,
    context.location.areaLabel,
    context.travel.destinationLabel,
    anchorProfile.neighborhood,
    anchorProfile.district,
    anchorProfile.city,
    anchorProfile.label,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  const hints: AreaHint[] = [];
  const seen = new Set<string>();
  for (const label of seedLabels) {
    for (const variant of expandAreaVariants(label)) {
      const normalized = variant.toLowerCase();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      const exact = resolveTripContextAnchor(variant);
      hints.push({
        label: variant,
        query: exact?.placeLabel ?? variant,
        lat: exact?.lat ?? null,
        lng: exact?.lng ?? null,
      });
    }
  }

  if (hints.length === 0) {
    hints.push({
      label: anchorProfile.label,
      query: anchorProfile.searchHints.localityQuery || anchorProfile.label,
      lat: anchorProfile.lat,
      lng: anchorProfile.lng,
    });
  }

  return hints;
}

function pickAreaHint(text: string, areaHints: readonly AreaHint[]): AreaHint | null {
  let best: AreaHint | null = null;
  for (const hint of areaHints) {
    if (!containsLooseLabel(text, hint.label)) {
      continue;
    }
    if (!best || hint.label.length > best.label.length) {
      best = hint;
    }
  }
  return best;
}

function uniqueTerms(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const value of values) {
    const clean = normalizeText(value);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(clean);
  }
  return rows;
}

function buildSearchQuery(input: {
  semanticType: MediaGuidePlaceCandidate["semanticType"];
  explicitLabel: string | null;
  areaHint: AreaHint | null;
  fallbackAreaLabel: string;
  cuisineHint: string | null;
  situationalHintsKo: readonly string[];
  text: string;
}): string {
  const area = input.areaHint?.query ?? input.fallbackAreaLabel;
  const terms: string[] = [area];

  if (input.explicitLabel) {
    if (!containsLooseLabel(input.explicitLabel, area)) {
      terms.push(input.explicitLabel);
    } else {
      terms[0] = input.explicitLabel;
    }
  }

  if (input.semanticType === "eatery") {
    terms.push(input.cuisineHint ?? (input.situationalHintsKo.includes("늦은 시간") ? "야식" : "맛집"));
  } else if (input.semanticType === "lodging") {
    terms.push(input.situationalHintsKo.includes("역 근처") ? "역 근처 숙소" : "숙소");
  } else if (input.semanticType === "info") {
    terms.push(input.situationalHintsKo.includes("역 근처") ? "역 동선" : "현지 팁");
  } else if (ACTIVITY_SIGNAL.test(input.text)) {
    terms.push("가볼 곳");
  }

  if (input.situationalHintsKo.includes("도보권")) {
    terms.push("도보");
  }

  return uniqueTerms(terms).join(" ").trim();
}

function buildCandidateSeed(input: {
  text: string;
  semanticType: MediaGuidePlaceCandidate["semanticType"];
  areaHint: AreaHint | null;
  fallbackAreaLabel: string;
  cuisineHint: string | null;
  situationalHintsKo: readonly string[];
}): CandidateSeed | null {
  const explicit = buildExplicitPlacePhrase(input.text);
  if (explicit) {
    const exact = resolveTripContextAnchor(explicit);
    const query = buildSearchQuery({
      semanticType: input.semanticType,
      explicitLabel: explicit,
      areaHint: input.areaHint,
      fallbackAreaLabel: input.fallbackAreaLabel,
      cuisineHint: input.cuisineHint,
      situationalHintsKo: input.situationalHintsKo,
      text: input.text,
    });
    return {
      label: explicit,
      query,
      exactLat: exact?.lat ?? null,
      exactLng: exact?.lng ?? null,
      whyPlaceKo: exact
        ? "이름이 직접 보여서 위치 후보로 펼쳐 봐요"
        : "장소 표현이 직접 보여서 위치 후보로 펼쳐 봐요",
      placeLike: true,
    };
  }

  switch (input.semanticType) {
    case "eatery": {
      const label =
        input.cuisineHint ??
        (input.situationalHintsKo.includes("늦은 시간") ? "늦은 식사" : "맛집");
      return {
        label,
        query: buildSearchQuery({
          semanticType: input.semanticType,
          explicitLabel: null,
          areaHint: input.areaHint,
          fallbackAreaLabel: input.fallbackAreaLabel,
          cuisineHint: input.cuisineHint,
          situationalHintsKo: input.situationalHintsKo,
          text: input.text,
        }),
        exactLat: null,
        exactLng: null,
        whyPlaceKo: "식사 단서가 뚜렷해서 탐색 후보로 펼쳐 봐요",
        placeLike: false,
      };
    }
    case "lodging":
      return {
        label: input.situationalHintsKo.includes("역 근처")
          ? "역 가까운 숙소"
          : "머무는 곳",
        query: buildSearchQuery({
          semanticType: input.semanticType,
          explicitLabel: null,
          areaHint: input.areaHint,
          fallbackAreaLabel: input.fallbackAreaLabel,
          cuisineHint: input.cuisineHint,
          situationalHintsKo: input.situationalHintsKo,
          text: input.text,
        }),
        exactLat: null,
        exactLng: null,
        whyPlaceKo: "머무는 단서가 보여서 숙소 후보로 펼쳐 봐요",
        placeLike: false,
      };
    case "info":
      return {
        label: input.situationalHintsKo.includes("역 근처")
          ? "역·이동 정보"
          : "현지 팁",
        query: buildSearchQuery({
          semanticType: input.semanticType,
          explicitLabel: null,
          areaHint: input.areaHint,
          fallbackAreaLabel: input.fallbackAreaLabel,
          cuisineHint: input.cuisineHint,
          situationalHintsKo: input.situationalHintsKo,
          text: input.text,
        }),
        exactLat: null,
        exactLng: null,
        whyPlaceKo: "이동·팁 단서가 보여서 정보 후보로 묶어 둬요",
        placeLike: false,
      };
    default:
      if (!ACTIVITY_SIGNAL.test(input.text) && input.situationalHintsKo.length === 0) {
        return null;
      }
      return {
        label: "가볼 곳",
        query: buildSearchQuery({
          semanticType: input.semanticType,
          explicitLabel: null,
          areaHint: input.areaHint,
          fallbackAreaLabel: input.fallbackAreaLabel,
          cuisineHint: input.cuisineHint,
          situationalHintsKo: input.situationalHintsKo,
          text: input.text,
        }),
        exactLat: null,
        exactLng: null,
        whyPlaceKo: "동선 단서가 보여서 장소 후보로 묶어 둬요",
        placeLike: false,
      };
  }
}

function buildConfidence(input: {
  source: MediaGuideCandidateSource;
  seed: CandidateSeed;
  layerWeight: number;
  areaHint: AreaHint | null;
  cuisineHint: string | null;
  situationalHintsKo: readonly string[];
}): number {
  const base =
    input.source === "chapter"
      ? 0.76
      : input.source === "title"
        ? 0.7
        : input.source === "subtitle"
          ? 0.72
        : input.source === "transcript"
          ? 0.68
          : 0.62;
  let score = base * input.layerWeight;
  if (input.seed.placeLike) {
    score += 0.16;
  }
  if (input.seed.exactLat != null && input.seed.exactLng != null) {
    score += 0.08;
  }
  if (input.areaHint) {
    score += 0.06;
  }
  if (input.cuisineHint) {
    score += 0.05;
  }
  if (input.situationalHintsKo.length > 0) {
    score += 0.04 + Math.min(0.04, input.situationalHintsKo.length * 0.01);
  }
  if (!input.seed.placeLike) {
    score -= 0.06;
  }
  return clamp(score, 0.45, 0.96);
}

function buildWhyCandidate(input: {
  sourceLabelKo: string;
  seed: CandidateSeed;
  semanticType: MediaGuidePlaceCandidate["semanticType"];
  situationalHintsKo: readonly string[];
  cuisineHint: string | null;
}): string {
  const semanticLabel = semanticTypeLabelKo(input.semanticType);
  const situational = input.situationalHintsKo[0];
  if (situational) {
    return `${input.sourceLabelKo}에서 ${situational} 단서가 보여 ${semanticLabel} 후보로 잡았어요`;
  }
  if (input.cuisineHint) {
    return `${input.sourceLabelKo}에서 ${input.cuisineHint} 흐름이 보여 ${semanticLabel} 후보로 잡았어요`;
  }
  return `${input.sourceLabelKo}에서 ${input.seed.whyPlaceKo}`;
}

export function inferMediaGuidePlaceCandidates(input: {
  event: EventCandidate;
  guide: Pick<
    MediaGuideNode,
    "guideNodeId" | "title" | "description" | "moments" | "relatedPlaceLabel"
  >;
  capturePlaceLabel?: string | null;
  mediaTextSignals?: readonly FeedCaptureMediaTextSignal[];
}): MediaGuidePlaceCandidate[] {
  const context = buildContextInstance({ event: input.event });
  const anchorProfile = context.location.anchor.profile;
  const anchorLabel =
    context.location.areaLabel ??
    anchorProfile.searchHints.areaLabel ??
    anchorProfile.label;
  const areaHints = buildAreaHints({
    event: input.event,
    relatedPlaceLabel: input.guide.relatedPlaceLabel,
    capturePlaceLabel: input.capturePlaceLabel,
  });
  const layers = collectTextLayers({
    guide: input.guide,
    mediaTextSignals: input.mediaTextSignals,
  });
  const deduped = new Map<string, MediaGuidePlaceCandidate>();

  for (const layer of layers) {
    if (!hasPlaceCue(layer.text)) {
      continue;
    }
    const semanticType = inferSemanticType(layer.text);
    const cuisineHint = extractCuisineHint(layer.text);
    const situationalHintsKo = extractSituationalHints(layer.text);
    const areaHint = pickAreaHint(layer.text, areaHints);
    const seed = buildCandidateSeed({
      text: layer.text,
      semanticType,
      areaHint,
      fallbackAreaLabel: input.guide.relatedPlaceLabel ?? anchorLabel,
      cuisineHint,
      situationalHintsKo,
    });
    if (!seed) {
      continue;
    }

    const confidence = buildConfidence({
      source: layer.source,
      seed,
      layerWeight: layer.weight,
      areaHint,
      cuisineHint,
      situationalHintsKo,
    });
    if (confidence < 0.56) {
      continue;
    }

    const candidate: MediaGuidePlaceCandidate = {
      candidateId: `${input.guide.guideNodeId}:${semanticType}:${seed.label}`
        .toLowerCase()
        .replace(/\s+/gu, "-"),
      label: seed.label,
      semanticType,
      semanticTypeLabelKo: semanticTypeLabelKo(semanticType),
      source: layer.source,
      sourceLabelKo: layer.sourceLabelKo,
      snippetKo: layer.timeLabel ? `${layer.timeLabel} ${layer.text}` : layer.text,
      whyCandidateKo: buildWhyCandidate({
        sourceLabelKo: layer.sourceLabelKo,
        seed,
        semanticType,
        situationalHintsKo,
        cuisineHint,
      }),
      areaLabel: areaHint?.label ?? input.guide.relatedPlaceLabel ?? anchorLabel,
      cuisineHint,
      situationalHintsKo,
      confidence,
      searchProfile: {
        query: seed.query,
        areaLabel: areaHint?.label ?? input.guide.relatedPlaceLabel ?? anchorLabel,
        countryBias: anchorProfile.searchHints.countryBias,
        providerBias: anchorProfile.searchHints.providerBias,
        searchLocale: anchorProfile.searchHints.searchLocale,
        anchorLabel: areaHint?.label ?? anchorLabel,
        anchorLat: areaHint?.lat ?? anchorProfile.lat,
        anchorLng: areaHint?.lng ?? anchorProfile.lng,
      },
      lat: seed.exactLat,
      lng: seed.exactLng,
      mapPlacement:
        seed.exactLat != null && seed.exactLng != null ? "map_anchor" : "root_branch",
    };

    const key = `${candidate.semanticType}:${candidate.searchProfile.query.toLowerCase()}`;
    const current = deduped.get(key);
    if (!current || candidate.confidence > current.confidence) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6);
}
