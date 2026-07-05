import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildLodgingAgentContainer } from "@/lib/globe/lodging-agent/build-lodging-agent-rag-context";
import {
  classifyLodgingAgentTool,
  executeLodgingAgentTool,
} from "@/lib/globe/lodging-agent/lodging-agent-tool-registry";
import { patchLodgingAgentGhostsToProjection } from "@/lib/globe/lodging-agent/patch-lodging-agent-ghost-pins";
import type {
  LodgingAgentContainer,
  LodgingAgentTurnResult,
} from "@/lib/globe/lodging-agent/types";
import { mergeEateryInventoryRows } from "@/lib/globe/context-condition-ai/merge-context-hub-inventory-rows";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

export type RunLodgingAgentTurnInput = {
  event: EventCandidate;
  row: ContextLodgingInventoryRow;
  resourceId: string;
  message: string;
  userDisplayName?: string | null;
  container?: LodgingAgentContainer | null;
};

/**
 * Lodging pin = context container. User message carries pin metadata via container + RAG.
 * Returns (text, lat, lng, type) map pins and patches Ghost projection.
 */
export async function runLodgingAgentTurn(
  input: RunLodgingAgentTurnInput,
): Promise<LodgingAgentTurnResult> {
  const message = input.message.trim();
  const container =
    input.container ??
    buildLodgingAgentContainer({
      event: input.event,
      row: input.row,
      resourceId: input.resourceId,
      userDisplayName: input.userDisplayName,
    });

  const toolCall = classifyLodgingAgentTool(message);
  const executed = await executeLodgingAgentTool({
    container,
    event: input.event,
    toolCall,
    userMessage: message,
  });

  if (executed.mapPins.length > 0) {
    if (executed.stagedRows.length > 0) {
      const merged = mergeEateryInventoryRows(
        readEateryInventoryRows(input.event),
        executed.stagedRows,
      );
      commitEateryInventoryToEvent({
        event: input.event,
        inventory: merged,
        inventorySource: "lodging_agent",
      });
    }
    patchLodgingAgentGhostsToProjection({
      event: input.event,
      hostPlaceId: container.host.placeId,
      mapPins: executed.mapPins,
    });
  }

  return {
    replyText: executed.replyText,
    mapPins: executed.mapPins,
    toolCalls: [toolCall],
    rag: container.rag,
    systemPrompt: container.systemPrompt,
  };
}

export type LodgingAgentTurnIngress = {
  /** Pin-linked metadata for agent ingress. */
  anchor: {
    kind: "lodging";
    contextEventId: string;
    lodgingResourceId: string;
    hostPlaceId: string;
    hostLat: number;
    hostLng: number;
  };
  userMessage: string;
  ragMemoryKo: string;
  systemPrompt: string;
};

export function buildLodgingAgentTurnIngress(input: {
  container: LodgingAgentContainer;
  userMessage: string;
}): LodgingAgentTurnIngress {
  return {
    anchor: {
      kind: "lodging",
      contextEventId: input.container.contextEventId,
      lodgingResourceId: input.container.lodgingResourceId,
      hostPlaceId: input.container.host.placeId,
      hostLat: input.container.host.lat,
      hostLng: input.container.host.lng,
    },
    userMessage: input.userMessage.trim(),
    ragMemoryKo: input.container.rag.memoryKo,
    systemPrompt: input.container.systemPrompt,
  };
}
