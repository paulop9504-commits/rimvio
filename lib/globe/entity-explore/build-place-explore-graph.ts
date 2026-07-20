/**
 * Deterministic Place Action Graph — Knowledge / Explore / Actions + AI next-3.
 * No LLM. Never auto-Commits.
 */

import type {
  PlaceExploreActionId,
  PlaceExploreEntity,
  PlaceExploreExploreId,
  PlaceExploreGraph,
  PlaceExploreGraphNode,
  PlaceExploreKnowledgeId,
} from "@/lib/globe/entity-explore/types";
import { PLACE_EXPLORE_VERSION } from "@/lib/globe/entity-explore/types";

export type PlaceExploreContextBias = {
  readonly tripKind?: "couple" | "family" | "solo" | "generic" | null;
  readonly lodgingMissing?: boolean;
  readonly foodBias?: boolean;
  readonly cherrySeason?: boolean;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function isParkLike(entity: PlaceExploreEntity): boolean {
  const blob = `${entity.titleKo} ${entity.providerTags.join(" ")}`.toLowerCase();
  return /park|공원|벚꽃|cherry|정원|garden|tourist_attraction|전망|observatory/iu.test(
    blob,
  );
}

function nodeId(placeId: string, kind: string, key: string): string {
  return `pex:${placeId}:${kind}:${key}`;
}

function knowledgeNode(
  entity: PlaceExploreEntity,
  knowledgeId: PlaceExploreKnowledgeId,
  emoji: string,
  labelKo: string,
  detailKo: string,
): PlaceExploreGraphNode {
  return {
    id: nodeId(entity.placeId, "knowledge", knowledgeId),
    branch: "knowledge",
    kind: "knowledge",
    emoji,
    labelKo,
    detailKo,
    projectable: false,
    knowledgeId,
    virtual: false,
  };
}

function exploreNode(
  entity: PlaceExploreEntity,
  exploreId: PlaceExploreExploreId,
  emoji: string,
  labelKo: string,
  detailKo: string,
): PlaceExploreGraphNode {
  return {
    id: nodeId(entity.placeId, "explore", exploreId),
    branch: "explore",
    kind: "explore",
    emoji,
    labelKo,
    detailKo,
    projectable: true,
    exploreId,
    virtual: true,
  };
}

function actionNode(
  entity: PlaceExploreEntity,
  actionId: PlaceExploreActionId,
  emoji: string,
  labelKo: string,
  detailKo: string,
): PlaceExploreGraphNode {
  return {
    id: nodeId(entity.placeId, "action", actionId),
    branch: "actions",
    kind: "action",
    emoji,
    labelKo,
    detailKo,
    projectable: false,
    actionId,
    virtual: false,
  };
}

function aiNextNode(
  entity: PlaceExploreEntity,
  key: string,
  emoji: string,
  labelKo: string,
  exploreId?: PlaceExploreExploreId,
  actionId?: PlaceExploreActionId,
): PlaceExploreGraphNode {
  return {
    id: nodeId(entity.placeId, "ai_next", key),
    branch: "ai_next",
    kind: "ai_next",
    emoji,
    labelKo,
    detailKo: null,
    projectable: Boolean(exploreId),
    exploreId,
    actionId,
    virtual: true,
  };
}

/** Build exactly 3 AI next suggestions — context-biased. */
export function buildAiNextSuggestions(
  entity: PlaceExploreEntity,
  bias: PlaceExploreContextBias = {},
): readonly PlaceExploreGraphNode[] {
  const park = isParkLike(entity);
  const cherry =
    bias.cherrySeason === true ||
    /벚꽃|cherry|sakura/iu.test(entity.titleKo);
  const out: PlaceExploreGraphNode[] = [];

  if (bias.lodgingMissing) {
    out.push(
      aiNextNode(entity, "lodging", "🏨", "근처 숙소 찾기", undefined, "find_lodging"),
    );
  }

  if (bias.foodBias || !park) {
    out.push(
      aiNextNode(entity, "eatery", "🍜", "도보권 맛집 탐색", "nearby_eatery"),
    );
  }

  if (cherry || park) {
    out.push(
      aiNextNode(entity, "cherry", "🌸", "벚꽃 명소 이어보기", "cherry_route"),
    );
    out.push(
      aiNextNode(entity, "cafe", "☕", "도보 10분 감성 카페", "nearby_cafe"),
    );
  }

  if (bias.tripKind === "couple") {
    out.push(
      aiNextNode(
        entity,
        "couple",
        "📅",
        "커플 데이트 코스",
        undefined,
        "ask_ai_couple",
      ),
    );
  }

  out.push(
    aiNextNode(
      entity,
      "schedule",
      "📅",
      "오후 일정에 추가",
      undefined,
      "add_to_schedule",
    ),
  );

  if (park) {
    out.push(
      aiNextNode(entity, "photo", "📷", "포토스팟 펼치기", "photo_spots"),
    );
  }

  const seen = new Set<string>();
  const unique: PlaceExploreGraphNode[] = [];
  for (const row of out) {
    if (seen.has(row.labelKo)) {
      continue;
    }
    seen.add(row.labelKo);
    unique.push(row);
    if (unique.length >= 3) {
      break;
    }
  }
  return unique;
}

export function buildPlaceExploreGraph(input: {
  entity: PlaceExploreEntity;
  bias?: PlaceExploreContextBias;
}): PlaceExploreGraph {
  const entity: PlaceExploreEntity = {
    ...input.entity,
    titleKo: normalizeText(input.entity.titleKo) || "장소",
    placeId: normalizeText(input.entity.placeId) || "place",
  };
  const bias = input.bias ?? {};
  const park = isParkLike(entity);

  const knowledge: PlaceExploreGraphNode[] = [
    knowledgeNode(entity, "hours", "🕐", "운영 · 입장", "언제 열려 있는지 확인"),
    knowledgeNode(entity, "crowd", "👥", "혼잡도", "지금·주말 붐빔 예상"),
  ];
  if (park || /벚꽃|cherry/iu.test(entity.titleKo)) {
    knowledge.push(
      knowledgeNode(entity, "cherry", "🌸", "벚꽃", "시즌·명소 포인트"),
    );
  }
  knowledge.push(
    knowledgeNode(entity, "transit", "🚇", "교통", "가장 가까운 역·이동"),
  );

  const explore: PlaceExploreGraphNode[] = [
    exploreNode(entity, "nearby_cafe", "☕", "근처 카페", "지도에 카페 노드 펼치기"),
    exploreNode(entity, "nearby_eatery", "🍜", "맛집", "동선에 맞는 식사 후보"),
    exploreNode(entity, "photo_spots", "📷", "포토스팟", "사진 잘 나오는 위치"),
  ];
  if (park) {
    explore.push(
      exploreNode(entity, "picnic", "🍱", "피크닉", "돗자리·편의점·뷰 포인트"),
      exploreNode(entity, "cherry_route", "🌸", "벚꽃 루트", "명소 이어보기"),
    );
  }
  explore.push(
    exploreNode(entity, "shopping", "🛍", "쇼핑", "근처 상점·기념품"),
  );

  const actions: PlaceExploreGraphNode[] = [
    actionNode(entity, "add_to_schedule", "📅", "일정에 추가", "오늘·오후 맥락에 넣기"),
    actionNode(entity, "find_lodging", "🏨", "숙소 찾기", "결재함에 숙소 준비"),
    actionNode(entity, "reserve_prep", "✓", "예약 준비", "결재함에 초안 추가"),
    actionNode(entity, "directions", "↗", "길찾기", "지도 앱으로 이동"),
    actionNode(entity, "ask_ai_day", "🤖", "하루 일정 맡기기", "이곳 중심 플랜"),
  ];
  if (bias.tripKind === "couple") {
    actions.push(
      actionNode(entity, "ask_ai_couple", "💕", "커플 코스", "데이트 동선 준비"),
    );
  }
  actions.push(
    actionNode(entity, "ask_ai_quiet", "🤫", "조용한 코스", "붐비지 않는 동선"),
  );

  return {
    version: PLACE_EXPLORE_VERSION,
    entity,
    aiNext: buildAiNextSuggestions(entity, bias),
    knowledge,
    explore: explore.slice(0, 6),
    actions: actions.slice(0, 7),
  };
}
