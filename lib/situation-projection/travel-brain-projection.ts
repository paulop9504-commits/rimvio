import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildContextHubFlightBooking } from "@/lib/globe/context-hub/build-context-hub-flight-booking-url";
import { readContextTicketArtifact } from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import { describeGhostProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import type {
  TravelBrainProjection,
  TravelBrainState,
} from "@/lib/situation-projection/travel-brain-personalization";
import type { GhostProjectionNode } from "@/lib/situation-projection/types";

const MAX_TRAVEL_ITEMS_PER_AXIS = 3;
const MAX_TRAVEL_MICRO_RESOURCE_ITEMS = 4;
const MAX_TRAVEL_ACTIVITY_ITEMS = 2;

function buildGhostNode(input: {
  axisId: GhostProjectionNode["axisId"];
  id: string;
  label: string;
  playbookReasonKo: string;
  featureId?: string | null;
  actionKind?: GhostProjectionNode["actionKind"];
  hubServiceId?: GhostProjectionNode["hubServiceId"];
  href?: string | null;
  internalRoute?: boolean;
  searchQuery?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  stayWindow?: GhostProjectionNode["stayWindow"];
  inferred?: boolean;
  emphasis?: GhostProjectionNode["emphasis"];
  surfacePlacement?: GhostProjectionNode["surfacePlacement"];
  semanticTypeLabelKo?: string | null;
  relationLabelKo?: string | null;
  cuisineHint?: string | null;
  previewImageUrl?: string | null;
  rating?: number | null;
}): GhostProjectionNode {
  const semantic = describeGhostProjectionNodeSemantic({
    axisId: input.axisId,
    relationReasonKo: input.playbookReasonKo,
  });
  return {
    kind: "ghost",
    id: input.id,
    axisId: input.axisId,
    label: input.label,
    virtual: true,
    inferred: input.inferred,
    featureId: input.featureId ?? null,
    playbookReasonKo: input.playbookReasonKo,
    actionKind: input.actionKind ?? null,
    hubServiceId: input.hubServiceId ?? null,
    href: input.href ?? null,
    internalRoute: input.internalRoute ?? false,
    searchQuery: input.searchQuery ?? null,
    placeId: input.placeId ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    mapsUrl: input.mapsUrl ?? null,
    stayWindow: input.stayWindow ?? null,
    emphasis: input.emphasis ?? "aux",
    surfacePlacement: input.surfacePlacement ?? "root_branch",
    semanticType: semantic.semanticType,
    semanticTypeLabelKo: input.semanticTypeLabelKo ?? semantic.semanticTypeLabelKo,
    ontologyRole: semantic.ontologyRole,
    relationLabelKo: input.relationLabelKo ?? semantic.relationLabelKo,
    relationReasonKo: semantic.relationReasonKo,
    cuisineHint: input.cuisineHint ?? null,
    previewImageUrl: input.previewImageUrl ?? null,
    rating: input.rating ?? null,
  };
}

function pick<T>(items: readonly T[], max = MAX_TRAVEL_ITEMS_PER_AXIS): T[] {
  return [...items].slice(0, max);
}

function finalizeTravelAxisGhosts(
  axisId: GhostProjectionNode["axisId"],
  items: readonly GhostProjectionNode[],
  travel: TravelBrainProjection,
  maxItems = MAX_TRAVEL_ITEMS_PER_AXIS,
): GhostProjectionNode[] {
  return pick(items, maxItems).map((item, index) => ({
    ...item,
    emphasis:
      index === 0
        ? axisId === travel.ui.focusAxisId
          ? "focus"
          : "main"
        : "aux",
  }));
}

function resolveTravelDestination(event: EventCandidate): string {
  return event.place?.trim() || event.title.trim() || "여행";
}

function buildSearchHref(eventId: string, query: string): string {
  const params = new URLSearchParams({
    contextEventId: eventId,
    q: query,
  });
  return `/search?${params.toString()}`;
}

function formatTripLength(state: TravelBrainState): string | null {
  if (!state.nights || state.nights <= 0) {
    return null;
  }
  return `${Math.max(0, state.nights - 1)}박 ${state.nights}일`;
}

function resolveActivityEntries(input: {
  destination: string;
  travel: TravelBrainProjection;
}): Array<{
  id: string;
  label: string;
  query: string;
  reasonKo: string;
}> {
  const { destination, travel } = input;
  const slots = travel.state.slots;
  if (slots.shopping_intent.value === "shopping") {
    return [
      {
        id: "shopping-street",
        label: "쇼핑 동선",
        query: `${destination} 쇼핑 거리`,
        reasonKo: "쇼핑 비중이 커서 구역 동선부터 잡는 게 좋아요",
      },
      {
        id: "rest-stop",
        label: "쉬는 스팟",
        query: `${destination} 쇼핑 중간 쉬는 카페`,
        reasonKo: "구매 동선 사이 쉬는 지점을 같이 두면 무리가 덜해요",
      },
    ];
  }
  if (slots.content_intent.value === "photo") {
    return [
      {
        id: "photo-spot",
        label: "사진 스팟",
        query: `${destination} 사진 스팟`,
        reasonKo: "사진 우선이면 빛 좋은 스팟을 먼저 박아 두는 게 좋아요",
      },
      {
        id: "sunset-walk",
        label: "노을 산책",
        query: `${destination} 노을 산책 코스`,
        reasonKo: "이동 리듬보다 장면이 남는 동선을 먼저 깔아 둬요",
      },
    ];
  }
  if (slots.content_intent.value === "experience") {
    return [
      {
        id: "signature-spot",
        label: "핵심 스팟",
        query: `${destination} 꼭 가볼 곳`,
        reasonKo: "체험 위주 일정이라 대표 스팟을 먼저 묶는 편이 좋아요",
      },
      {
        id: "culture-night",
        label: "전시·공연",
        query: `${destination} 전시 공연`,
        reasonKo: "체험 밀도를 올릴 수 있는 현장 후보예요",
      },
    ];
  }
  if (
    slots.activity_density.value === "light" ||
    slots.trip_style.value === "relaxed" ||
    slots.companion_mode.value === "parents"
  ) {
    return [
      {
        id: "walk",
        label: "산책 코스",
        query: `${destination} 가볍게 걷기 좋은 곳`,
        reasonKo: "무리 없는 이동으로 이어질 곳을 먼저 두는 편이 좋아요",
      },
      {
        id: "rest-spot",
        label: "쉬는 스팟",
        query: `${destination} 쉬기 좋은 장소`,
        reasonKo: "짧게 머물러도 만족감이 높은 곳을 같이 잡아 둬요",
      },
    ];
  }
  return [
    {
      id: "signature",
      label: "핵심 스팟",
      query: `${destination} 대표 스팟`,
      reasonKo: "처음엔 핵심 장소를 박아 두면 전체 동선이 빨리 잡혀요",
    },
    {
      id: "play-route",
      label: "플레이 동선",
      query: `${destination} 놀거리 코스`,
      reasonKo: "식사·숙소 사이에 넣을 갈 곳 축이에요",
    },
  ];
}

function scoreLodgingRowForTravel(
  row: ReturnType<typeof readLodgingInventoryRows>[number],
  travel: TravelBrainProjection,
): number {
  const slots = travel.state.slots;
  const blob = [row.name, row.partnerLabel].filter(Boolean).join(" ");
  let score = 0;
  if (slots.lodging_priority.value === "station" && /역|station|terminal|난바|우메다/u.test(blob)) {
    score += 4;
  }
  if (slots.lodging_priority.value === "quiet" && /quiet|garden|stay|forest|조용/u.test(blob)) {
    score += 4;
  }
  if (slots.lodging_priority.value === "aesthetic" && /design|boutique|view|감성|뷰/u.test(blob)) {
    score += 4;
  }
  if (slots.lodging_priority.value === "family" && /suite|family|residence|kids/u.test(blob)) {
    score += 4;
  }
  if (slots.budget_band.value === "value" && row.priceKrw != null && row.priceKrw <= 120_000) {
    score += 3;
  }
  return score;
}

function scoreEateryRowForTravel(
  row: ReturnType<typeof readEateryInventoryRows>[number],
  travel: TravelBrainProjection,
): number {
  const slots = travel.state.slots;
  const blob = [
    row.name,
    row.cuisineHint,
    row.categoryLabel,
    row.specialReasonKo,
    row.providerLabel,
  ]
    .filter(Boolean)
    .join(" ");
  let score = 0;
  if (slots.food_bias.value === "local" && /로컬|현지|골목/u.test(blob)) {
    score += 5;
  }
  if (slots.food_bias.value === "landmark" && ((row.rating ?? 0) >= 4.4 || /인기|유명|웨이팅/u.test(blob))) {
    score += 5;
  }
  if (slots.food_bias.value === "cafe" && /카페|coffee|dessert|디저트/u.test(blob)) {
    score += 5;
  }
  if (slots.food_bias.value === "late_night" && (row.openNow === true || /야식|심야/u.test(blob))) {
    score += 5;
  }
  if (slots.food_bias.value === "value" && /가성비|저렴/u.test(blob)) {
    score += 5;
  }
  return score;
}

function buildFlightGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const destination = resolveTravelDestination(event);
  const slots = travel.state.slots;
  const airports = suggestDepartureHubOptions({ destinationPlace: destination })
    .slice(0, 2)
    .map((airport) => {
      const booking = buildContextHubFlightBooking({
        airport,
        destinationPlace: destination,
        departDateIso: event.datetime ?? null,
      });
      return buildGhostNode({
        axisId: "flight",
        id: `ghost:flight:${airport.id}`,
        label: `${airport.shortLabelKo} 출발`,
        playbookReasonKo:
          slots.airport_transfer_risk.value === "high"
            ? `${airport.reasonKo || "이동 부담 낮은 출발"} · 공항 부담을 줄이는 쪽`
            : airport.reasonKo || "바로 이어지는 출발 허브",
        featureId: "flight",
        actionKind: "hub_service",
        hubServiceId: "flight",
        href: booking.url,
        internalRoute: false,
        searchQuery: `${airport.iata} ${destination} 항공권`,
        lat: airport.lat,
        lng: airport.lng,
        surfacePlacement: "map_anchor",
      });
    });

  const supportQuery =
    slots.airport_transfer_risk.value === "high"
      ? `${destination} 공항 이동 심야 교통`
      : slots.budget_band.value === "value"
        ? `${destination} 특가 항공권`
        : slots.departure_pressure.value === "high"
          ? `${destination} 공항 이동 체크아웃 동선`
          : `${destination} 공항 이동`;

  return finalizeTravelAxisGhosts("flight", [
    ...airports,
    buildGhostNode({
      axisId: "flight",
      id: "ghost:flight:transfer-check",
      label:
        slots.airport_transfer_risk.value === "high"
          ? "공항 이동"
          : slots.budget_band.value === "value"
            ? "특가 항공"
            : "이동 점검",
      playbookReasonKo:
        slots.airport_transfer_risk.value === "high"
          ? "늦은 도착·공항 부담을 먼저 낮추기"
          : slots.budget_band.value === "value"
            ? "예산에 맞는 항공권부터 빠르게 좁히기"
            : "출발·복귀 시간을 동선에 맞추기",
      featureId: "ai_search",
      actionKind: "hub_service",
      hubServiceId: "ai_search",
      href: buildSearchHref(event.id, supportQuery),
      internalRoute: true,
      searchQuery: supportQuery,
      inferred: true,
      surfacePlacement: "root_branch",
    }),
  ], travel);
}

function buildLodgingGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const destination = resolveTravelDestination(event);
  const slots = travel.state.slots;
  const stayWindow = buildLodgingStayWindow({ event });
  const inventory = [...readLodgingInventoryRows(event)]
    .sort(
      (left, right) =>
        scoreLodgingRowForTravel(right, travel) - scoreLodgingRowForTravel(left, travel),
    )
    .slice(0, MAX_TRAVEL_MICRO_RESOURCE_ITEMS);
  if (inventory.length > 0) {
    return finalizeTravelAxisGhosts("lodging", [
      ...inventory.map((row) =>
        buildGhostNode({
          axisId: "lodging",
          id: `ghost:lodging:${row.placeId}`,
          label: row.name,
          playbookReasonKo:
            row.partnerLabel?.trim() ||
            (slots.lodging_priority.value === "station"
              ? "이동 부담을 줄이는 숙소"
              : slots.lodging_priority.value === "family"
                ? "동행자 편의를 우선하는 숙소"
                : "지금 상황에 맞는 숙소"),
          featureId: "lodging",
          actionKind: "context_run",
          hubServiceId: "lodging",
          searchQuery: `${destination} ${row.name} 숙소`,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
          previewImageUrl: row.images[0] ?? null,
          cuisineHint: row.partnerLabel?.trim() || null,
          stayWindow: row.stayWindow ?? stayWindow,
          inferred: true,
          surfacePlacement: row.lat != null && row.lng != null ? "map_anchor" : "root_branch",
        }),
      ),
    ], travel, MAX_TRAVEL_MICRO_RESOURCE_ITEMS);
  }

  const fallbackEntries =
    slots.lodging_priority.value === "station"
      ? [
          { id: "station", label: "역세권 숙소", query: `${destination} 역세권 숙소`, reasonKo: "지하철·도보 동선을 먼저 가볍게" },
          { id: "transfer", label: "공항 이동 편함", query: `${destination} 공항 이동 편한 숙소`, reasonKo: "늦은 도착·복귀 부담을 줄이기" },
          { id: "value", label: "가성비 숙소", query: `${destination} 가성비 숙소`, reasonKo: "예산도 함께 지키는 축" },
        ]
      : slots.lodging_priority.value === "price"
        ? [
            { id: "value", label: "가성비 숙소", query: `${destination} 가성비 숙소`, reasonKo: "예산을 가장 덜 쓰는 축" },
            { id: "station", label: "역 가까운 숙소", query: `${destination} 역 가까운 숙소`, reasonKo: "이동비까지 아끼기" },
            { id: "late", label: "늦게 도착해도 편한 곳", query: `${destination} 늦은 체크인 숙소`, reasonKo: "첫날 피로를 덜어 주기" },
          ]
        : slots.lodging_priority.value === "aesthetic"
          ? [
              { id: "aesthetic", label: "감성 숙소", query: `${destination} 감성 숙소`, reasonKo: "사진·분위기 축을 먼저 반영" },
              { id: "view", label: "뷰 좋은 숙소", query: `${destination} 뷰 좋은 숙소`, reasonKo: "기억에 남는 숙소 축" },
              { id: "station", label: "이동 편한 감성 숙소", query: `${destination} 역세권 감성 숙소`, reasonKo: "감성과 동선 둘 다 챙기기" },
            ]
          : slots.lodging_priority.value === "quiet"
            ? [
                { id: "quiet", label: "조용한 숙소", query: `${destination} 조용한 숙소`, reasonKo: "숙면과 회복이 우선" },
                { id: "relaxed", label: "휴식형 숙소", query: `${destination} 휴식 좋은 숙소`, reasonKo: "느긋한 일정에 맞추기" },
                { id: "station", label: "너무 멀지 않은 곳", query: `${destination} 조용한 역세권 숙소`, reasonKo: "조용함과 이동 편의의 균형" },
              ]
            : [
                { id: "family", label: "가족 편한 숙소", query: `${destination} 가족 편한 숙소`, reasonKo: "부모님·가족 동선에 맞추기" },
                { id: "taxi", label: "택시 이동 편한 곳", query: `${destination} 택시 이동 편한 숙소`, reasonKo: "이동 피로를 줄이기" },
                { id: "station", label: "공항 이동 쉬운 곳", query: `${destination} 공항 이동 편한 숙소`, reasonKo: "체크인·체크아웃 부담 낮추기" },
              ];

  return finalizeTravelAxisGhosts("lodging", fallbackEntries.map((entry) =>
    buildGhostNode({
      axisId: "lodging",
      id: `ghost:lodging:${entry.id}`,
      label: entry.label,
      playbookReasonKo: entry.reasonKo,
      featureId: "lodging",
      actionKind: "context_run",
      hubServiceId: "lodging",
      searchQuery: entry.query,
      stayWindow,
      inferred: true,
      surfacePlacement: "root_branch",
    }),
  ), travel);
}

function buildEateryGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const destination = resolveTravelDestination(event);
  const slots = travel.state.slots;
  const inventory = [...readEateryInventoryRows(event)]
    .sort(
      (left, right) =>
        scoreEateryRowForTravel(right, travel) - scoreEateryRowForTravel(left, travel),
    )
    .slice(0, MAX_TRAVEL_MICRO_RESOURCE_ITEMS);
  if (inventory.length > 0) {
    return finalizeTravelAxisGhosts("eatery", [
      ...inventory.map((row) =>
        buildGhostNode({
          axisId: "eatery",
          id: `ghost:eatery:${row.placeId}`,
          label: row.name,
          playbookReasonKo:
            row.specialReasonKo ??
            row.cuisineHint ??
            row.categoryLabel ??
            "이 맥락과 이어지는 맛집",
          featureId: "eatery_search",
          actionKind: "context_run",
          hubServiceId: "eatery",
          searchQuery: `${destination} ${row.name} 맛집`,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
          mapsUrl: row.mapsUrl ?? null,
          previewImageUrl: row.images[0] ?? null,
          cuisineHint: row.cuisineHint ?? row.categoryLabel ?? null,
          rating: row.rating ?? null,
          inferred: true,
          surfacePlacement: row.lat != null && row.lng != null ? "map_anchor" : "root_branch",
        }),
      ),
    ], travel, MAX_TRAVEL_MICRO_RESOURCE_ITEMS);
  }

  const fallbackEntries =
    slots.food_bias.value === "local"
      ? [
          { id: "local", label: "로컬 맛집", query: `${destination} 로컬 맛집`, reasonKo: "현지 감도가 높은 식사부터 보기" },
          { id: "night", label: "야식 가능", query: `${destination} 야식 맛집`, reasonKo: "금요일 저녁·늦은 도착에도 이어지게" },
          { id: "value", label: "가성비 한 끼", query: `${destination} 가성비 맛집`, reasonKo: "부담 없이 여러 곳 가보기" },
        ]
      : slots.food_bias.value === "landmark"
        ? [
            { id: "landmark", label: "유명 맛집", query: `${destination} 유명 맛집`, reasonKo: "짧은 일정에 실패 확률을 낮추기" },
            { id: "photo", label: "사진 남는 식당", query: `${destination} 분위기 좋은 맛집`, reasonKo: "콘텐츠 가치가 높은 식사 축" },
            { id: "cafe", label: "검증된 카페", query: `${destination} 인기 카페`, reasonKo: "중간 휴식 동선까지 같이 보기" },
          ]
        : slots.food_bias.value === "cafe"
          ? [
              { id: "cafe", label: "카페 중심", query: `${destination} 감도 높은 카페`, reasonKo: "사진·휴식 축을 먼저 반영" },
              { id: "brunch", label: "브런치", query: `${destination} 브런치 카페`, reasonKo: "느긋한 시작 리듬에 맞추기" },
              { id: "dessert", label: "디저트", query: `${destination} 디저트 카페`, reasonKo: "짧은 이동 사이 쉬기 좋게" },
            ]
          : slots.food_bias.value === "late_night"
            ? [
                { id: "late", label: "야식 가능", query: `${destination} 심야 맛집`, reasonKo: "늦은 도착 뒤 바로 먹을 수 있게" },
                { id: "izakaya", label: "밤 동선", query: `${destination} 밤에 가기 좋은 맛집`, reasonKo: "밤형 리듬에 맞추기" },
                { id: "quick", label: "빠르게 한 끼", query: `${destination} 늦게까지 하는 간단한 식사`, reasonKo: "체크인 전후 부담을 낮추기" },
              ]
            : [
                { id: "value", label: "가성비 맛집", query: `${destination} 가성비 맛집`, reasonKo: "예산 대비 만족도가 높은 식사" },
                { id: "local", label: "현지 한 끼", query: `${destination} 현지식`, reasonKo: "기억에 남는 한 끼를 같이 보기" },
                { id: "cafe", label: "쉬는 카페", query: `${destination} 휴식 카페`, reasonKo: "동선 중간 쉬어 가기" },
              ];

  return finalizeTravelAxisGhosts("eatery", fallbackEntries.map((entry) =>
    buildGhostNode({
      axisId: "eatery",
      id: `ghost:eatery:${entry.id}`,
      label: entry.label,
      playbookReasonKo: entry.reasonKo,
      featureId: "eatery_search",
      actionKind: "context_run",
      hubServiceId: "eatery",
      searchQuery: entry.query,
      inferred: true,
      surfacePlacement: "root_branch",
    }),
  ), travel);
}

function buildPlaceGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const destination = resolveTravelDestination(event);
  const anchor = resolveContextLodgingDestinationAnchor(event);
  return finalizeTravelAxisGhosts(
    "place",
    resolveActivityEntries({ destination, travel }).map((entry) =>
      buildGhostNode({
        axisId: "place",
        id: `ghost:place:${entry.id}`,
        label: entry.label,
        playbookReasonKo: entry.reasonKo,
        featureId: "ai_search",
        actionKind: "hub_service",
        href: buildSearchHref(event.id, entry.query),
        internalRoute: true,
        searchQuery: entry.query,
        lat: anchor.lat,
        lng: anchor.lng,
        inferred: true,
        surfacePlacement: "map_anchor",
        semanticTypeLabelKo: "플레이",
        relationLabelKo: "갈 곳 축",
      }),
    ),
    travel,
    MAX_TRAVEL_ACTIVITY_ITEMS,
  );
}

function buildInfoGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const destination = resolveTravelDestination(event);
  const slots = travel.state.slots;
  const duration = formatTripLength(travel.state);
  const itineraryQuery = duration
    ? `${destination} ${duration} 동선`
    : `${destination} 꼭 알아둘 정보`;

  const entries = [
    slots.info_need_bias.value === "transit_pass"
      ? {
          id: "transit",
          label: "교통 패스",
          query: `${destination} 교통 패스`,
          reasonKo: "대중교통 리듬이라 패스 정보가 먼저 필요해요",
        }
      : slots.info_need_bias.value === "weather"
        ? {
            id: "weather",
            label: "날씨",
            query: `${destination} 여행 날씨`,
            reasonKo: "날씨가 실내·실외 선택에 크게 영향을 줘요",
          }
        : slots.info_need_bias.value === "roaming"
          ? {
              id: "roaming",
              label: "로밍",
              query: `${destination} 로밍 esim`,
              reasonKo: "해외 일정이라 데이터 준비가 먼저예요",
            }
          : slots.info_need_bias.value === "etiquette"
            ? {
                id: "etiquette",
                label: "현지 팁",
                query: `${destination} 여행 에티켓`,
                reasonKo: "동행자와 무리 없는 현지 팁을 먼저 보기",
              }
            : {
                id: "route",
                label: "동선",
                query: itineraryQuery,
                reasonKo: "지금 상황에 맞는 기본 동선부터 잡기",
              },
    {
      id: "route",
      label: "동선",
      query: itineraryQuery,
      reasonKo:
        slots.decision_confidence.value === "exploring"
          ? "아직 탐색 단계라 큰 동선부터 보기"
          : "이미 정한 예약을 기준으로 동선 다듬기",
    },
    slots.shopping_intent.value === "shopping"
      ? {
          id: "shopping",
          label: "쇼핑 축",
          query: `${destination} 쇼핑 동선`,
          reasonKo: "쇼핑 비중을 일정 안에 같이 넣기",
        }
      : slots.content_intent.value === "photo"
        ? {
            id: "photo",
            label: "사진 스팟",
            query: `${destination} 사진 스팟`,
            reasonKo: "콘텐츠 우선이면 빛·날씨·동선을 같이 봐야 해요",
          }
        : {
            id: "weather",
            label: "날씨",
            query: `${destination} 여행 날씨`,
            reasonKo: "복장과 실내 비중을 미리 조정하기",
          },
  ];

  return finalizeTravelAxisGhosts("info", entries.map((entry) =>
    buildGhostNode({
      axisId: "info",
      id: `ghost:info:${entry.id}`,
      label: entry.label,
      playbookReasonKo: entry.reasonKo,
      featureId: "ai_search",
      actionKind: "hub_service",
      hubServiceId: "ai_search",
      href: buildSearchHref(event.id, entry.query),
      internalRoute: true,
      searchQuery: entry.query,
      inferred: true,
      surfacePlacement: "root_branch",
    }),
  ), travel);
}

function buildTicketGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  const ticket = readContextTicketArtifact(event);
  if (!ticket) {
    return [];
  }
  const href = ticket.qrPreviewUrl?.trim() || ticket.actionUrl?.trim() || null;
  if (!href) {
    return [];
  }
  const placeLabel = ticket.placeLabel?.trim();
  const label = ticket.labelKo?.trim() || "티켓";
  return finalizeTravelAxisGhosts(
    "ticket",
    [
      buildGhostNode({
        axisId: "ticket",
        id: "ghost:ticket:active",
        label,
        playbookReasonKo: placeLabel
          ? `${placeLabel}에서 바로 쓸 준비가 된 티켓이에요`
          : "바로 꺼내 쓸 수 있는 티켓 축이에요",
        featureId: "ticket",
        actionKind: "hub_service",
        hubServiceId: "ticket",
        href,
        internalRoute: false,
        inferred: true,
        surfacePlacement: "root_branch",
        semanticTypeLabelKo: "티켓",
        relationLabelKo: "입장 준비",
      }),
    ],
    travel,
    1,
  );
}

export function buildTravelProjectionGhosts(
  event: EventCandidate,
  travel: TravelBrainProjection,
): GhostProjectionNode[] {
  return [
    ...buildFlightGhosts(event, travel),
    ...buildLodgingGhosts(event, travel),
    ...buildEateryGhosts(event, travel),
    ...buildPlaceGhosts(event, travel),
    ...buildInfoGhosts(event, travel),
    ...buildTicketGhosts(event, travel),
  ];
}

export function countTravelProjectionGhostsByAxis(
  ghosts: readonly GhostProjectionNode[],
): Record<string, number> {
  return ghosts.reduce<Record<string, number>>((counts, ghost) => {
    counts[ghost.axisId] = (counts[ghost.axisId] ?? 0) + 1;
    return counts;
  }, {});
}
