import {
  ACTION_CONTRACT_SLOTS,
  getActionContract,
} from "@/lib/event-kernel/action-contracts/action-contract-registry";
import { listMentionFeatures } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { resolveActionCategory } from "@/lib/semantic/action-category-map";
import type { RimvioActionType } from "@/lib/ontology/actions/types";

const HUB_ACTION_TYPES: readonly RimvioActionType[] = [
  {
    actionTypeId: "hub.connect_ticket",
    family: "hub",
    labelKo: "티켓",
    actionCategory: "transaction",
    hubServiceId: "ticket",
    requiredSlots: [ACTION_CONTRACT_SLOTS.entity],
    rankWeight: 112,
  },
  {
    actionTypeId: "hub.connect_flight",
    family: "hub",
    labelKo: "항공",
    actionCategory: "movement",
    hubServiceId: "flight",
    requiredSlots: [ACTION_CONTRACT_SLOTS.destination],
    rankWeight: 108,
  },
  {
    actionTypeId: "hub.enable_lodging",
    family: "hub",
    labelKo: "숙소",
    actionCategory: "planning",
    hubServiceId: "lodging",
    requiredSlots: [ACTION_CONTRACT_SLOTS.location],
    rankWeight: 105,
  },
  {
    actionTypeId: "hub.connect_market",
    family: "hub",
    labelKo: "맞춤",
    actionCategory: "transaction",
    hubServiceId: "market",
    requiredSlots: [ACTION_CONTRACT_SLOTS.entity],
    rankWeight: 110,
  },
  {
    actionTypeId: "hub.ai_search",
    family: "hub",
    labelKo: "AI 검색",
    actionCategory: "planning",
    hubServiceId: "ai_search",
    requiredSlots: [],
    rankWeight: 92,
  },
  {
    actionTypeId: "hub.rental_car",
    family: "hub",
    labelKo: "렌트카",
    actionCategory: "movement",
    hubServiceId: "rental_car",
    requiredSlots: [ACTION_CONTRACT_SLOTS.destination],
    rankWeight: 88,
  },
];

function mentionActionTypes(): RimvioActionType[] {
  return listMentionFeatures().map((feature) => {
    const contract = feature.action ? getActionContract(feature.action) : null;
    return {
      actionTypeId: `mention.${feature.featureId}`,
      family: "mention" as const,
      labelKo: feature.displayName,
      actionCategory: resolveActionCategory(feature.featureId, feature.category),
      contractAction: feature.action,
      featureId: feature.featureId,
      requiredSlots: contract?.requiredSlots ?? [],
      rankWeight: 70,
    };
  });
}

const REGISTRY: ReadonlyMap<string, RimvioActionType> = new Map(
  [...HUB_ACTION_TYPES, ...mentionActionTypes()].map((row) => [row.actionTypeId, row]),
);

const HUB_BY_SERVICE: ReadonlyMap<ContextHubServiceId, RimvioActionType> = new Map(
  HUB_ACTION_TYPES.filter((row) => row.hubServiceId).map((row) => [
    row.hubServiceId!,
    row,
  ]),
);

export function listRimvioActionTypes(): RimvioActionType[] {
  return [...REGISTRY.values()].sort((left, right) =>
    left.actionTypeId.localeCompare(right.actionTypeId),
  );
}

export function getRimvioActionType(actionTypeId: string): RimvioActionType | null {
  return REGISTRY.get(actionTypeId.trim()) ?? null;
}

export function getHubActionTypeForService(
  serviceId: ContextHubServiceId,
): RimvioActionType | null {
  return HUB_BY_SERVICE.get(serviceId) ?? null;
}

export function getActionTypeRankWeightForHubService(
  serviceId: ContextHubServiceId,
): number {
  return getHubActionTypeForService(serviceId)?.rankWeight ?? 50;
}

export function resolveActionTypeIdForHubService(
  serviceId: ContextHubServiceId,
): string | null {
  return getHubActionTypeForService(serviceId)?.actionTypeId ?? null;
}

export function resolveActionTypeIdForMentionFeature(
  featureId: string,
): string | null {
  const key = featureId.trim();
  if (!key) {
    return null;
  }
  const id = `mention.${key}`;
  return REGISTRY.has(id) ? id : null;
}

export function resolveActionTypeIdForSemanticHint(
  hubServiceId: string | null | undefined,
): string | null {
  const key = hubServiceId?.trim();
  if (!key) {
    return null;
  }
  if (key.startsWith("hub.") || key.startsWith("mention.")) {
    return REGISTRY.has(key) ? key : null;
  }
  return resolveActionTypeIdForHubService(key as ContextHubServiceId);
}
