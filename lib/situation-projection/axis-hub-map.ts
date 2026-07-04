import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { GhostAxisId, SituationType } from "@/lib/situation-projection/types";

/** Ghost axis → Hub service when infrastructure exists. */
export const GHOST_AXIS_HUB_SERVICE: Partial<
  Record<GhostAxisId, ContextHubServiceId>
> = {
  schedule: "ai_search",
  place: "lodging",
  flight: "flight",
  lodging: "lodging",
  eatery: "eatery",
  info: "ai_search",
  ticket: "ticket",
  insurance: "ai_search",
  cost: "market",
  thread: "market",
  packing: "ai_search",
};

/** Situation-specific hub service priority (deterministic; LLM may reorder later). */
export const SITUATION_HUB_SERVICE_PRIORITY: Record<
  SituationType,
  readonly ContextHubServiceId[]
> = {
  travel: ["flight", "lodging", "eatery", "ai_search", "ticket"],
  trade: ["market", "ticket", "ai_search"],
  collab: ["ticket", "ai_search"],
  caregiving: ["ai_search", "ticket"],
  generic: ["ai_search", "market"],
};

export const MAX_CONTEXT_HUB_PILLS = 4 as const;
