import { haversineKm } from "@/lib/feed/spacetime-fit";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  buildCanonicalPlaceProfile,
  type CanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";

export type ContextTitlePurpose =
  | "travel"
  | "business_trip"
  | "work"
  | "meeting"
  | "social"
  | "meal"
  | "lodging"
  | "generic";

export type ContextTitleCompanionMode =
  | "parent"
  | "family"
  | "friend"
  | "partner"
  | "colleague"
  | "named_person"
  | "group"
  | "solo"
  | "unknown";

export type ContextTitleTimeCue =
  | "first_day"
  | "last_day"
  | "arrival"
  | "departure"
  | "breakfast"
  | "brunch"
  | "lunch"
  | "dinner"
  | "late_night"
  | "night"
  | "meeting_day";

export type ContextTitleSituationHint =
  | "travel"
  | "business_trip"
  | "work"
  | "meeting"
  | "social"
  | "family"
  | "lodging"
  | "eatery";

export type ContextTitleConflictReason =
  | "anchor_country_mismatch"
  | "anchor_area_mismatch"
  | "anchor_distance_mismatch";

export type ContextTitlePlaceHint = {
  label: string;
  profile: CanonicalPlaceProfile;
  confidence: number;
  source: "title";
};

export type ContextTitleSearchBias = {
  mealMoment: "breakfast" | "brunch" | "lunch" | "dinner" | "late_night" | null;
  comfortBias: "comfort" | "practical" | null;
  mobilityBias: "low" | "normal" | null;
  proximityBias: "anchor_tight" | "anchor_flexible" | null;
  socialContext: "family" | "friend" | "partner" | "colleague" | "meeting" | null;
};

export type ContextTitleConflict = {
  severity: "none" | "soft" | "hard";
  reasons: ContextTitleConflictReason[];
  titlePlaceLabel: string | null;
  anchorLabel: string | null;
  distanceKm: number | null;
};

export type ContextTitleInference = {
  rawTitle: string | null;
  normalizedTitle: string | null;
  purpose: ContextTitlePurpose | null;
  companionMode: ContextTitleCompanionMode;
  peopleHints: string[];
  timeCues: ContextTitleTimeCue[];
  situationHints: ContextTitleSituationHint[];
  placeHints: ContextTitlePlaceHint[];
  primaryPlaceHint: ContextTitlePlaceHint | null;
  searchBias: ContextTitleSearchBias;
  confidence: number;
  conflict: ContextTitleConflict;
};

type InferContextTitleMeaningInput = {
  title: string | null | undefined;
  anchorProfile?: CanonicalPlaceProfile | null;
};

const PARENT_PATTERN = /(?:엄마|아빠|어머니|아버지|부모님)/u;
const FAMILY_PATTERN =
  /(?:가족|엄마|아빠|어머니|아버지|부모님|형|누나|오빠|언니|동생|할머니|할아버지)/u;
const PARTNER_PATTERN = /(?:남친|여친|연인|데이트|아내|남편|wife|husband|partner)/iu;
const COLLEAGUE_PATTERN =
  /(?:동료|팀원|팀|회사|사수|후배|선배|고객|클라이언트|대표|임원|파트너사)/u;
const GROUP_PATTERN = /(?:우리\s*팀|단체|같이|함께|모임|회식|전체)/u;
const BUSINESS_PATTERN = /(?:출장|외근|업무|business\s*trip|biz\s*trip)/iu;
const WORK_PATTERN = /(?:업무|회의|미팅|브리핑|발표|면접|오피스|출근|work|meeting)/iu;
const MEETING_PATTERN = /(?:만나(?:는|날|기)?|약속|회의|미팅|모임|회식|데이트|브런치\s*약속)/iu;
const TRAVEL_PATTERN = /(?:여행|투어|휴가|trip|travel|vacation)/iu;
const LODGING_PATTERN = /(?:숙소|호텔|체크인|check-?in|stay|lodging|호캉스)/iu;
const MEAL_PATTERN =
  /(?:아침|조식|브런치|점심|저녁|야식|식사|밥|카페|커피|디저트|술|한잔|먹방)/iu;

const FIRST_DAY_PATTERN = /(?:첫\s*날|첫날|첫째\s*날|도착\s*날|도착|d-?0)/iu;
const LAST_DAY_PATTERN = /(?:막\s*날|마지막\s*날|막날|귀국|복귀|체크아웃)/iu;
const BREAKFAST_PATTERN = /(?:아침|조식|breakfast)/iu;
const BRUNCH_PATTERN = /(?:브런치|brunch)/iu;
const LUNCH_PATTERN = /(?:점심|lunch)/iu;
const DINNER_PATTERN = /(?:저녁|석식|dinner)/iu;
const LATE_NIGHT_PATTERN = /(?:야식|심야|늦은\s*밤|새벽|late\s*night)/iu;
const NIGHT_PATTERN = /(?:밤|나이트|night)/iu;

const PERSON_SUFFIX_PATTERN = /(?:랑|이랑|와|과|하고|이랑서|와서)$/u;
const PLACE_PARTICLE_PATTERN = /(?:에서|으로|까지|에|쪽|주변|근처|일대|부근)$/u;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeCompact(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase().replace(/\s+/gu, "");
}

function stripCandidateNoise(token: string): string {
  return token.replace(PERSON_SUFFIX_PATTERN, "").replace(PLACE_PARTICLE_PATTERN, "").trim();
}

function extractPeopleHints(title: string): string[] {
  const hints = new Set<string>();

  for (const match of title.matchAll(/([가-힣A-Za-z0-9]{1,12})(?:랑|이랑|와|과|하고)\b/gu)) {
    const person = normalizeText(match[1]);
    if (person) {
      hints.add(person);
    }
  }

  for (const match of title.matchAll(/([가-힣A-Za-z0-9]{2,12})\s*만나(?:는|날|기)?/gu)) {
    const person = normalizeText(match[1]);
    if (person) {
      hints.add(person);
    }
  }

  for (const token of ["엄마", "아빠", "어머니", "아버지", "부모님"]) {
    if (title.includes(token)) {
      hints.add(token);
    }
  }

  return [...hints];
}

function detectCompanionMode(title: string, peopleHints: readonly string[]): ContextTitleCompanionMode {
  if (PARENT_PATTERN.test(title)) {
    return "parent";
  }
  if (FAMILY_PATTERN.test(title)) {
    return "family";
  }
  if (PARTNER_PATTERN.test(title)) {
    return "partner";
  }
  if (COLLEAGUE_PATTERN.test(title)) {
    return "colleague";
  }
  if (GROUP_PATTERN.test(title)) {
    return "group";
  }
  if (peopleHints.length > 0) {
    return "named_person";
  }
  if (/\b혼자\b|솔플|solo/iu.test(title)) {
    return "solo";
  }
  return "unknown";
}

function detectTimeCues(title: string): ContextTitleTimeCue[] {
  const cues: ContextTitleTimeCue[] = [];
  if (FIRST_DAY_PATTERN.test(title)) {
    cues.push("first_day", "arrival");
  }
  if (LAST_DAY_PATTERN.test(title)) {
    cues.push("last_day", "departure");
  }
  if (BREAKFAST_PATTERN.test(title)) {
    cues.push("breakfast");
  }
  if (BRUNCH_PATTERN.test(title)) {
    cues.push("brunch");
  }
  if (LUNCH_PATTERN.test(title)) {
    cues.push("lunch");
  }
  if (DINNER_PATTERN.test(title)) {
    cues.push("dinner");
  }
  if (LATE_NIGHT_PATTERN.test(title)) {
    cues.push("late_night");
  }
  if (NIGHT_PATTERN.test(title) && !cues.includes("late_night")) {
    cues.push("night");
  }
  if (/만나는\s*날|약속\s*날/u.test(title)) {
    cues.push("meeting_day");
  }
  return uniq(cues);
}

function buildPlaceHintFromCandidate(candidate: string, title: string): ContextTitlePlaceHint | null {
  const cleaned = stripCandidateNoise(normalizeText(candidate));
  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  const domestic = resolveRunPlaceFromText(cleaned);
  if (domestic) {
    return {
      label: domestic.placeLabel,
      profile: buildCanonicalPlaceProfile({
        lat: domestic.lat,
        lng: domestic.lng,
        label: domestic.placeLabel,
        anchorSource: "explicit_destination",
        confidence: cleaned === normalizeText(title) ? 0.9 : 0.84,
      }),
      confidence: cleaned === normalizeText(title) ? 0.9 : 0.84,
      source: "title",
    };
  }

  const overseas = classifyOverseasManualPlace(cleaned);
  if (!overseas) {
    return null;
  }

  return {
    label: overseas.label,
    profile: buildCanonicalPlaceProfile({
      lat: overseas.lat,
      lng: overseas.lng,
      label: overseas.label,
      formattedAddress: `${overseas.label}, ${overseas.countryLabel}`,
      anchorSource: "explicit_destination",
      confidence: overseas.kind === "city" ? 0.96 : 0.88,
    }),
    confidence: overseas.kind === "city" ? 0.96 : 0.88,
    source: "title",
  };
}

function collectPlaceCandidates(title: string): string[] {
  const normalized = normalizeText(title);
  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>([normalized]);
  const coarseParts = normalized
    .split(/[·/|,()[\]_-]+/u)
    .map((part) => normalizeText(part))
    .filter(Boolean);
  for (const part of coarseParts) {
    candidates.add(part);
  }

  const tokenSource = normalized.replace(/[·/|,()[\]_-]+/gu, " ");
  const tokens = tokenSource
    .split(/\s+/u)
    .map((token) => stripCandidateNoise(token))
    .filter((token) => token.length >= 2);

  for (const token of tokens) {
    candidates.add(token);
  }

  for (let size = 2; size <= 3; size += 1) {
    for (let start = 0; start <= tokens.length - size; start += 1) {
      candidates.add(tokens.slice(start, start + size).join(" ").trim());
    }
  }

  return [...candidates];
}

function extractPlaceHints(title: string): ContextTitlePlaceHint[] {
  const hints: ContextTitlePlaceHint[] = [];
  const seen = new Set<string>();

  for (const candidate of collectPlaceCandidates(title)) {
    const hint = buildPlaceHintFromCandidate(candidate, title);
    if (!hint) {
      continue;
    }
    const key = `${normalizeCompact(hint.label)}:${hint.profile.countryCode ?? "?"}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    hints.push(hint);
  }

  hints.sort((left, right) => right.confidence - left.confidence);
  return hints;
}

function detectPurpose(input: {
  title: string;
  companionMode: ContextTitleCompanionMode;
  placeHints: readonly ContextTitlePlaceHint[];
}): ContextTitlePurpose | null {
  const { title, companionMode, placeHints } = input;
  if (LODGING_PATTERN.test(title)) {
    return "lodging";
  }
  if (BUSINESS_PATTERN.test(title) && placeHints.length > 0) {
    return "business_trip";
  }
  if (MEAL_PATTERN.test(title)) {
    return "meal";
  }
  if (MEETING_PATTERN.test(title)) {
    return "meeting";
  }
  if (BUSINESS_PATTERN.test(title) || WORK_PATTERN.test(title)) {
    return "work";
  }
  if (TRAVEL_PATTERN.test(title)) {
    return "travel";
  }
  if (
    placeHints.length > 0 &&
    companionMode !== "unknown" &&
    companionMode !== "solo" &&
    !MEETING_PATTERN.test(title)
  ) {
    return "travel";
  }
  if (placeHints.length > 0 && !WORK_PATTERN.test(title) && !MEAL_PATTERN.test(title)) {
    return "travel";
  }
  if (companionMode !== "unknown") {
    return "social";
  }
  return null;
}

function detectSituationHints(input: {
  title: string;
  purpose: ContextTitlePurpose | null;
  companionMode: ContextTitleCompanionMode;
}): ContextTitleSituationHint[] {
  const hints = new Set<ContextTitleSituationHint>();
  if (input.purpose === "travel" || input.purpose === "business_trip" || input.purpose === "lodging") {
    hints.add("travel");
  }
  if (input.purpose === "business_trip") {
    hints.add("business_trip");
    hints.add("work");
  }
  if (input.purpose === "work") {
    hints.add("work");
  }
  if (input.purpose === "meeting") {
    hints.add("meeting");
    hints.add("social");
  }
  if (input.purpose === "social") {
    hints.add("social");
  }
  if (input.purpose === "meal") {
    hints.add("eatery");
  }
  if (input.purpose === "lodging") {
    hints.add("lodging");
  }
  if (input.companionMode === "parent" || input.companionMode === "family") {
    hints.add("family");
    hints.add("social");
  }
  if (input.companionMode === "colleague") {
    hints.add("work");
  }
  if (MEETING_PATTERN.test(input.title)) {
    hints.add("meeting");
  }
  if (TRAVEL_PATTERN.test(input.title)) {
    hints.add("travel");
  }
  return [...hints];
}

function deriveSearchBias(input: {
  purpose: ContextTitlePurpose | null;
  companionMode: ContextTitleCompanionMode;
  timeCues: readonly ContextTitleTimeCue[];
}): ContextTitleSearchBias {
  let mealMoment: ContextTitleSearchBias["mealMoment"] = null;
  if (input.timeCues.includes("late_night")) {
    mealMoment = "late_night";
  } else if (input.timeCues.includes("dinner")) {
    mealMoment = "dinner";
  } else if (input.timeCues.includes("lunch")) {
    mealMoment = "lunch";
  } else if (input.timeCues.includes("brunch")) {
    mealMoment = "brunch";
  } else if (input.timeCues.includes("breakfast")) {
    mealMoment = "breakfast";
  }

  const comfortBias =
    input.companionMode === "parent" || input.companionMode === "family"
      ? "comfort"
      : input.purpose === "business_trip" ||
          input.purpose === "work" ||
          input.purpose === "meeting" ||
          input.companionMode === "colleague"
        ? "practical"
        : null;

  const mobilityBias =
    input.companionMode === "parent" || input.companionMode === "family"
      ? "low"
      : input.timeCues.includes("late_night") || input.timeCues.includes("arrival")
        ? "low"
        : null;

  const proximityBias =
    input.timeCues.includes("late_night") ||
    input.timeCues.includes("arrival") ||
    input.timeCues.includes("first_day") ||
    input.purpose === "business_trip" ||
    input.purpose === "meeting"
      ? "anchor_tight"
      : null;

  const socialContext =
    input.companionMode === "parent" || input.companionMode === "family"
      ? "family"
      : input.companionMode === "colleague"
        ? "colleague"
        : input.companionMode === "partner"
          ? "partner"
          : input.companionMode === "named_person"
            ? "friend"
            : input.purpose === "meeting"
              ? "meeting"
              : null;

  return {
    mealMoment,
    comfortBias,
    mobilityBias: mobilityBias ?? "normal",
    proximityBias,
    socialContext,
  };
}

function resolveConflict(input: {
  primaryPlaceHint: ContextTitlePlaceHint | null;
  anchorProfile: CanonicalPlaceProfile | null | undefined;
}): ContextTitleConflict {
  const titlePlace = input.primaryPlaceHint;
  const anchorProfile = input.anchorProfile ?? null;
  if (!titlePlace || !anchorProfile) {
    return {
      severity: "none",
      reasons: [],
      titlePlaceLabel: titlePlace?.label ?? null,
      anchorLabel: anchorProfile?.label ?? null,
      distanceKm: null,
    };
  }

  const titleToken = normalizeCompact(titlePlace.profile.searchHints.areaLabel || titlePlace.label);
  const anchorToken = normalizeCompact(anchorProfile.searchHints.areaLabel || anchorProfile.label);
  if (
    titleToken &&
    anchorToken &&
    (titleToken.includes(anchorToken) || anchorToken.includes(titleToken))
  ) {
    return {
      severity: "none",
      reasons: [],
      titlePlaceLabel: titlePlace.label,
      anchorLabel: anchorProfile.label,
      distanceKm: haversineKm(
        titlePlace.profile.lat,
        titlePlace.profile.lng,
        anchorProfile.lat,
        anchorProfile.lng,
      ),
    };
  }

  const reasons: ContextTitleConflictReason[] = [];
  if (
    titlePlace.profile.countryCode &&
    anchorProfile.countryCode &&
    titlePlace.profile.countryCode !== anchorProfile.countryCode
  ) {
    reasons.push("anchor_country_mismatch");
  }

  const distanceKm = haversineKm(
    titlePlace.profile.lat,
    titlePlace.profile.lng,
    anchorProfile.lat,
    anchorProfile.lng,
  );

  if (distanceKm > 60) {
    reasons.push("anchor_distance_mismatch");
  }
  if (reasons.length === 0 && titleToken && anchorToken && titleToken !== anchorToken) {
    reasons.push("anchor_area_mismatch");
  }

  let severity: ContextTitleConflict["severity"] = "none";
  if (reasons.includes("anchor_country_mismatch") || distanceKm > 250) {
    severity = "hard";
  } else if (reasons.length > 0) {
    severity = "soft";
  }

  return {
    severity,
    reasons,
    titlePlaceLabel: titlePlace.label,
    anchorLabel: anchorProfile.label,
    distanceKm,
  };
}

export function inferContextTitleMeaning(
  input: InferContextTitleMeaningInput,
): ContextTitleInference {
  const normalizedTitle = normalizeText(input.title);
  if (!normalizedTitle) {
    return {
      rawTitle: null,
      normalizedTitle: null,
      purpose: null,
      companionMode: "unknown",
      peopleHints: [],
      timeCues: [],
      situationHints: [],
      placeHints: [],
      primaryPlaceHint: null,
      searchBias: {
        mealMoment: null,
        comfortBias: null,
        mobilityBias: "normal",
        proximityBias: null,
        socialContext: null,
      },
      confidence: 0,
      conflict: {
        severity: "none",
        reasons: [],
        titlePlaceLabel: null,
        anchorLabel: input.anchorProfile?.label ?? null,
        distanceKm: null,
      },
    };
  }

  const peopleHints = extractPeopleHints(normalizedTitle);
  const companionMode = detectCompanionMode(normalizedTitle, peopleHints);
  const timeCues = detectTimeCues(normalizedTitle);
  const placeHints = extractPlaceHints(normalizedTitle);
  const primaryPlaceHint = placeHints[0] ?? null;
  const purpose = detectPurpose({
    title: normalizedTitle,
    companionMode,
    placeHints,
  });
  const situationHints = detectSituationHints({
    title: normalizedTitle,
    purpose,
    companionMode,
  });
  const searchBias = deriveSearchBias({
    purpose,
    companionMode,
    timeCues,
  });
  const conflict = resolveConflict({
    primaryPlaceHint,
    anchorProfile: input.anchorProfile,
  });

  const confidence = clamp(
    (purpose ? 0.2 : 0.05) +
      (primaryPlaceHint ? 0.3 : 0) +
      (timeCues.length > 0 ? 0.18 : 0) +
      (peopleHints.length > 0 ? 0.12 : 0) +
      (companionMode !== "unknown" ? 0.12 : 0) +
      (conflict.severity === "hard" ? 0.05 : 0),
    0,
    0.97,
  );

  return {
    rawTitle: input.title?.trim() || null,
    normalizedTitle,
    purpose,
    companionMode,
    peopleHints,
    timeCues,
    situationHints,
    placeHints,
    primaryPlaceHint,
    searchBias,
    confidence,
    conflict,
  };
}
