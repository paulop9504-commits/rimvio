import { copy } from "@/lib/copy/human-ko";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readContextTicketArtifact } from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { isEateryHubEnabled } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { findLatestPersonaSignal, type PersonaAxisId } from "@/lib/persona";
import type { PersonaLearnChoice } from "@/lib/persona/types";
import { findBrainQuestionFamilyAnswer } from "@/lib/situation-projection/brain-question-memory";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import {
  applyBrainAnswerOverride,
  collectLearnedSlotOverrides,
  reduceBrainQuestions,
} from "@/lib/situation-projection/brain-core/core";
import type {
  BrainProjection,
  BrainQuestionBase,
} from "@/lib/situation-projection/brain-core/types";

export const MAX_TRAVEL_BRAIN_QUESTIONS = 3 as const;

export type TravelBrainSource = "learned" | "inferred" | "observed";
export type TravelTripStyle = "packed" | "balanced" | "relaxed";
export type TravelBudgetBand = "value" | "balanced" | "premium";
export type TravelLodgingPriority = "station" | "price" | "aesthetic" | "quiet" | "family";
export type TravelFoodBias = "local" | "landmark" | "cafe" | "late_night" | "value";
export type TravelMobilityStyle = "walk" | "transit" | "taxi" | "mixed";
export type TravelArrivalEnergy = "fresh" | "tired" | "late_tired";
export type TravelDeparturePressure = "low" | "medium" | "high";
export type TravelWeatherSensitivity = "low" | "medium" | "high";
export type TravelCompanionMode = "solo" | "friends" | "couple" | "family" | "parents";
export type TravelSleepWindow = "morning" | "night" | "late_night" | "sleep_in";
export type TravelActivityDensity = "light" | "balanced" | "dense";
export type TravelShoppingIntent = "shopping" | "mixed" | "low";
export type TravelContentIntent = "photo" | "food" | "experience" | "mixed";
export type TravelAirportTransferRisk = "low" | "medium" | "high";
export type TravelMustKeepReservation = "none" | "partial" | "locked";
export type TravelMealTimingPattern = "brunch" | "lunch" | "dinner" | "late_night" | "mixed";
export type TravelInfoNeedBias = "transit_pass" | "weather" | "roaming" | "etiquette" | "mixed";
export type TravelDecisionConfidence = "exploring" | "narrowing" | "decided";
export type TravelBrainFocusAxisId =
  | "flight"
  | "lodging"
  | "eatery"
  | "place"
  | "info";

export type TravelBrainSlotValueMap = {
  trip_style: TravelTripStyle;
  budget_band: TravelBudgetBand;
  lodging_priority: TravelLodgingPriority;
  food_bias: TravelFoodBias;
  mobility_style: TravelMobilityStyle;
  arrival_energy: TravelArrivalEnergy;
  departure_pressure: TravelDeparturePressure;
  weather_sensitivity: TravelWeatherSensitivity;
  companion_mode: TravelCompanionMode;
  sleep_window: TravelSleepWindow;
  activity_density: TravelActivityDensity;
  shopping_intent: TravelShoppingIntent;
  content_intent: TravelContentIntent;
  airport_transfer_risk: TravelAirportTransferRisk;
  must_keep_reservation: TravelMustKeepReservation;
  meal_timing_pattern: TravelMealTimingPattern;
  info_need_bias: TravelInfoNeedBias;
  decision_confidence: TravelDecisionConfidence;
};

export type TravelBrainSlotId = keyof TravelBrainSlotValueMap;

export type TravelBrainSlot<T extends TravelBrainSlotId = TravelBrainSlotId> = {
  id: T;
  value: TravelBrainSlotValueMap[T];
  source: TravelBrainSource;
  confidence: number;
  reasonKo: string;
};

export type TravelBrainState = {
  destinationLabel: string;
  nights: number | null;
  startIso: string | null;
  overseas: boolean;
  slots: {
    [K in TravelBrainSlotId]: TravelBrainSlot<K>;
  };
};

export type TravelBrainQuestion = BrainQuestionBase<
  "companion_mode" | "content_intent" | "budget_band",
  PersonaAxisId
>;

export type TravelBrainUiState = {
  stage: "preparing" | "ready";
  statusKo: string;
  questionStep: number;
  questionTotal: number;
  focusAxisId: TravelBrainFocusAxisId;
};

export type TravelBrainProjection = BrainProjection<TravelBrainState, TravelBrainQuestion> & {
  ui: TravelBrainUiState;
};

export type TravelBrainSlotOverrides = Partial<
  Record<TravelBrainSlotId, TravelBrainSlotValueMap[TravelBrainSlotId]>
>;

type TravelBrainPersonaSnapshot = {
  tripStyle: TravelTripStyle | null;
  budgetBand: TravelBudgetBand | null;
  lodgingPriority: TravelLodgingPriority | null;
  foodBias: TravelFoodBias | null;
  mobilityStyle: TravelMobilityStyle | null;
  decisionConfidence: TravelDecisionConfidence | null;
  localityStyle: "local" | "landmark" | "balanced" | null;
  timePriority: "cost" | "balanced" | "time" | null;
};

const TRAVEL_BRAIN_ASKABLE_SLOTS = [
  "companion_mode",
  "content_intent",
  "budget_band",
] as const satisfies readonly TravelBrainQuestion["slotId"][];

function clampConfidence(value: number): number {
  return Math.max(0.35, Math.min(0.98, Number(value.toFixed(2))));
}

function buildSlot<T extends TravelBrainSlotId>(
  id: T,
  value: TravelBrainSlotValueMap[T],
  source: TravelBrainSource,
  confidence: number,
  reasonKo: string,
): TravelBrainSlot<T> {
  return {
    id,
    value,
    source,
    confidence: clampConfidence(confidence),
    reasonKo,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function buildTravelTextBlob(event: EventCandidate): string {
  const plan = readPlanContextFromEvent(event);
  const fields = [
    event.title,
    event.description,
    event.place,
    typeof event.metadata?.note === "string" ? event.metadata.note : "",
    typeof event.metadata?.sourceMessage === "string" ? event.metadata.sourceMessage : "",
    typeof event.metadata?.peerDisplayName === "string" ? event.metadata.peerDisplayName : "",
    plan?.peerDisplayName ?? "",
  ];
  return normalizeText(fields.filter(Boolean).join(" "));
}

function readSignalValue(axisId: PersonaAxisId): string | null {
  return findLatestPersonaSignal(axisId)?.value ?? null;
}

function readTravelBrainPersonaSnapshot(): TravelBrainPersonaSnapshot {
  const foodBias = (readSignalValue("travel.food_bias") as TravelFoodBias | null) ?? null;
  const localityStyle =
    (readSignalValue("travel.local_vs_landmark") as "local" | "landmark" | "balanced" | null) ??
    null;
  return {
    tripStyle: (readSignalValue("travel.pace") as TravelTripStyle | null) ?? null,
    budgetBand: (readSignalValue("travel.budget_band") as TravelBudgetBand | null) ?? null,
    lodgingPriority:
      (readSignalValue("travel.lodging_priority") as TravelLodgingPriority | null) ?? null,
    foodBias:
      foodBias ??
      (localityStyle === "local" || localityStyle === "landmark"
        ? localityStyle
        : null),
    mobilityStyle:
      (readSignalValue("travel.mobility_style") as TravelMobilityStyle | null) ?? null,
    decisionConfidence:
      (readSignalValue("travel.decision_confidence") as TravelDecisionConfidence | null) ?? null,
    localityStyle,
    timePriority:
      (readSignalValue("travel.time_vs_cost") as "cost" | "balanced" | "time" | null) ?? null,
  };
}

type TravelBrainFamilyMemory = {
  companionMode: TravelCompanionMode | null;
  contentIntent: TravelContentIntent | null;
  budgetBand: TravelBudgetBand | null;
};

function readTravelBrainFamilyMemory(): TravelBrainFamilyMemory {
  return {
    companionMode:
      (findBrainQuestionFamilyAnswer("travel", "companion_mode")?.value as TravelCompanionMode | null) ??
      ((readSignalValue("travel.companion_mode") as TravelCompanionMode | null) ?? null),
    contentIntent:
      (findBrainQuestionFamilyAnswer("travel", "content_intent")?.value as TravelContentIntent | null) ??
      ((readSignalValue("travel.content_intent") as TravelContentIntent | null) ?? null),
    budgetBand:
      (findBrainQuestionFamilyAnswer("travel", "budget_band")?.value as TravelBudgetBand | null) ??
      ((readSignalValue("travel.budget_band") as TravelBudgetBand | null) ?? null),
  };
}

function resolveScopedTravelLearnedSlot<T extends TravelBrainSlotId>(input: {
  slotId: T;
  inferred: TravelBrainSlot<T>;
  explicit: TravelBrainSlotValueMap[T] | null;
  familyValue: TravelBrainSlotValueMap[T] | null;
  reasonKo: string;
  conflictReasonKo: string;
}): TravelBrainSlot<T> {
  if (input.explicit) {
    return buildSlot(input.slotId, input.explicit, "learned", 0.99, input.reasonKo);
  }
  if (!input.familyValue) {
    return input.inferred;
  }
  if (
    input.inferred.source === "inferred" &&
    input.inferred.confidence >= 0.86 &&
    input.inferred.value !== input.familyValue
  ) {
    return buildSlot(
      input.slotId,
      input.inferred.value,
      "inferred",
      Math.min(0.79, input.inferred.confidence),
      input.conflictReasonKo,
    );
  }
  return buildSlot(input.slotId, input.familyValue, "learned", 0.97, input.reasonKo);
}

function resolveArrivalWindow(startIso: string | null): "early" | "day" | "late" | "unknown" {
  if (!startIso) {
    return "unknown";
  }
  const date = new Date(startIso);
  const hour = date.getHours();
  if (hour < 9) {
    return "early";
  }
  if (hour >= 18) {
    return "late";
  }
  return "day";
}

function resolveWeekdayBucket(startIso: string | null): "weekday" | "friday" | "weekend" | "unknown" {
  if (!startIso) {
    return "unknown";
  }
  const day = new Date(startIso).getDay();
  if (day === 5) {
    return "friday";
  }
  if (day === 0 || day === 6) {
    return "weekend";
  }
  return "weekday";
}

function inferCompanionMode(
  blob: string,
  event: EventCandidate,
): TravelBrainSlot<"companion_mode"> {
  const plan = readPlanContextFromEvent(event);
  if (/(부모님|엄마|아빠|어머니|아버지)/u.test(blob)) {
    return buildSlot("companion_mode", "parents", "inferred", 0.93, "부모님 동행 맥락을 읽었어요");
  }
  if (/(가족|아이|아기|유아|초등학생|가족여행)/u.test(blob)) {
    return buildSlot("companion_mode", "family", "inferred", 0.9, "가족 동행 신호가 있어요");
  }
  if (/(연인|커플|남친|여친|신혼|허니문)/u.test(blob)) {
    return buildSlot("companion_mode", "couple", "inferred", 0.9, "연인 동행으로 읽었어요");
  }
  if (/(친구|우정|친구들과|같이 가자)/u.test(blob) || (plan?.planMode === "group" && plan.peerDisplayName)) {
    return buildSlot("companion_mode", "friends", "inferred", 0.82, "친구 동행 가능성이 높아요");
  }
  return buildSlot("companion_mode", "solo", "inferred", 0.62, "개인 여행 기준으로 시작해요");
}

function inferTripStyle(input: {
  blob: string;
  nights: number | null;
  companionMode: TravelCompanionMode;
  learned: TravelTripStyle | null;
}): TravelBrainSlot<"trip_style"> {
  if (input.learned) {
    return buildSlot("trip_style", input.learned, "learned", 0.97, "이미 배운 여행 리듬이 있어요");
  }
  if (/(빡빡|알차게|많이 돌|최대한 많이|풀로)/u.test(input.blob)) {
    return buildSlot("trip_style", "packed", "inferred", 0.89, "촘촘한 일정 의도가 보여요");
  }
  if (/(느긋|여유|힐링|쉬고 싶|천천히)/u.test(input.blob)) {
    return buildSlot("trip_style", "relaxed", "inferred", 0.9, "느긋한 여행 의도를 읽었어요");
  }
  if (input.companionMode === "parents" || input.companionMode === "family") {
    return buildSlot("trip_style", "balanced", "inferred", 0.78, "동행자 기준으로 무리 없는 리듬을 우선해요");
  }
  if (input.nights != null && input.nights >= 5) {
    return buildSlot("trip_style", "relaxed", "inferred", 0.74, "긴 일정이라 여유 쪽으로 봤어요");
  }
  if (input.nights != null && input.nights <= 2) {
    return buildSlot("trip_style", "packed", "inferred", 0.72, "짧은 일정이라 밀도 높은 편으로 봤어요");
  }
  return buildSlot("trip_style", "balanced", "inferred", 0.66, "기본은 균형 잡힌 일정으로 시작해요");
}

function inferBudgetBand(input: {
  blob: string;
  nights: number | null;
  overseas: boolean;
  companionMode: TravelCompanionMode;
  learned: TravelBudgetBand | null;
}): TravelBrainSlot<"budget_band"> {
  if (input.learned) {
    return buildSlot("budget_band", input.learned, "learned", 0.97, "이미 배운 예산 성향이 있어요");
  }
  if (/(저예산|가성비|싸게|저렴|아끼|절약)/u.test(input.blob)) {
    return buildSlot("budget_band", "value", "inferred", 0.9, "예산을 아끼는 신호가 있어요");
  }
  if (/(럭셔리|호캉스|좋은 호텔|프리미엄|편하게)/u.test(input.blob)) {
    return buildSlot("budget_band", "premium", "inferred", 0.88, "편안함에 더 투자하려는 신호가 있어요");
  }
  if (input.companionMode === "parents") {
    return buildSlot("budget_band", "balanced", "inferred", 0.74, "편의와 비용을 같이 보는 쪽으로 읽었어요");
  }
  if (input.overseas && input.nights != null && input.nights >= 5) {
    return buildSlot("budget_band", "premium", "inferred", 0.68, "장기 해외 일정이라 편의 예산을 조금 넉넉히 봤어요");
  }
  return buildSlot("budget_band", "balanced", "inferred", 0.58, "기본은 중간 예산대로 시작해요");
}

function inferArrivalEnergy(input: {
  arrivalWindow: "early" | "day" | "late" | "unknown";
  weekdayBucket: "weekday" | "friday" | "weekend" | "unknown";
  overseas: boolean;
}): TravelBrainSlot<"arrival_energy"> {
  if (input.arrivalWindow === "late") {
    return buildSlot("arrival_energy", "late_tired", "inferred", 0.9, "늦은 도착이라 첫날 피로를 크게 봐요");
  }
  if (input.weekdayBucket === "friday" || input.overseas) {
    return buildSlot("arrival_energy", "tired", "inferred", 0.76, "이동 피로가 남는 첫날로 읽었어요");
  }
  return buildSlot("arrival_energy", "fresh", "inferred", 0.64, "첫날 에너지 여유가 있는 편으로 시작해요");
}

function inferAirportTransferRisk(input: {
  overseas: boolean;
  arrivalEnergy: TravelArrivalEnergy;
  companionMode: TravelCompanionMode;
}): TravelBrainSlot<"airport_transfer_risk"> {
  if (
    input.overseas ||
    input.arrivalEnergy === "late_tired" ||
    input.companionMode === "parents"
  ) {
    return buildSlot("airport_transfer_risk", "high", "inferred", 0.86, "공항 이동 부담을 크게 보는 상황이에요");
  }
  if (input.arrivalEnergy === "tired" || input.companionMode === "family") {
    return buildSlot("airport_transfer_risk", "medium", "inferred", 0.72, "공항 이동 피로를 어느 정도 반영해요");
  }
  return buildSlot("airport_transfer_risk", "low", "inferred", 0.6, "공항 이동 부담은 낮은 편으로 봐요");
}

function inferDeparturePressure(input: {
  nights: number | null;
  airportTransferRisk: TravelAirportTransferRisk;
}): TravelBrainSlot<"departure_pressure"> {
  if (input.nights != null && input.nights <= 2) {
    return buildSlot("departure_pressure", "high", "inferred", 0.84, "짧은 일정이라 마지막 날 압박이 커요");
  }
  if (input.airportTransferRisk === "high") {
    return buildSlot("departure_pressure", "high", "inferred", 0.79, "공항 이동 때문에 체크아웃 압박을 크게 봐요");
  }
  if (input.airportTransferRisk === "medium") {
    return buildSlot("departure_pressure", "medium", "inferred", 0.68, "마지막 날 동선을 조금 여유 있게 보는 게 좋아요");
  }
  return buildSlot("departure_pressure", "low", "inferred", 0.58, "마지막 날 압박은 비교적 낮아 보여요");
}

function inferContentIntent(
  blob: string,
): TravelBrainSlot<"content_intent"> {
  if (/(사진|인생샷|포토|촬영|스팟)/u.test(blob)) {
    return buildSlot("content_intent", "photo", "inferred", 0.92, "사진 중심 여행 의도가 뚜렷해요");
  }
  if (/(맛집|먹방|음식|야식|카페투어)/u.test(blob)) {
    return buildSlot("content_intent", "food", "inferred", 0.88, "먹거리 중심 일정으로 읽었어요");
  }
  if (/(체험|전시|공연|액티비티|놀이|박물관)/u.test(blob)) {
    return buildSlot("content_intent", "experience", "inferred", 0.84, "체험 위주 일정 신호가 있어요");
  }
  return buildSlot("content_intent", "mixed", "inferred", 0.54, "사진·먹거리·체험을 같이 열어 둬요");
}

function inferWeatherSensitivity(input: {
  blob: string;
  companionMode: TravelCompanionMode;
  contentIntent: TravelContentIntent;
}): TravelBrainSlot<"weather_sensitivity"> {
  if (/(비|더위|추위|폭염|실내|우천)/u.test(input.blob)) {
    return buildSlot("weather_sensitivity", "high", "inferred", 0.9, "날씨 민감 신호가 직접 보여요");
  }
  if (
    input.contentIntent === "photo" ||
    input.companionMode === "parents" ||
    input.companionMode === "family"
  ) {
    return buildSlot("weather_sensitivity", "high", "inferred", 0.74, "사진·동행자 기준으로 날씨 영향을 크게 봐요");
  }
  return buildSlot("weather_sensitivity", "medium", "inferred", 0.58, "날씨에 따라 실내 비중을 조금 조정해요");
}

function inferActivityDensity(input: {
  blob: string;
  tripStyle: TravelTripStyle;
  companionMode: TravelCompanionMode;
  contentIntent: TravelContentIntent;
}): TravelBrainSlot<"activity_density"> {
  if (/(하루 1|두 곳만|천천히|적게)/u.test(input.blob) || input.companionMode === "parents") {
    return buildSlot("activity_density", "light", "inferred", 0.84, "짧은 동선 위주로 보는 게 맞아 보여요");
  }
  if (input.tripStyle === "packed") {
    return buildSlot("activity_density", "dense", "inferred", 0.82, "많이 도는 일정 밀도로 읽었어요");
  }
  if (input.contentIntent === "photo") {
    return buildSlot("activity_density", "balanced", "inferred", 0.74, "사진 스팟은 챙기되 과밀하진 않게 봐요");
  }
  return buildSlot("activity_density", input.tripStyle === "relaxed" ? "light" : "balanced", "inferred", 0.66, "기본 밀도를 맞춰 시작해요");
}

function inferLodgingPriority(input: {
  blob: string;
  budgetBand: TravelBudgetBand;
  companionMode: TravelCompanionMode;
  arrivalEnergy: TravelArrivalEnergy;
  departurePressure: TravelDeparturePressure;
  contentIntent: TravelContentIntent;
  learned: TravelLodgingPriority | null;
}): TravelBrainSlot<"lodging_priority"> {
  if (input.learned) {
    return buildSlot("lodging_priority", input.learned, "learned", 0.97, "이미 배운 숙소 기준을 써요");
  }
  if (/(조용|휴식|숙면)/u.test(input.blob)) {
    return buildSlot("lodging_priority", "quiet", "inferred", 0.88, "조용한 숙소 선호가 보여요");
  }
  if (/(감성|분위기|뷰|예쁜 숙소|호캉스)/u.test(input.blob) || input.contentIntent === "photo") {
    return buildSlot("lodging_priority", "aesthetic", "inferred", 0.82, "사진·감성 기준이 중요해 보여요");
  }
  if (input.companionMode === "parents" || input.companionMode === "family") {
    return buildSlot("lodging_priority", "family", "inferred", 0.9, "동행자 편의를 최우선으로 봐야 해요");
  }
  if (input.budgetBand === "value") {
    return buildSlot("lodging_priority", "price", "inferred", 0.78, "예산 압박이 숙소 선택에 크게 작용해요");
  }
  if (input.arrivalEnergy !== "fresh" || input.departurePressure === "high") {
    return buildSlot("lodging_priority", "station", "inferred", 0.8, "역세권이 전체 피로를 가장 많이 줄여 줘요");
  }
  return buildSlot("lodging_priority", "station", "inferred", 0.58, "기본은 이동 편한 역세권부터 봐요");
}

function inferFoodBias(input: {
  blob: string;
  nights: number | null;
  weekdayBucket: "weekday" | "friday" | "weekend" | "unknown";
  budgetBand: TravelBudgetBand;
  contentIntent: TravelContentIntent;
  learned: TravelFoodBias | null;
  fallbackLocality: "local" | "landmark" | "balanced" | null;
}): TravelBrainSlot<"food_bias"> {
  if (input.learned) {
    return buildSlot("food_bias", input.learned, "learned", 0.97, "이미 배운 먹거리 취향을 반영해요");
  }
  if (/(카페|커피|디저트)/u.test(input.blob)) {
    return buildSlot("food_bias", "cafe", "inferred", 0.9, "카페 비중이 높은 여행으로 읽었어요");
  }
  if (/(야식|술|이자카야|심야)/u.test(input.blob) || input.weekdayBucket === "friday") {
    return buildSlot("food_bias", "late_night", "inferred", 0.82, "금요일 저녁 출발이면 야식 동선이 중요해져요");
  }
  if (/(유명|리스트|웨이팅|필수 맛집)/u.test(input.blob)) {
    return buildSlot("food_bias", "landmark", "inferred", 0.88, "유명한 곳 위주로 보는 신호가 있어요");
  }
  if (/(로컬|현지|골목)/u.test(input.blob) || input.fallbackLocality === "local") {
    return buildSlot("food_bias", "local", "inferred", 0.85, "현지 느낌을 더 중요하게 봐요");
  }
  if (input.budgetBand === "value") {
    return buildSlot("food_bias", "value", "inferred", 0.78, "식사도 가성비 축이 잘 맞아 보여요");
  }
  if (input.contentIntent === "food" && input.nights != null && input.nights >= 3) {
    return buildSlot("food_bias", "local", "inferred", 0.72, "먹거리 중심 일정이라 로컬한 곳을 더 열어 둬요");
  }
  return buildSlot("food_bias", "landmark", "inferred", 0.54, "처음엔 실패 확률 낮은 검증된 곳부터 봐요");
}

function inferMobilityStyle(input: {
  blob: string;
  companionMode: TravelCompanionMode;
  overseas: boolean;
  contentIntent: TravelContentIntent;
  learned: TravelMobilityStyle | null;
}): TravelBrainSlot<"mobility_style"> {
  if (input.learned) {
    return buildSlot("mobility_style", input.learned, "learned", 0.97, "이미 배운 이동 방식을 써요");
  }
  if (/(도보|걷|산책)/u.test(input.blob)) {
    return buildSlot("mobility_style", "walk", "inferred", 0.88, "걷는 동선 선호가 직접 보여요");
  }
  if (/(택시|우버|카카오택시)/u.test(input.blob) || input.companionMode === "parents") {
    return buildSlot("mobility_style", "taxi", "inferred", 0.88, "이동 피로를 줄이는 쪽이 맞아 보여요");
  }
  if (/(지하철|전철|패스|교통패스)/u.test(input.blob)) {
    return buildSlot("mobility_style", "transit", "inferred", 0.9, "대중교통 위주 이동 의도가 보여요");
  }
  if (input.overseas || input.contentIntent === "photo") {
    return buildSlot("mobility_style", "transit", "inferred", 0.74, "도시 이동은 대중교통+도보가 가장 자연스러워요");
  }
  return buildSlot("mobility_style", "mixed", "inferred", 0.56, "도보·교통·택시를 섞는 기본값으로 시작해요");
}

function inferSleepWindow(input: {
  blob: string;
  companionMode: TravelCompanionMode;
  foodBias: TravelFoodBias;
  weekdayBucket: "weekday" | "friday" | "weekend" | "unknown";
}): TravelBrainSlot<"sleep_window"> {
  if (/(아침형|일찍|조식|일출)/u.test(input.blob) || input.companionMode === "parents") {
    return buildSlot("sleep_window", "morning", "inferred", 0.84, "아침형 리듬으로 보는 게 맞아요");
  }
  if (/(늦잠|천천히 시작)/u.test(input.blob)) {
    return buildSlot("sleep_window", "sleep_in", "inferred", 0.88, "늦잠형 리듬 신호가 직접 있어요");
  }
  if (input.foodBias === "late_night" || input.weekdayBucket === "friday") {
    return buildSlot("sleep_window", "late_night", "inferred", 0.8, "야식 가능한 밤형 리듬으로 봐요");
  }
  return buildSlot("sleep_window", "night", "inferred", 0.58, "일반적인 밤형 리듬으로 시작해요");
}

function inferShoppingIntent(blob: string): TravelBrainSlot<"shopping_intent"> {
  if (/(쇼핑|드럭스토어|면세|아울렛|편집샵)/u.test(blob)) {
    return buildSlot("shopping_intent", "shopping", "inferred", 0.9, "쇼핑 목적이 분명해 보여요");
  }
  if (/(기념품|소품|편집숍)/u.test(blob)) {
    return buildSlot("shopping_intent", "mixed", "inferred", 0.74, "쇼핑도 일정의 한 축으로 보여요");
  }
  return buildSlot("shopping_intent", "low", "inferred", 0.56, "쇼핑 비중은 낮게 시작해요");
}

function inferMustKeepReservation(event: EventCandidate): TravelBrainSlot<"must_keep_reservation"> {
  const ticket = readContextTicketArtifact(event);
  const hasTicket = Boolean(ticket);
  const hasLodging = isLodgingHubEnabled(event);
  const hasEatery = isEateryHubEnabled(event);
  const blob = buildTravelTextBlob(event);
  if (/(예약 완료|이미 예약|확정|티켓 있음|숙소 잡았)/u.test(blob) || (hasTicket && hasLodging)) {
    return buildSlot("must_keep_reservation", "locked", "observed", 0.95, "이미 확보한 예약을 우선 유지해야 해요");
  }
  if (hasTicket || hasLodging || hasEatery) {
    return buildSlot("must_keep_reservation", "partial", "observed", 0.86, "이미 잡힌 조각이 일부 있어요");
  }
  return buildSlot("must_keep_reservation", "none", "observed", 0.7, "아직 자유롭게 탐색 가능한 상태예요");
}

function inferMealTimingPattern(input: {
  blob: string;
  foodBias: TravelFoodBias;
  sleepWindow: TravelSleepWindow;
}): TravelBrainSlot<"meal_timing_pattern"> {
  if (/(브런치)/u.test(input.blob)) {
    return buildSlot("meal_timing_pattern", "brunch", "inferred", 0.9, "브런치 리듬이 직접 보여요");
  }
  if (/(점심)/u.test(input.blob)) {
    return buildSlot("meal_timing_pattern", "lunch", "inferred", 0.88, "점심 중심 일정으로 읽었어요");
  }
  if (input.foodBias === "late_night" || input.sleepWindow === "late_night") {
    return buildSlot("meal_timing_pattern", "late_night", "inferred", 0.82, "야식까지 열어 둔 식사 리듬이 맞아요");
  }
  if (input.sleepWindow === "morning") {
    return buildSlot("meal_timing_pattern", "brunch", "inferred", 0.64, "아침형이면 브런치까지 무난해요");
  }
  return buildSlot("meal_timing_pattern", "dinner", "inferred", 0.58, "저녁 중심 식사 리듬으로 시작해요");
}

function inferInfoNeedBias(input: {
  mobilityStyle: TravelMobilityStyle;
  weatherSensitivity: TravelWeatherSensitivity;
  overseas: boolean;
  companionMode: TravelCompanionMode;
}): TravelBrainSlot<"info_need_bias"> {
  if (input.mobilityStyle === "transit") {
    return buildSlot("info_need_bias", "transit_pass", "inferred", 0.86, "교통 패스 정보가 가장 먼저 필요해 보여요");
  }
  if (input.weatherSensitivity === "high") {
    return buildSlot("info_need_bias", "weather", "inferred", 0.84, "날씨 정보가 동선을 크게 바꿀 수 있어요");
  }
  if (input.overseas) {
    return buildSlot("info_need_bias", "roaming", "inferred", 0.72, "해외 일정이라 로밍·데이터 준비가 중요해요");
  }
  if (input.companionMode === "parents") {
    return buildSlot("info_need_bias", "etiquette", "inferred", 0.7, "현지 매너·이동 팁을 먼저 챙기는 게 좋아 보여요");
  }
  return buildSlot("info_need_bias", "mixed", "inferred", 0.56, "교통·날씨·로밍을 균형 있게 열어 둬요");
}

function inferDecisionConfidence(input: {
  mustKeepReservation: TravelMustKeepReservation;
  blob: string;
  startIso: string | null;
  nights: number | null;
  learned: TravelDecisionConfidence | null;
}): TravelBrainSlot<"decision_confidence"> {
  if (input.learned) {
    return buildSlot("decision_confidence", input.learned, "learned", 0.97, "결정 단계 성향을 이미 배웠어요");
  }
  if (/(아직 고민|모르겠|추천|탐색)/u.test(input.blob)) {
    return buildSlot("decision_confidence", "exploring", "inferred", 0.88, "아직 탐색 단계라는 신호가 보여요");
  }
  if (input.mustKeepReservation === "locked") {
    return buildSlot("decision_confidence", "decided", "inferred", 0.92, "주요 예약이 이미 잡혀 있어요");
  }
  if (input.mustKeepReservation === "partial" || input.startIso || input.nights != null) {
    return buildSlot("decision_confidence", "narrowing", "inferred", 0.74, "큰 틀은 정했고 세부를 맞추는 단계로 봐요");
  }
  return buildSlot("decision_confidence", "exploring", "inferred", 0.62, "아직 넓게 탐색하는 상태로 시작해요");
}

export function buildTravelBrainState(
  event: EventCandidate,
  overrides?: TravelBrainSlotOverrides,
): TravelBrainState {
  const context = buildContextInstance({ event });
  const blob = buildTravelTextBlob(event);
  const destinationLabel = context.travel.destinationLabel || event.place?.trim() || "여행";
  const nights = context.travel.nights;
  const startIso = context.time.startIso;
  const overseas = context.travel.overseas;
  const arrivalWindow = resolveArrivalWindow(startIso);
  const weekdayBucket = resolveWeekdayBucket(startIso);
  const persona = readTravelBrainPersonaSnapshot();
  const familyMemory = readTravelBrainFamilyMemory();
  const learned = overrides ?? {};

  const companionMode = resolveScopedTravelLearnedSlot({
    slotId: "companion_mode",
    inferred: inferCompanionMode(blob, event),
    explicit: (learned.companion_mode as TravelCompanionMode | undefined) ?? null,
    familyValue: familyMemory.companionMode,
    reasonKo: "비슷한 여행에서 맞았던 동행 기준을 먼저 써요",
    conflictReasonKo: "이번 맥락의 동행 신호가 달라 보여서 다시 확인할게요",
  });
  const tripStyle = inferTripStyle({
    blob,
    nights,
    companionMode: companionMode.value,
    learned: (learned.trip_style as TravelTripStyle | undefined) ?? persona.tripStyle,
  });
  const contentIntent = resolveScopedTravelLearnedSlot({
    slotId: "content_intent",
    inferred: inferContentIntent(blob),
    explicit: (learned.content_intent as TravelContentIntent | undefined) ?? null,
    familyValue: familyMemory.contentIntent,
    reasonKo: "비슷한 여행에서 자주 고른 우선순위를 먼저 써요",
    conflictReasonKo: "이번 맥락의 목적 신호가 달라 보여서 다시 맞출게요",
  });
  const budgetBand = inferBudgetBand({
    blob,
    nights,
    overseas,
    companionMode: companionMode.value,
    learned: null,
  });
  const resolvedBudgetBand = resolveScopedTravelLearnedSlot({
    slotId: "budget_band",
    inferred: budgetBand,
    explicit: (learned.budget_band as TravelBudgetBand | undefined) ?? null,
    familyValue: familyMemory.budgetBand ?? persona.budgetBand,
    reasonKo: "비슷한 여행에서 맞았던 실용 기준을 먼저 써요",
    conflictReasonKo: "이번 맥락의 비용 신호가 달라 보여서 다시 맞출게요",
  });
  const arrivalEnergy = inferArrivalEnergy({
    arrivalWindow,
    weekdayBucket,
    overseas,
  });
  const airportTransferRisk = inferAirportTransferRisk({
    overseas,
    arrivalEnergy: arrivalEnergy.value,
    companionMode: companionMode.value,
  });
  const mustKeepReservation = inferMustKeepReservation(event);
  const departurePressure = inferDeparturePressure({
    nights,
    airportTransferRisk: airportTransferRisk.value,
  });
  const foodBias = inferFoodBias({
    blob,
    nights,
    weekdayBucket,
    budgetBand: resolvedBudgetBand.value,
    contentIntent: contentIntent.value,
    learned: (learned.food_bias as TravelFoodBias | undefined) ?? persona.foodBias,
    fallbackLocality: persona.localityStyle,
  });
  const mobilityStyle = inferMobilityStyle({
    blob,
    companionMode: companionMode.value,
    overseas,
    contentIntent: contentIntent.value,
    learned: (learned.mobility_style as TravelMobilityStyle | undefined) ?? persona.mobilityStyle,
  });
  const sleepWindow = inferSleepWindow({
    blob,
    companionMode: companionMode.value,
    foodBias: foodBias.value,
    weekdayBucket,
  });
  const weatherSensitivity = inferWeatherSensitivity({
    blob,
    companionMode: companionMode.value,
    contentIntent: contentIntent.value,
  });
  const activityDensity = inferActivityDensity({
    blob,
    tripStyle: tripStyle.value,
    companionMode: companionMode.value,
    contentIntent: contentIntent.value,
  });
  const lodgingPriority = inferLodgingPriority({
    blob,
    budgetBand: resolvedBudgetBand.value,
    companionMode: companionMode.value,
    arrivalEnergy: arrivalEnergy.value,
    departurePressure: departurePressure.value,
    contentIntent: contentIntent.value,
    learned:
      (learned.lodging_priority as TravelLodgingPriority | undefined) ?? persona.lodgingPriority,
  });
  const shoppingIntent = inferShoppingIntent(blob);
  const mealTimingPattern = inferMealTimingPattern({
    blob,
    foodBias: foodBias.value,
    sleepWindow: sleepWindow.value,
  });
  const infoNeedBias = inferInfoNeedBias({
    mobilityStyle: mobilityStyle.value,
    weatherSensitivity: weatherSensitivity.value,
    overseas,
    companionMode: companionMode.value,
  });
  const decisionConfidence = inferDecisionConfidence({
    mustKeepReservation: mustKeepReservation.value,
    blob,
    startIso,
    nights,
    learned:
      (learned.decision_confidence as TravelDecisionConfidence | undefined) ??
      persona.decisionConfidence,
  });

  return {
    destinationLabel,
    nights,
    startIso,
    overseas,
    slots: {
      trip_style: tripStyle,
      budget_band: resolvedBudgetBand,
      lodging_priority: lodgingPriority,
      food_bias: foodBias,
      mobility_style: mobilityStyle,
      arrival_energy: arrivalEnergy,
      departure_pressure: departurePressure,
      weather_sensitivity: weatherSensitivity,
      companion_mode: companionMode,
      sleep_window: sleepWindow,
      activity_density: activityDensity,
      shopping_intent: shoppingIntent,
      content_intent: contentIntent,
      airport_transfer_risk: airportTransferRisk,
      must_keep_reservation: mustKeepReservation,
      meal_timing_pattern: mealTimingPattern,
      info_need_bias: infoNeedBias,
      decision_confidence: decisionConfidence,
    },
  };
}

function questionId(eventId: string, slotId: TravelBrainQuestion["slotId"]): string {
  return `travel-brain:${eventId}:${slotId}`;
}

function buildQuestionChoices(slotId: TravelBrainQuestion["slotId"]): readonly PersonaLearnChoice[] {
  switch (slotId) {
    case "companion_mode":
      return [
        { id: "solo", labelKo: "혼자", value: "solo" },
        { id: "friends", labelKo: "친구와", value: "friends" },
        { id: "couple", labelKo: "둘이", value: "couple" },
        { id: "family", labelKo: "가족과", value: "family" },
        { id: "parents", labelKo: "부모님과", value: "parents" },
      ];
    case "content_intent":
      return [
        { id: "experience", labelKo: "핵심 경험", value: "experience" },
        { id: "food", labelKo: "먹거리", value: "food" },
        { id: "photo", labelKo: "사진", value: "photo" },
        { id: "mixed", labelKo: "균형 있게", value: "mixed" },
      ];
    case "budget_band":
      return [
        { id: "value", labelKo: "실용적으로", value: "value" },
        { id: "balanced", labelKo: "균형 있게", value: "balanced" },
        { id: "premium", labelKo: "편하게", value: "premium" },
      ];
    default:
      return [];
  }
}

function questionAxisId(slotId: TravelBrainQuestion["slotId"]): PersonaAxisId {
  switch (slotId) {
    case "companion_mode":
      return "travel.companion_mode";
    case "content_intent":
      return "travel.content_intent";
    case "budget_band":
      return "travel.budget_band";
    default:
      return "generic.preference";
  }
}

function questionTitle(
  slotId: TravelBrainQuestion["slotId"],
  destinationLabel: string,
): string {
  switch (slotId) {
    case "companion_mode":
      return copy.globe.contextBrainTravelQuestionCompanion(destinationLabel);
    case "content_intent":
      return copy.globe.contextBrainTravelQuestionIntent(destinationLabel);
    case "budget_band":
      return copy.globe.contextBrainTravelQuestionBudget(destinationLabel);
    default:
      return destinationLabel;
  }
}

function buildQuestionCandidates(state: TravelBrainState): TravelBrainQuestion[] {
  const slot = state.slots;
  const candidates: Array<TravelBrainQuestion | null> = [];
  const push = (
    slotId: TravelBrainQuestion["slotId"],
    confidence: number,
    impact: number,
    requiredWhen: boolean,
  ) => {
    const shouldAsk = confidence < 0.8 || requiredWhen;
    if (!shouldAsk) {
      return;
    }
    candidates.push({
      id: questionId(state.destinationLabel, slotId),
      slotId,
      axisId: questionAxisId(slotId),
      titleKo: questionTitle(slotId, state.destinationLabel),
      choices: buildQuestionChoices(slotId),
      impact,
    });
  };

  push(
    "companion_mode",
    slot.companion_mode.confidence,
    slot.must_keep_reservation.value === "none" ? 0.99 : 0.94,
    slot.companion_mode.source !== "learned" && slot.companion_mode.value === "solo",
  );
  push(
    "content_intent",
    slot.content_intent.confidence,
    slot.shopping_intent.value === "shopping" ? 0.97 : 0.95,
    slot.content_intent.value === "mixed",
  );
  push(
    "budget_band",
    slot.budget_band.confidence,
    slot.companion_mode.value !== "solo" || slot.arrival_energy.value !== "fresh" ? 0.93 : 0.9,
    slot.decision_confidence.value === "exploring" || slot.must_keep_reservation.value === "none",
  );

  return reduceBrainQuestions(
    candidates.filter((question): question is TravelBrainQuestion => Boolean(question)),
    MAX_TRAVEL_BRAIN_QUESTIONS,
  );
}

function resolveTravelBrainFocusAxis(input: {
  state: TravelBrainState;
  activeQuestion: TravelBrainQuestion | null;
}): TravelBrainFocusAxisId {
  if (input.activeQuestion) {
    switch (input.activeQuestion.slotId) {
      case "companion_mode":
        return input.state.slots.companion_mode.value === "parents" ||
          input.state.slots.companion_mode.value === "family"
          ? "lodging"
          : "place";
      case "content_intent":
        if (input.state.slots.content_intent.value === "food") {
          return "eatery";
        }
        if (input.state.slots.content_intent.value === "photo") {
          return "place";
        }
        return "info";
      case "budget_band":
        return input.state.slots.airport_transfer_risk.value === "high" ? "flight" : "lodging";
      default:
        return "info";
    }
  }

  if (
    input.state.slots.airport_transfer_risk.value === "high" ||
    input.state.slots.departure_pressure.value === "high"
  ) {
    return "flight";
  }
  if (
    input.state.slots.companion_mode.value === "parents" ||
    input.state.slots.companion_mode.value === "family" ||
    input.state.slots.arrival_energy.value !== "fresh"
  ) {
    return "lodging";
  }
  if (
    input.state.slots.food_bias.value === "late_night" ||
    input.state.slots.food_bias.value === "local" ||
    input.state.slots.content_intent.value === "food"
  ) {
    return "eatery";
  }
  if (
    input.state.slots.shopping_intent.value === "shopping" ||
    input.state.slots.content_intent.value === "photo" ||
    input.state.slots.content_intent.value === "experience"
  ) {
    return "place";
  }
  return "info";
}

function buildTravelBrainUiState(
  state: TravelBrainState,
  questions: readonly TravelBrainQuestion[],
): TravelBrainUiState {
  const learnedCount = TRAVEL_BRAIN_ASKABLE_SLOTS.reduce((count, slotId) => {
    return count + (state.slots[slotId].source === "learned" ? 1 : 0);
  }, 0);
  const questionTotal = Math.min(
    MAX_TRAVEL_BRAIN_QUESTIONS,
    Math.max(questions.length, learnedCount + questions.length),
  );
  const questionStep = questions.length > 0 ? Math.min(questionTotal, learnedCount + 1) : questionTotal;
  return {
    stage: questions.length > 0 ? "preparing" : "ready",
    statusKo:
      questions.length > 0
        ? copy.globe.contextBrainTravelPreparingStatus
        : copy.globe.contextBrainTravelReadyStatus,
    questionStep,
    questionTotal,
    focusAxisId: resolveTravelBrainFocusAxis({
      state,
      activeQuestion: questions[0] ?? null,
    }),
  };
}

export function buildTravelBrainProjection(
  event: EventCandidate,
  overrides?: TravelBrainSlotOverrides,
): TravelBrainProjection {
  const state = buildTravelBrainState(event, overrides);
  const questions = buildQuestionCandidates(state).map((question) => ({
    ...question,
    id: questionId(event.id, question.slotId),
  }));
  return {
    state,
    questions,
    ui: buildTravelBrainUiState(state, questions),
  };
}

export function buildTravelBrainOverridesFromState(
  state: TravelBrainState | null | undefined,
): TravelBrainSlotOverrides {
  if (!state) {
    return {};
  }
  return collectLearnedSlotOverrides<TravelBrainSlotId, TravelBrainSlotValueMap>(state.slots);
}

export function applyTravelBrainAnswer(input: {
  event: EventCandidate;
  projection: TravelBrainProjection;
  question: TravelBrainQuestion;
  choice: PersonaLearnChoice;
}): TravelBrainProjection {
  const overrides = buildTravelBrainOverridesFromState(input.projection.state);
  const nextOverrides = applyBrainAnswerOverride<TravelBrainSlotId, TravelBrainSlotValueMap>(
    overrides,
    input.question.slotId,
    input.choice,
  );
  return buildTravelBrainProjection(input.event, nextOverrides);
}
