import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type {
  LodgingAgentContainer,
  LodgingAgentRagContext,
  LodgingContextData,
  LodgingContextGhostCandidate,
  LodgingHostData,
} from "@/lib/globe/lodging-agent/types";
import { readProjectionManifestForAnchor } from "@/lib/situation-projection/projection-store";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import type { GhostProjectionNode } from "@/lib/situation-projection/types";

function readHostData(row: ContextLodgingInventoryRow): LodgingHostData {
  return {
    placeId: row.placeId,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    priceKrw: row.priceKrw ?? null,
    partnerLabel: row.partnerLabel ?? null,
    address: row.address ?? null,
    checkInIso: row.stayWindow?.checkInIso ?? row.checkInIso ?? null,
    checkOutIso: row.stayWindow?.checkOutIso ?? row.checkOutIso ?? null,
    stayNights: row.stayWindow?.nights ?? null,
    images: row.images,
    mapsUrl: row.mapsUrl ?? null,
  };
}

function readGhostCandidates(
  event: EventCandidate,
  hostPlaceId: string,
): LodgingContextGhostCandidate[] {
  const manifest = readProjectionManifestForAnchor(event.id);
  if (!manifest) {
    return [];
  }
  return manifest.nodes
    .filter(
      (node): node is GhostProjectionNode =>
        node.kind === "ghost" && Boolean(node.placeId?.trim()),
    )
    .filter((node) => node.placeId!.trim() !== hostPlaceId)
    .slice(0, 8)
    .map((node) => ({
      placeId: node.placeId!.trim(),
      label: node.label,
      axisId: node.axisId,
      lat: node.lat ?? null,
      lng: node.lng ?? null,
    }));
}

function buildContextData(input: {
  event: EventCandidate;
  hostPlaceId: string;
  userDisplayName: string;
}): LodgingContextData {
  const travel = buildTravelBrainState(input.event);
  const contextInstance = buildContextInstance({ event: input.event });
  const slots = travel.slots;
  const travelReasonsKo = [
    slots.budget_band.reasonKo,
    slots.lodging_priority.reasonKo,
    slots.food_bias.reasonKo,
    slots.companion_mode.reasonKo,
    slots.mobility_style.reasonKo,
  ].filter(Boolean);

  return {
    contextEventId: input.event.id,
    contextTitle: input.event.title.trim(),
    destinationLabel:
      contextInstance.travel.destinationLabel ??
      contextInstance.location.areaLabel ??
      input.event.place?.trim() ??
      null,
    budgetBand: slots.budget_band.value,
    lodgingPriority: slots.lodging_priority.value,
    foodBias: slots.food_bias.value,
    companionMode: slots.companion_mode.value,
    travelReasonsKo,
    ghostCandidates: readGhostCandidates(input.event, input.hostPlaceId),
    userDisplayName: input.userDisplayName,
  };
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

export function buildLodgingAgentRagContext(input: {
  host: LodgingHostData;
  context: LodgingContextData;
}): LodgingAgentRagContext {
  const hostLines = [
    `숙소: ${input.host.name}`,
    input.host.address ? `주소: ${input.host.address}` : null,
    formatPriceKrw(input.host.priceKrw)
      ? `1박: ${formatPriceKrw(input.host.priceKrw)}`
      : null,
    input.host.checkInIso ? `체크인: ${input.host.checkInIso}` : null,
    input.host.checkOutIso ? `체크아웃: ${input.host.checkOutIso}` : null,
    input.host.partnerLabel ? `파트너: ${input.host.partnerLabel}` : null,
  ].filter(Boolean);

  const contextLines = [
    `여행: ${input.context.contextTitle}`,
    input.context.destinationLabel
      ? `목적지: ${input.context.destinationLabel}`
      : null,
    input.context.budgetBand ? `예산: ${input.context.budgetBand}` : null,
    input.context.lodgingPriority
      ? `숙소 우선: ${input.context.lodgingPriority}`
      : null,
    input.context.foodBias ? `식사 성향: ${input.context.foodBias}` : null,
    input.context.companionMode
      ? `동행: ${input.context.companionMode}`
      : null,
    ...input.context.travelReasonsKo.map((line) => `맥락: ${line}`),
    input.context.ghostCandidates.length > 0
      ? `후보 핀: ${input.context.ghostCandidates
          .slice(0, 4)
          .map((row) => row.label)
          .join(" · ")}`
      : null,
  ].filter(Boolean);

  const memoryKo = [
    "[Host Data]",
    ...hostLines,
    "",
    "[Context Data]",
    `사용자: ${input.context.userDisplayName}`,
    ...contextLines,
  ].join("\n");

  return {
    host: input.host,
    context: input.context,
    memoryKo,
  };
}

export function buildLodgingAgentContainer(input: {
  event: EventCandidate;
  row: ContextLodgingInventoryRow;
  resourceId: string;
  userDisplayName?: string | null;
  radiusKm?: number;
}): LodgingAgentContainer {
  const host = readHostData(input.row);
  const context = buildContextData({
    event: input.event,
    hostPlaceId: host.placeId,
    userDisplayName: input.userDisplayName?.trim() || "여행자",
  });
  const rag = buildLodgingAgentRagContext({ host, context });
  const systemPrompt = buildLodgingAgentSystemPrompt({
    hostName: host.name,
    userDisplayName: context.userDisplayName,
    radiusKm: input.radiusKm ?? 3,
    memoryKo: rag.memoryKo,
  });

  return {
    contextEventId: input.event.id,
    lodgingResourceId: input.resourceId,
    host,
    context,
    rag,
    systemPrompt,
    radiusKm: input.radiusKm ?? 3,
  };
}

export function buildLodgingAgentSystemPrompt(input: {
  hostName: string;
  userDisplayName: string;
  radiusKm: number;
  memoryKo: string;
}): string {
  return [
    `너는 지금 「${input.hostName}」의 가이드이자, ${input.userDisplayName}의 여행 조력자야.`,
    "네가 가진 Host Data(숙소 정보)를 기반으로 대답하되, Context Data(사용자 여행 맥락)를 항상 고려해.",
    "예: 예산을 아끼고 싶다면 비싼 룸서비스보다 근처 가성비 맛집을 제안해.",
    `검색·제안 범위는 이 숙소 반경 ${input.radiusKm}km와 사용자 맥락 안으로 제한해.`,
    "결정한 장소는 텍스트만이 아니라 지도 Ghost Pin으로 반환해 — 사용자가 확정하면 Solid Pin이 돼.",
    "",
    input.memoryKo,
  ].join("\n");
}
