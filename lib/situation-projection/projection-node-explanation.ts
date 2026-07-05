import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { formatLodgingStayBadgeLabel } from "@/lib/globe/context-hub/lodging-stay-window";
import { buildProjectionRelationMemo } from "@/lib/situation-projection/projection-node-presentation";
import type {
  GhostProjectionNode,
  ProjectionNode,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

function unique(values: readonly (string | null | undefined)[], max = 4): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    next.push(trimmed);
    if (next.length >= max) {
      break;
    }
  }
  return next;
}

function formatTripLength(nights: number | null | undefined): string | null {
  if (!nights || nights <= 0) {
    return null;
  }
  return `${Math.max(0, nights - 1)}박 ${nights}일`;
}

function formatBudget(value: string): string | null {
  switch (value) {
    case "value":
      return "가성비 우선";
    case "premium":
      return "편의 예산 넉넉";
    default:
      return null;
  }
}

function formatCompanion(value: string): string | null {
  switch (value) {
    case "parents":
      return "부모님 동행";
    case "family":
      return "가족 동행";
    case "friends":
      return "친구 동행";
    case "couple":
      return "둘이 이동";
    default:
      return null;
  }
}

function formatDeparturePressure(value: string): string | null {
  switch (value) {
    case "high":
      return "복귀 동선 촘촘";
    case "medium":
      return "체크아웃 여유 필요";
    default:
      return null;
  }
}

function formatLodgingPriority(value: string): string {
  switch (value) {
    case "station":
      return "역세권 우선";
    case "price":
      return "숙소 예산 우선";
    case "aesthetic":
      return "감성 숙소 우선";
    case "quiet":
      return "조용한 숙소 우선";
    case "family":
      return "동행 편의 우선";
    default:
      return "숙소 기준 반영";
  }
}

function formatFoodBias(value: string): string {
  switch (value) {
    case "local":
      return "로컬 식사 중심";
    case "landmark":
      return "검증된 맛집 중심";
    case "cafe":
      return "카페 중심";
    case "late_night":
      return "늦은 식사 중심";
    case "value":
      return "가성비 식사 중심";
    default:
      return "식사 취향 반영";
  }
}

function formatMealTiming(value: string): string | null {
  switch (value) {
    case "late_night":
      return "야식 타이밍";
    case "brunch":
      return "브런치 리듬";
    case "dinner":
      return "저녁 중심";
    default:
      return null;
  }
}

function formatContentIntent(value: string): string | null {
  switch (value) {
    case "photo":
      return "사진 우선";
    case "food":
      return "먹거리 우선";
    case "experience":
      return "체험 우선";
    default:
      return null;
  }
}

function formatActivityDensity(value: string): string | null {
  switch (value) {
    case "light":
      return "가벼운 일정";
    case "dense":
      return "밀도 높은 일정";
    default:
      return null;
  }
}

function formatShoppingIntent(value: string): string | null {
  switch (value) {
    case "shopping":
      return "쇼핑 비중 큼";
    default:
      return null;
  }
}

function formatInfoNeed(value: string): string {
  switch (value) {
    case "transit_pass":
      return "교통 정보 우선";
    case "weather":
      return "날씨 체크 우선";
    case "roaming":
      return "로밍 준비 우선";
    case "etiquette":
      return "현지 팁 우선";
    default:
      return "기본 정보 정리";
  }
}

function formatMobility(value: string): string | null {
  switch (value) {
    case "transit":
      return "대중교통 이동";
    case "taxi":
      return "택시 이동";
    case "walk":
      return "도보 이동";
    default:
      return null;
  }
}

function formatWeather(value: string): string | null {
  return value === "high" ? "날씨 영향 큼" : null;
}

function formatDecision(value: string): string | null {
  switch (value) {
    case "exploring":
      return "아직 탐색 중";
    case "decided":
      return "주요 예약 확정";
    default:
      return null;
  }
}

function formatAirportRisk(value: string): string | null {
  switch (value) {
    case "high":
      return "공항 이동 부담 큼";
    case "medium":
      return "공항 이동 체크 필요";
    default:
      return null;
  }
}

function isGhostAxisNode<TAxis extends GhostProjectionNode["axisId"]>(
  node: ProjectionNode,
  axisId: TAxis,
): node is GhostProjectionNode & { axisId: TAxis } {
  return node.kind === "ghost" && node.axisId === axisId;
}

function buildGhostTextBlob(node: GhostProjectionNode): string {
  return [
    node.label,
    node.searchQuery,
    node.relationReasonKo,
    node.playbookReasonKo,
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveBasecampNode(
  node: ProjectionNode,
  manifest: SituationProjectionManifest,
): GhostProjectionNode | null {
  if (isGhostAxisNode(node, "lodging")) {
    return node;
  }
  const lodgingNodes = manifest.nodes.filter(
    (entry): entry is GhostProjectionNode => isGhostAxisNode(entry, "lodging"),
  );
  return (
    lodgingNodes.find((entry) => entry.emphasis === "focus" && entry.stayWindow?.checkInIso) ??
    lodgingNodes.find((entry) => entry.emphasis === "main" && entry.stayWindow?.checkInIso) ??
    lodgingNodes.find((entry) => entry.stayWindow?.checkInIso) ??
    lodgingNodes.find((entry) => entry.emphasis === "focus") ??
    lodgingNodes.find((entry) => entry.emphasis === "main") ??
    lodgingNodes[0] ??
    null
  );
}

function computeDistanceFromBasecampKm(
  node: ProjectionNode,
  basecamp: GhostProjectionNode | null,
): number | null {
  if (!basecamp || basecamp.lat == null || basecamp.lng == null) {
    return null;
  }
  if (isGhostAxisNode(node, "lodging")) {
    if (node.placeId && basecamp.placeId && node.placeId === basecamp.placeId) {
      return 0;
    }
    if (node.lat == null || node.lng == null) {
      return null;
    }
    return haversineKm(node.lat, node.lng, basecamp.lat, basecamp.lng);
  }
  if (node.kind !== "ghost" || node.lat == null || node.lng == null) {
    return null;
  }
  return haversineKm(node.lat, node.lng, basecamp.lat, basecamp.lng);
}

function formatReturnBurden(distanceKm: number | null): string | null {
  if (distanceKm == null) {
    return null;
  }
  if (distanceKm <= 0.9) {
    return "숙소 복귀 부담 적음";
  }
  if (distanceKm <= 1.8) {
    return "숙소 기준 이동이 가벼움";
  }
  if (distanceKm <= 3.2) {
    return "숙소에서 크게 벗어나지 않음";
  }
  return null;
}

function formatArrivalFacet(
  node: GhostProjectionNode,
  distanceKm: number | null,
  arrivalEnergy: string,
): string | null {
  if (arrivalEnergy === "fresh") {
    return null;
  }
  switch (node.axisId) {
    case "lodging":
      return arrivalEnergy === "late_tired"
        ? "첫날 체크인 부담을 줄이는 축"
        : "도착 뒤 무리 없는 베이스캠프";
    case "eatery":
      if (distanceKm == null || distanceKm > 1.8) {
        return null;
      }
      return arrivalEnergy === "late_tired"
        ? "체크인 뒤 바로 한 끼로 편함"
        : "첫날 저녁 동선으로 무리 없음";
    case "place":
      return distanceKm != null && distanceKm <= 2.2
        ? "체크인 전후 가볍게 넣기 좋음"
        : null;
    case "info": {
      const blob = buildGhostTextBlob(node);
      if (/날씨|weather/iu.test(blob)) {
        return "첫날 옷차림·실내 비중 정리에 도움";
      }
      if (/로밍|esim|wifi|데이터/iu.test(blob)) {
        return "도착 직후 연결 준비에 도움";
      }
      if (/교통|동선|공항|패스|route|transit|airport/iu.test(blob)) {
        return "체크인 전후 이동 정리에 도움";
      }
      return null;
    }
    default:
      return null;
  }
}

function formatDepartureFacet(
  node: GhostProjectionNode,
  distanceKm: number | null,
  departurePressure: string,
): string | null {
  if (departurePressure === "low") {
    return null;
  }
  switch (node.axisId) {
    case "lodging":
      return departurePressure === "high"
        ? "마지막 날 복귀 여유를 같이 봄"
        : "체크아웃 여유를 남기기 좋음";
    case "eatery":
      return distanceKm != null && distanceKm <= 1.2
        ? "체크아웃 전 짧게 들르기 좋음"
        : null;
    case "place":
      return distanceKm != null && distanceKm <= 1.6
        ? "마지막 날 가볍게 묶기 좋음"
        : null;
    case "info": {
      const blob = buildGhostTextBlob(node);
      if (/교통|동선|공항|패스|route|transit|airport/iu.test(blob)) {
        return "체크인·체크아웃 동선 정리에 도움";
      }
      return "마지막 날 준비를 정리하기 좋음";
    }
    case "flight":
      return "숙소 체크아웃과 같이 맞춰 보기 좋음";
    default:
      return null;
  }
}

function buildLodgingAwareFactors(
  node: ProjectionNode,
  manifest: SituationProjectionManifest,
): string[] {
  const travel = manifest.travelBrain;
  if (!travel || node.kind !== "ghost") {
    return [];
  }
  const basecamp = resolveBasecampNode(node, manifest);
  const distanceKm = computeDistanceFromBasecampKm(node, basecamp);
  const stayBadgeLabel = formatLodgingStayBadgeLabel(
    (isGhostAxisNode(node, "lodging") ? node.stayWindow : basecamp?.stayWindow) ?? null,
  );
  const arrivalFacet = formatArrivalFacet(
    node,
    distanceKm,
    travel.state.slots.arrival_energy.value,
  );
  const departureFacet = formatDepartureFacet(
    node,
    distanceKm,
    travel.state.slots.departure_pressure.value,
  );
  const returnBurden =
    node.axisId === "eatery" || node.axisId === "place"
      ? formatReturnBurden(distanceKm)
      : null;

  switch (node.axisId) {
    case "lodging":
      return unique([
        stayBadgeLabel,
        arrivalFacet,
        departureFacet,
      ], 3);
    case "eatery":
      return unique([
        arrivalFacet,
        returnBurden,
      ], 2);
    case "place":
      return unique([
        arrivalFacet,
        departureFacet,
        returnBurden,
      ], 3);
    case "info":
      return unique([
        departureFacet ?? arrivalFacet,
      ], 1);
    case "flight":
      return unique([departureFacet], 1);
    default:
      return [];
  }
}

function buildTravelFactors(
  node: ProjectionNode,
  manifest: SituationProjectionManifest,
): string[] {
  const travel = manifest.travelBrain;
  if (!travel) {
    return [];
  }
  const slots = travel.state.slots;
  const destinationContext = travel.state.destinationLabel
    ? `${travel.state.destinationLabel} 기준`
    : null;
  const tripLengthContext = formatTripLength(travel.state.nights);
  const context =
    node.kind === "ghost"
      ? unique([destinationContext], 1)
      : unique([destinationContext, tripLengthContext], 2);
  const lodgingAware = buildLodgingAwareFactors(node, manifest);
  if (node.kind !== "ghost") {
    return context;
  }
  switch (node.axisId) {
    case "lodging":
      return unique([
        ...context,
        ...lodgingAware,
        formatLodgingPriority(slots.lodging_priority.value),
        formatCompanion(slots.companion_mode.value),
        formatBudget(slots.budget_band.value),
      ]);
    case "eatery":
      return unique([
        ...context,
        ...lodgingAware,
        formatFoodBias(slots.food_bias.value),
        formatMealTiming(slots.meal_timing_pattern.value),
        formatBudget(slots.budget_band.value),
        formatContentIntent(slots.content_intent.value),
      ]);
    case "place":
      return unique([
        ...context,
        ...lodgingAware,
        formatContentIntent(slots.content_intent.value),
        formatActivityDensity(slots.activity_density.value),
        formatShoppingIntent(slots.shopping_intent.value),
        formatCompanion(slots.companion_mode.value),
      ]);
    case "info":
      return unique([
        ...context,
        ...lodgingAware,
        formatInfoNeed(slots.info_need_bias.value),
        formatMobility(slots.mobility_style.value),
        formatWeather(slots.weather_sensitivity.value),
        formatDecision(slots.decision_confidence.value),
      ]);
    case "flight":
      return unique([
        ...context,
        ...lodgingAware,
        formatAirportRisk(slots.airport_transfer_risk.value),
        formatDeparturePressure(slots.departure_pressure.value),
        formatBudget(slots.budget_band.value),
      ]);
    case "ticket":
      return unique([
        ...context,
        formatDecision(slots.decision_confidence.value),
      ]);
    default:
      return context;
  }
}

export function buildProjectionNodeExplanation(input: {
  node: ProjectionNode;
  manifest: SituationProjectionManifest | null;
  event?: EventCandidate | null;
  rootLabel?: string | null;
  supportLabel?: string | null;
}): {
  memoKo: string;
  factorsKo: string[];
} {
  const rootLabel =
    input.rootLabel?.trim() ||
    (input.event && input.manifest?.nodes.find(
      (node) => node.kind === "solid" && node.eventId === input.event?.id,
    )?.label) ||
    input.event?.title ||
    "주맥락";
  const memoKo = buildProjectionRelationMemo({
    node: input.node,
    rootLabel,
    supportLabel: input.supportLabel,
  });
  const factorsKo =
    input.manifest?.situationType === "travel"
      ? buildTravelFactors(input.node, input.manifest)
      : unique([
          input.event?.place?.trim() ? `${input.event.place.trim()} 기준` : null,
          input.node.kind === "ghost" ? input.node.relationReasonKo ?? input.node.playbookReasonKo : null,
        ], 3);
  const mediaFactors =
    input.node.kind === "ghost" && input.node.candidateOrigin === "media_inferred"
      ? unique(
          [
            input.node.candidateConfidence != null
              ? `후보 신뢰 ${Math.round(input.node.candidateConfidence * 100)}%`
              : null,
            input.node.cuisineHint?.trim() ? `${input.node.cuisineHint.trim()} 단서` : null,
            ...(input.node.situationalHintsKo ?? []),
          ],
          4,
        )
      : [];
  return {
    memoKo,
    factorsKo: unique([...factorsKo, ...mediaFactors], 6),
  };
}
