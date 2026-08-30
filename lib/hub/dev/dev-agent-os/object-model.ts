/**
 * NL → Rimvio product structure decomposition.
 * Dev Agent translates utterances into Platform · Capability · Loop · Workspace — not code diffs.
 */

import type {
  CurrentSystemState,
  DevAgentTaskPlan,
  ProductIntentDecomposition,
} from "@/lib/hub/dev/dev-agent-os/types";
import type { DevTaskKind } from "@/lib/hub/dev/dev-agent-os/types";
import { classifyDevTask } from "@/lib/hub/dev/dev-agent-os/task-classification";

const FOOD_DOMAIN = {
  platform: { id: "food", name: "Food", domain: "food_order" },
  capabilities: [
    "search",
    "map",
    "restaurant",
    "menu",
    "cart",
    "payment",
    "order",
    "delivery",
    "filter",
  ],
  loops: ["food_discovery_loop", "food_order_loop", "food_delivery_loop"],
  workspaceFlow: [
    "discovery",
    "map",
    "restaurant",
    "menu",
    "cart",
    "confirmation",
    "order",
    "tracking",
  ],
  integrations: ["restaurant_api", "payment_provider", "delivery_provider"],
  stateKeys: [
    "category",
    "location",
    "selectedRestaurant",
    "selectedMenu",
    "cart",
    "orderStatus",
  ],
} as const;

const TRAVEL_DOMAIN = {
  platform: { id: "travel", name: "Travel", domain: "travel_booking" },
  capabilities: [
    "search",
    "map",
    "filter",
    "calendar",
    "booking",
    "payment",
    "comparison",
  ],
  loops: ["travel_search_loop", "travel_booking_loop"],
  workspaceFlow: ["search", "filter", "select", "confirm", "book", "track"],
  integrations: ["lodging_api", "payment_provider"],
  stateKeys: ["destination", "checkIn", "checkOut", "selectedHotel", "bookingStatus"],
} as const;

const HOTEL_DOMAIN = {
  platform: { id: "hotel_booking", name: "Hotel Booking", domain: "hotel_booking" },
  capabilities: [
    "hotel.search",
    "hotel.detail",
    "room.availability",
    "booking.prepare",
    "booking.confirm",
    "payment.prepare",
    "payment.commit",
  ],
  loops: ["hotel_search_loop", "hotel_booking_loop"],
  workspaceFlow: ["search", "detail", "availability", "booking", "payment"],
  integrations: ["lodging_api", "payment_provider"],
  stateKeys: ["destination", "checkIn", "checkOut", "selectedHotel"],
} as const;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function detectDomainTemplate(text: string): typeof FOOD_DOMAIN | typeof TRAVEL_DOMAIN | typeof HOTEL_DOMAIN | null {
  if (/배달|delivery|음식|food|restaurant|맛집|주문/.test(text)) return FOOD_DOMAIN;
  if (/호텔|hotel|lodging|숙소/.test(text)) return HOTEL_DOMAIN;
  if (/여행|travel|trip/.test(text)) return TRAVEL_DOMAIN;
  return null;
}

function findReuseCandidates(
  needed: readonly string[],
  state: CurrentSystemState | null | undefined,
): { reuse: string[]; create: string[] } {
  if (!state?.capabilities.length) {
    return { reuse: [], create: [...needed] };
  }
  const existing = new Set(state.capabilities.map((c) => c.id));
  const reuse: string[] = [];
  const create: string[] = [];
  for (const cap of needed) {
    if (existing.has(cap)) reuse.push(cap);
    else create.push(cap);
  }
  return { reuse, create };
}

/** Decompose natural language into Rimvio product structure. */
export function decomposeProductIntent(input: {
  readonly utterance: string;
  readonly currentState?: CurrentSystemState | null;
}): ProductIntentDecomposition {
  const text = normalize(input.utterance);
  const template = detectDomainTemplate(text);

  if (template) {
    const { reuse, create } = findReuseCandidates(template.capabilities, input.currentState);
    return {
      intentSummary: text.slice(0, 120),
      platform: { ...template.platform },
      capabilities: [...template.capabilities],
      loops: [...template.loops],
      workspaceFlow: [...template.workspaceFlow],
      integrations: [...template.integrations],
      stateKeys: [...template.stateKeys],
      reuseCandidates: reuse,
      createCandidates: create,
    };
  }

  return {
    intentSummary: text.slice(0, 120),
    platform: { id: "platform", name: "Platform", domain: null },
    capabilities: [],
    loops: [],
    workspaceFlow: [],
    integrations: [],
    stateKeys: [],
    reuseCandidates: [],
    createCandidates: [],
  };
}

/** Build internal task plan skeleton from decomposition + task kind. */
export function buildDevAgentTaskPlan(input: {
  readonly utterance: string;
  readonly currentState?: CurrentSystemState | null;
}): DevAgentTaskPlan {
  const classified = classifyDevTask(input.utterance);
  const decomposition = decomposeProductIntent({
    utterance: input.utterance,
    currentState: input.currentState,
  });

  const deployRequested = classified.taskKind === "deploy";

  return {
    intent: decomposition.intentSummary,
    taskKind: classified.taskKind,
    affectedPlatforms: decomposition.platform.id !== "platform" ? [decomposition.platform.id] : [],
    affectedLoops: [...decomposition.loops],
    affectedCapabilities: [...decomposition.capabilities],
    uiChanges: decomposition.workspaceFlow.map((step) => `workspace:${step}`),
    stateChanges: [...decomposition.stateKeys],
    backendChanges: decomposition.createCandidates.map((c) => `capability:${c}`),
    integrationChanges: [...decomposition.integrations],
    dependencies: decomposition.reuseCandidates.map((c) => `reuse:${c}`),
    tests: decomposition.loops.length
      ? [`journey:${decomposition.loops[0]}`]
      : ["smoke:test"],
    deployment: deployRequested ? "preview → deploy → health_check" : null,
  };
}

/** Given a capability id and current state, list platforms that use it (change impact). */
export function platformsAffectedByCapability(
  capabilityId: string,
  state: CurrentSystemState,
): readonly string[] {
  const cap = state.capabilities.find((c) => c.id === capabilityId);
  if (cap?.usedByPlatforms.length) return cap.usedByPlatforms;
  return state.platforms
    .filter((p) => p.capabilities.includes(capabilityId))
    .map((p) => p.id);
}
