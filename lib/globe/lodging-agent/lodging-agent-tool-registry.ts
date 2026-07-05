import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import type {
  LodgingAgentContainer,
  LodgingAgentMapPinType,
  LodgingAgentMapPinWire,
  LodgingAgentToolCall,
} from "@/lib/globe/lodging-agent/types";

const CAFE_HINT = /카페|커피|coffee|cafe|ラテ|珈琲/iu;
const EATERY_HINT =
  /맛집|식당|먹|밥|brunch|lunch|dinner|food|restaurant|ラーメン|食/iu;
const NEARBY_HINT = /주변|근처|nearby|찾|검색|추천|가까운/iu;
const HOST_HINT =
  /체크인|체크아웃|시설|조식|룸|호텔|숙소|wifi|와이파이|짐|어떤|뭐|물어봐|ask/i;
const ITINERARY_HINT = /일정|itinerary|담|추가|넣|확정|고를/iu;

export type LodgingAgentToolResult = {
  replyText: string;
  mapPins: LodgingAgentMapPinWire[];
  stagedRows: readonly ContextEateryInventoryRow[];
};

export function classifyLodgingAgentTool(
  message: string | null | undefined,
): LodgingAgentToolCall {
  const text = message?.trim() ?? "";
  if (!text) {
    return { tool: "ask_host", question: "소개" };
  }
  if (ITINERARY_HINT.test(text) && NEARBY_HINT.test(text)) {
    return { tool: "find_nearby", category: "place", radiusM: 1500 };
  }
  if (ITINERARY_HINT.test(text)) {
    return { tool: "add_to_itinerary" };
  }
  if (CAFE_HINT.test(text)) {
    return {
      tool: "find_nearby",
      category: "cafe",
      radiusM: NEARBY_HINT.test(text) ? 500 : 800,
    };
  }
  if (EATERY_HINT.test(text) || NEARBY_HINT.test(text)) {
    return {
      tool: "find_nearby",
      category: EATERY_HINT.test(text) ? "eatery" : "place",
      radiusM: EATERY_HINT.test(text) ? 1200 : 1500,
    };
  }
  if (HOST_HINT.test(text)) {
    return { tool: "ask_host", question: text };
  }
  return { tool: "ask_host", question: text };
}

function mapPinType(category: LodgingAgentToolCall["category"]): LodgingAgentMapPinType {
  if (category === "cafe") {
    return "cafe";
  }
  if (category === "eatery") {
    return "eatery";
  }
  if (category === "lodging") {
    return "lodging";
  }
  return "place";
}

function buildNearbyQuery(input: {
  hostName: string;
  category: LodgingAgentToolCall["category"];
  destinationLabel: string | null;
}): string {
  const area = input.destinationLabel?.trim() || input.hostName.trim() || "근처";
  switch (input.category) {
    case "cafe":
      return `${area} 카페`;
    case "eatery":
      return `${area} 맛집`;
    case "lodging":
      return `${area} 숙소`;
    default:
      return `${area} 주변`;
  }
}

function filterWithinRadius(input: {
  rows: readonly { lat: number; lng: number; placeId: string; name: string; images: readonly string[] }[];
  originLat: number;
  originLng: number;
  radiusM: number;
  maxRadiusKm: number;
}): typeof input.rows {
  const capKm = input.maxRadiusKm;
  return input.rows.filter((row) => {
    const km = haversineKm(input.originLat, input.originLng, row.lat, row.lng);
    return km * 1000 <= input.radiusM && km <= capKm;
  });
}

export async function executeLodgingAgentTool(input: {
  container: LodgingAgentContainer;
  event: EventCandidate;
  toolCall: LodgingAgentToolCall;
  userMessage: string;
}): Promise<LodgingAgentToolResult> {
  const { container, toolCall } = input;
  const host = container.host;

  if (toolCall.tool === "ask_host") {
    const price =
      host.priceKrw != null
        ? `1박 ${Math.round(host.priceKrw).toLocaleString("ko-KR")}원`
        : null;
    const stay =
      host.checkInIso && host.checkOutIso
        ? `${host.checkInIso.slice(0, 10)} → ${host.checkOutIso.slice(0, 10)}`
        : null;
    const replyText = [
      `${host.name} 기준으로 안내할게요.`,
      host.address ? `📍 ${host.address}` : null,
      price,
      stay ? `머무는 일정: ${stay}` : null,
      container.context.budgetBand === "value"
        ? "예산을 아끼는 중이니 근처 가성비 식당·카페 위주로 찾아볼게요."
        : null,
      container.context.lodgingPriority === "quiet"
        ? "조용한 숙소를 선호하시니 시끄러운 번화가보다는 근처 조용한 골목을 추천할게요."
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    return { replyText, mapPins: [], stagedRows: [] };
  }

  if (toolCall.tool === "add_to_itinerary") {
    return {
      replyText:
        "지도에 뜬 Ghost Pin을 탭하면 이 여행 맥락에 확정(Solid Pin)할 수 있어요. 마음에 드는 곳을 골라 주세요.",
      mapPins: [],
      stagedRows: [],
    };
  }

  const category = toolCall.category ?? "eatery";
  const radiusM = toolCall.radiusM ?? 1200;
  const query = buildNearbyQuery({
    hostName: host.name,
    category,
    destinationLabel: container.context.destinationLabel,
  });

  const loaded = await loadEateryInventoryRows({
    event: input.event,
    message: query,
    lat: host.lat,
    lng: host.lng,
    maxResults: 8,
    radiusM,
  });

  const filtered = filterWithinRadius({
    rows: loaded.rows,
    originLat: host.lat,
    originLng: host.lng,
    radiusM,
    maxRadiusKm: container.radiusKm,
  }).slice(0, 4);

  if (filtered.length === 0) {
    return {
      replyText: `반경 ${Math.round(radiusM)}m 안에서 ${category === "cafe" ? "카페" : "장소"}를 못 찾았어요. 범위를 넓혀볼까요?`,
      mapPins: [],
      stagedRows: [],
    };
  }

  const pinType = mapPinType(category);
  const mapPins: LodgingAgentMapPinWire[] = filtered.map((row) => ({
    text: row.name,
    lat: row.lat,
    lng: row.lng,
    type: pinType,
    placeId: row.placeId,
    previewImageUrl: row.images[0] ?? null,
  }));

  const label =
    category === "cafe" ? "카페" : category === "eatery" ? "맛집" : "장소";
  const replyText = `${host.name} 기준 ${label} ${mapPins.length}곳을 지도에 Ghost Pin으로 올렸어요. 마음에 드는 곳을 탭해 확정해 보세요.`;

  return { replyText, mapPins, stagedRows: filtered };
}
