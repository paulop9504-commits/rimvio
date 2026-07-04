import type { EventCandidate } from "@/lib/events/event-candidate";
import { extractHubRunnableAction } from "@/lib/globe/context-hub/extract-hub-runnable-action";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import {
  GHOST_AXIS_HUB_SERVICE,
  MAX_CONTEXT_HUB_PILLS,
  SITUATION_HUB_SERVICE_PRIORITY,
} from "@/lib/situation-projection/axis-hub-map";
import type {
  GhostProjectionNode,
  HubRunnablePill,
  SituationType,
} from "@/lib/situation-projection/types";

function pillId(prefix: string, key: string, extra?: string | null): string {
  return extra ? `pill:${prefix}:${key}:${extra}` : `pill:${prefix}:${key}`;
}

function hubPillFromService(input: {
  serviceId: ContextHubServiceId;
  labelKo: string;
  shortLabelKo: string;
  connected: boolean;
  implemented: boolean;
  priority: number;
  href: string | null;
  internalRoute: boolean;
  linkedNodeId?: string | null;
}): HubRunnablePill {
  const solid = input.connected && Boolean(input.href);
  return {
    id: pillId("hub", input.serviceId),
    labelKo: input.labelKo,
    shortLabelKo: input.shortLabelKo,
    kind: solid ? "solid" : "ghost",
    virtual: !solid,
    hubServiceId: input.serviceId,
    linkedNodeId: input.linkedNodeId ?? null,
    actionKind: input.implemented ? "hub_service" : "coming_soon",
    href: input.href,
    internalRoute: input.internalRoute,
    implemented: input.implemented,
    priority: input.priority,
    emphasis: null,
  };
}

function emphasisRank(emphasis: HubRunnablePill["emphasis"]): number {
  switch (emphasis) {
    case "focus":
      return 0;
    case "main":
      return 1;
    case "aux":
      return 2;
    default:
      return 3;
  }
}

function ghostAxisPill(
  ghost: GhostProjectionNode,
  priority: number,
): HubRunnablePill {
  const hubServiceId = ghost.hubServiceId ?? GHOST_AXIS_HUB_SERVICE[ghost.axisId] ?? null;
  const isKnowledge = Boolean(
    ghost.axisId === "insurance" || ghost.axisId === "records" || ghost.knowledgeBoxLabel,
  );
  const contextRun =
    ghost.actionKind === "context_run" ||
    (ghost.axisId === "eatery" && Boolean(ghost.searchQuery));
  const directHubService =
    ghost.actionKind === "hub_service" && Boolean(ghost.href?.trim());
  const href = ghost.href ?? null;
  const nodeKey = ghost.placeId ?? ghost.id;

  return {
    id: pillId("axis", ghost.axisId, nodeKey),
    labelKo: ghost.knowledgeBoxLabel ?? ghost.label,
    shortLabelKo: ghost.label,
    kind: "ghost",
    virtual: true,
    hubServiceId,
    ghostAxisId: ghost.axisId,
    linkedNodeId: ghost.id,
    actionKind: isKnowledge
      ? "knowledge_capture"
      : contextRun
        ? "context_run"
        : directHubService || hubServiceId
          ? "hub_service"
          : "context_run",
    href,
    searchQuery: ghost.searchQuery ?? null,
    internalRoute: ghost.internalRoute ?? contextRun,
    implemented:
      isKnowledge ||
      contextRun ||
      Boolean(href?.trim()) ||
      Boolean(hubServiceId),
    priority,
    inferred: ghost.inferred === true,
    emphasis: ghost.emphasis ?? null,
    semanticType: ghost.semanticType ?? ghost.axisId,
    semanticTypeLabelKo: ghost.semanticTypeLabelKo ?? null,
    relationLabelKo: ghost.relationLabelKo ?? null,
    relationReasonKo: ghost.relationReasonKo ?? ghost.playbookReasonKo ?? null,
  };
}

function mergeGhostIntoPill(
  pill: HubRunnablePill,
  ghost: GhostProjectionNode,
): HubRunnablePill {
  const replacement = ghostAxisPill(ghost, pill.priority);
  return {
    ...pill,
    ...replacement,
    id: pill.id,
    priority: pill.priority,
  };
}

/** Hub Runnable pills for context card / brain map — max 4. */
export function buildHubRunnablePills(input: {
  event: EventCandidate;
  situationType: SituationType;
  ghosts: readonly GhostProjectionNode[];
}): HubRunnablePill[] {
  const pills: HubRunnablePill[] = [];
  const hubBundle = listContextHubServicesForEvent(input.event);
  const priorityOrder = SITUATION_HUB_SERVICE_PRIORITY[input.situationType] ?? [];

  if (hubBundle) {
    const rank = new Map(priorityOrder.map((id, index) => [id, index]));
    const sorted = [...hubBundle.services].sort((a, b) => {
      const left = rank.get(a.serviceId) ?? 99;
      const right = rank.get(b.serviceId) ?? 99;
      return left - right;
    });

    for (const row of sorted) {
      const action = extractHubRunnableAction(row);
      const priority = rank.get(row.serviceId) ?? 50;
      pills.push(
        hubPillFromService({
          serviceId: row.serviceId,
          labelKo: row.labelKo,
          shortLabelKo: row.shortLabelKo,
          connected: row.connected,
          implemented: row.implemented,
          priority,
          href: action?.href ?? row.handoffHref,
          internalRoute: action?.internalRoute ?? false,
        }),
      );
    }
  }

  for (const ghost of input.ghosts) {
    const matchingIndex = pills.findIndex(
      (pill) =>
        pill.ghostAxisId === ghost.axisId ||
        (pill.hubServiceId &&
          (ghost.hubServiceId ?? GHOST_AXIS_HUB_SERVICE[ghost.axisId]) === pill.hubServiceId &&
          ghost.axisId !== "insurance"),
    );
    if (matchingIndex >= 0) {
      const current = pills[matchingIndex]!;
      if (current.ghostAxisId === ghost.axisId && current.linkedNodeId) {
        continue;
      }
      pills[matchingIndex] = mergeGhostIntoPill(current, ghost);
      continue;
    }
    const duplicate = pills.some(
      (pill) =>
        pill.ghostAxisId === ghost.axisId ||
        (pill.hubServiceId &&
          GHOST_AXIS_HUB_SERVICE[ghost.axisId] === pill.hubServiceId &&
          ghost.axisId !== "insurance"),
    );
    if (duplicate) {
      continue;
    }
    pills.push(ghostAxisPill(ghost, 60 + pills.length));
  }

  const knowledgePill =
    input.situationType === "caregiving"
      ? pills.find((p) => p.ghostAxisId === "insurance") ??
        pills.find((p) => p.actionKind === "knowledge_capture")
      : pills.find((p) => p.actionKind === "knowledge_capture");
  const rest = pills.filter((p) => p.actionKind !== "knowledge_capture");
  const sorted = [...rest].sort(
    (a, b) =>
      emphasisRank(a.emphasis) - emphasisRank(b.emphasis) ||
      a.priority - b.priority ||
      Number(a.virtual) - Number(b.virtual),
  );
  const capped = sorted.slice(0, knowledgePill ? MAX_CONTEXT_HUB_PILLS - 1 : MAX_CONTEXT_HUB_PILLS);
  if (knowledgePill) {
    return [knowledgePill, ...capped].slice(0, MAX_CONTEXT_HUB_PILLS);
  }
  return capped;
}
