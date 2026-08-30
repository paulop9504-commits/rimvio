/**
 * Dynamic capability / tool selection for Main Agent loop (P1/P2).
 * State → next tool — no fixed DOMAIN_TOOL_CHAINS.
 */

import type { AgentObservation } from "@/lib/agent/types";
import type { RimvioToolId } from "@/lib/tool-registry";
import { RIMVIO_TOOL_IDS } from "@/lib/tool-registry";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import type { CapabilityIntentResolution } from "@/lib/rimvio-index/types";

export type SelectNextCapabilityInput = {
  readonly agentId: string;
  readonly utterance: string;
  readonly contextEventId: string;
  readonly observations: readonly AgentObservation[];
  readonly lastToolId: RimvioToolId | null;
  readonly lastVerified: boolean;
};

export type SelectNextCapabilityResult = {
  readonly toolId: RimvioToolId | null;
  readonly capabilityIntent: CapabilityIntentResolution | null;
  readonly blockedReasonKo: string | null;
  readonly reuseDecision: CapabilityIntentResolution["reuse"]["decision"] | null;
};

const TOOL_ID_SET = new Set<string>(RIMVIO_TOOL_IDS);

const INITIAL_TOOL_BY_AGENT: Record<string, RimvioToolId> = {
  lodging: "hotel.lookup",
  eatery: "restaurant.lookup",
  route: "maps.search",
  flight: "browse.extract",
  weather: "maps.search",
  booking: "booking.prepare",
};

const CAPABILITY_TO_TOOL: Partial<Record<string, RimvioToolId>> = {
  "market.search": "hotel.lookup",
  "lodging.search": "hotel.lookup",
  "eatery.search": "restaurant.lookup",
  "travel.booking.prepare": "booking.prepare",
};

function parseToolIdFromStepId(stepId: string): RimvioToolId | null {
  const tail = stepId.split(":").pop() ?? "";
  return TOOL_ID_SET.has(tail) ? (tail as RimvioToolId) : null;
}

function lastObservationToolId(
  observations: readonly AgentObservation[],
): RimvioToolId | null {
  const last = observations[observations.length - 1];
  if (!last) return null;
  return parseToolIdFromStepId(last.stepId);
}

function hasSuccessfulRankingAfterLookup(
  observations: readonly AgentObservation[],
): boolean {
  let sawLookup = false;
  for (const o of observations) {
    const tool = parseToolIdFromStepId(o.stepId);
    if (tool === "hotel.lookup" || tool === "restaurant.lookup") {
      sawLookup = o.success && (o.candidates?.length ?? 0) > 0;
    }
    if (sawLookup && tool === "ranking.pick" && o.success) {
      return true;
    }
  }
  return false;
}

function initialToolForAgent(
  agentId: string,
  capabilityIntent: CapabilityIntentResolution | null,
): RimvioToolId | null {
  const capId =
    capabilityIntent?.discoveryPlanCapabilityId ??
    capabilityIntent?.reuse.topHit?.capabilityId ??
    null;
  if (capId && CAPABILITY_TO_TOOL[capId]) {
    return CAPABILITY_TO_TOOL[capId]!;
  }
  return INITIAL_TOOL_BY_AGENT[agentId] ?? null;
}

/**
 * Decide the next Rimvio tool from current execution state.
 * P2: runs capability discovery / reuse gate on first selection.
 */
export function selectNextCapabilityFromState(
  input: SelectNextCapabilityInput,
): SelectNextCapabilityResult {
  const utterance = input.utterance.trim();
  const isFirstSelection =
    input.observations.length === 0 && input.lastToolId == null;

  let capabilityIntent: CapabilityIntentResolution | null = null;
  if (isFirstSelection && utterance) {
    capabilityIntent = resolveCapabilityIntent({
      utterance,
      contextEventId: input.contextEventId,
    });
    const domainTool = initialToolForAgent(input.agentId, capabilityIntent);
    if (capabilityIntent.reuse.decision === "create" && domainTool) {
      return {
        toolId: domainTool,
        capabilityIntent,
        blockedReasonKo: null,
        reuseDecision: "create",
      };
    }
    if (capabilityIntent.reuse.decision === "create" && !domainTool) {
      return {
        toolId: null,
        capabilityIntent,
        blockedReasonKo: capabilityIntent.reuse.reasonKo,
        reuseDecision: "create",
      };
    }
  }

  const lastTool =
    input.lastToolId ?? lastObservationToolId(input.observations);

  if (!lastTool) {
    const toolId = initialToolForAgent(input.agentId, capabilityIntent);
    return {
      toolId,
      capabilityIntent,
      blockedReasonKo: toolId ? null : "실행 가능한 Capability 없음",
      reuseDecision: capabilityIntent?.reuse.decision ?? null,
    };
  }

  const lastObs = input.observations[input.observations.length - 1];
  const lookupTool =
    lastTool === "hotel.lookup" || lastTool === "restaurant.lookup";

  if (
    lookupTool &&
    input.lastVerified &&
    lastObs?.success &&
    (lastObs.candidates?.length ?? 0) > 0 &&
    !hasSuccessfulRankingAfterLookup(input.observations)
  ) {
    return {
      toolId: "ranking.pick",
      capabilityIntent,
      blockedReasonKo: null,
      reuseDecision: capabilityIntent?.reuse.decision ?? null,
    };
  }

  if (
    lastTool === "ranking.pick" &&
    input.lastVerified &&
    lastObs?.success &&
    /(?:예약|준비|book|reserve)/iu.test(utterance)
  ) {
    return {
      toolId: "booking.prepare",
      capabilityIntent,
      blockedReasonKo: null,
      reuseDecision: capabilityIntent?.reuse.decision ?? null,
    };
  }

  if (lastTool === "maps.search" && input.agentId === "route" && input.lastVerified) {
    return {
      toolId: "maps.navigate",
      capabilityIntent,
      blockedReasonKo: null,
      reuseDecision: capabilityIntent?.reuse.decision ?? null,
    };
  }

  if (!input.lastVerified || !lastObs?.success) {
    return {
      toolId: lastTool,
      capabilityIntent,
      blockedReasonKo: null,
      reuseDecision: capabilityIntent?.reuse.decision ?? null,
    };
  }

  return {
    toolId: null,
    capabilityIntent,
    blockedReasonKo: null,
    reuseDecision: capabilityIntent?.reuse.decision ?? null,
  };
}
