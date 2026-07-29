/**
 * Deterministic Operator tool gate — one fixed tool per turn.
 * @see docs/RIMVIO_OPERATOR_TURN.md
 */

import { isInstantPoiSearch } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { isLodgingBookingQuery } from "@/lib/globe/context-hub/lodging-booking-slots";
import { isContextActionIntentMessage } from "@/lib/globe/context-action-injection/resolve-context-action-intent";
import { parseLensCommand } from "@/lib/globe/discovery-lens/parse-lens-command";
import { parseResourceReelKindFilter } from "@/lib/globe/resource-reel/parse-resource-reel-kind-filter";
import { resolveEngineOperatorTurn } from "@/lib/engine/resolve-engine-operator-turn";
import {
  reelHasKindSlice,
} from "@/lib/globe/operator-turn/read-operator-turn-ssot";
import type {
  OperatorClassifyCategory,
  OperatorTurnPlan,
  OperatorTurnSsot,
} from "@/lib/globe/operator-turn/types";
import { isActionFirstUtterance } from "@/lib/rule-engine/is-action-first-utterance";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";
import { parseGraphCommands } from "@/lib/graph-command/parse-graph-commands";
import { isLocalDiscoveryRefinement } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import { gateLodgingStayReviseAskChips } from "@/lib/globe/operator-turn/gate-lodging-stay-revise-ask-chips";
import { gateSoftConfirmAskChips } from "@/lib/globe/operator-turn/gate-soft-confirm-ask-chips";
import {
  resolveCommandFirstDecision,
  shouldExecuteWithoutAsk,
} from "@/lib/rimvio-command/command-first";
import { resolveConfirmedRealityAskGate } from "@/lib/workstream/resolve-confirmed-reality-ask-gate";

function isRichGraphFilter(text: string): boolean {
  const cmd = parseGraphCommands(text, null)[0];
  if (!cmd || cmd.op !== "filter") {
    return false;
  }
  const p = cmd.predicate;
  return Boolean(
    p.maxWalkMinutes != null ||
      p.minRating != null ||
      p.reservableOnly ||
      p.localFavoriteOnly ||
      p.sortBy != null,
  );
}

/** Open discovery surface — prefer edit over cold-start scout / ask_chips. */
export function hasOpenDiscoverySurface(ssot: OperatorTurnSsot): boolean {
  return (
    Boolean(ssot.lastBatch?.recommendations?.length) ||
    ssot.reelItemCount > 0 ||
    ssot.hasActiveSpec
  );
}

function tryEditBeforeScout(input: {
  text: string;
  ssot: OperatorTurnSsot;
  skipLens?: boolean;
}): OperatorTurnPlan | null {
  const text = input.text.trim();
  if (!text || !hasOpenDiscoverySurface(input.ssot)) {
    return null;
  }

  if (!input.skipLens) {
    const lens = parseLensCommand(text);
    if (lens) {
      return { tool: "lens_command", reason: "nl_lens_candidate" };
    }
  }

  if (isContextActionIntentMessage(text)) {
    return { tool: "task_injection", reason: "classify_task" };
  }

  const kindFilter = parseResourceReelKindFilter(text);
  if (kindFilter !== null && !isRichGraphFilter(text)) {
    if (reelHasKindSlice(input.ssot, kindFilter)) {
      return {
        tool: "filter_inventory",
        kindFilter,
        reason: "narrow_cue_with_slice",
      };
    }
    return { tool: "scout", reason: "narrow_cue_without_slice" };
  }

  const sessionGraph = readSessionGraph(input.ssot.contextEventId);
  if (
    isActionFirstUtterance(text, sessionGraph) ||
    isLocalDiscoveryRefinement(text)
  ) {
    const intent = classifyIntentFamily(text);
    if (intent === "Navigate" || intent === "Calendar") {
      return { tool: "graph_command", reason: "soft_surface_command" };
    }
    return { tool: "graph_command", reason: "action_first_graph" };
  }

  return null;
}

/**
 * Sync stage: lens candidate · filter vs scout · else defer classify.
 * Caller must still run `applyLensCommand` for lens (geo resolve); if not handled, re-enter.
 */
export function gateOperatorTurnSync(input: {
  text: string;
  ssot: OperatorTurnSsot;
  /** When true, skip lens parse (already tried / not handled). */
  skipLens?: boolean;
  event?: import("@/lib/events/event-candidate").EventCandidate | null;
  blueprint?: import("@/lib/context-blueprint/types").ContextBlueprint | null;
  userLat?: number | null;
  userLng?: number | null;
  /** Sequencer / ingress Act — soft-fill soft intake gaps. */
  expressReady?: boolean;
}): OperatorTurnPlan {
  const text = input.text.trim();
  if (!text && !input.ssot.hasActiveSpec) {
    return { tool: "noop", reason: "empty_input" };
  }

  // Condition revise (4박5일 → 5박6일) — confirm chips before Reality write.
  if (text && input.event) {
    const stayRevise = gateLodgingStayReviseAskChips({
      text,
      contextEventId: input.ssot.contextEventId,
      event: input.event,
    });
    if (stayRevise) {
      return stayRevise;
    }
  }

  // Filter / Pin / Delete — soft confirm chips (not Field Commit).
  if (text) {
    const soft = gateSoftConfirmAskChips({
      text,
      contextEventId: input.ssot.contextEventId,
    });
    if (soft) {
      return soft;
    }
  }

  // Mid-thread: open pins / lastBatch → filter · pin · compare before engine scout.
  const editFirst = tryEditBeforeScout({
    text,
    ssot: input.ssot,
    skipLens: input.skipLens,
  });
  if (editFirst) {
    return editFirst;
  }

  const engineTurn = resolveEngineOperatorTurn({
    text,
    message: text,
    event: input.event,
    blueprint: input.blueprint,
    userLat: input.userLat,
    userLng: input.userLng,
    expressReady: input.expressReady === true,
  });
  if (engineTurn) {
    // Cold-start chips only — destination + open results → Act (scout) immediately.
    if (
      engineTurn.tool === "ask_chips" &&
      Boolean(input.ssot.lastBatch) &&
      (engineTurn.reason === "trip_intake_gap" ||
        engineTurn.reason === "trip_experience_gap")
    ) {
      return { tool: "scout", reason: "search_or_bare_domain" };
    }
    // Confirmed Reality → never re-quiz dates/lodging (Context OS vs chatbot).
    if (
      engineTurn.tool === "ask_chips" &&
      (engineTurn.reason === "trip_intake_gap" ||
        engineTurn.reason === "trip_experience_gap")
    ) {
      const gate = resolveConfirmedRealityAskGate({
        event: input.event,
        contextEventId: input.ssot.contextEventId,
      });
      if (
        gate.askForbiddenSlots.includes("dates") ||
        gate.askForbiddenSlots.includes("lodging") ||
        gate.askForbiddenSlots.includes("destination")
      ) {
        return { tool: "scout", reason: "confirmed_reality_skip_ask" };
      }
    }
    // Command-first: high-confidence 숙소/맛집 search → execute, never quiz.
    if (engineTurn.tool === "ask_chips" && text) {
      const cmd = resolveCommandFirstDecision({
        utterance: text,
        activeContextId: input.ssot.contextEventId,
      });
      if (
        shouldExecuteWithoutAsk(cmd) &&
        (cmd.commandId === "search_hotel" || cmd.commandId === "search_eatery")
      ) {
        return {
          tool: "scout",
          reason:
            cmd.commandId === "search_eatery"
              ? "active_domain_scout_eatery"
              : "active_domain_scout_lodging",
        };
      }
    }
    return engineTurn;
  }

  if (!text) {
    return { tool: "scout", reason: "search_or_bare_domain" };
  }

  if (!input.skipLens) {
    const lens = parseLensCommand(text);
    if (lens) {
      return { tool: "lens_command", reason: "nl_lens_candidate" };
    }
  }

  // Book / pay / refund — Field handoff (never Continue scout).
  if (isContextActionIntentMessage(text)) {
    return { tool: "task_injection", reason: "classify_task" };
  }

  // Reel kind narrow (맛집만) before Graph filter — inventory surface.
  // Rich filters (현지인 · 걸어서 N분 · 싼 것만) stay on Graph Command OS.
  const kindFilter = parseResourceReelKindFilter(text);
  if (kindFilter !== null && !isRichGraphFilter(text)) {
    if (reelHasKindSlice(input.ssot, kindFilter)) {
      return {
        tool: "filter_inventory",
        kindFilter,
        reason: "narrow_cue_with_slice",
      };
    }
    return { tool: "scout", reason: "narrow_cue_without_slice" };
  }

  // Pin · delete · compare · walk filter · navigate · calendar · …
  const sessionGraph = readSessionGraph(input.ssot.contextEventId);
  if (isActionFirstUtterance(text, sessionGraph)) {
    const intent = classifyIntentFamily(text);
    if (intent === "Navigate" || intent === "Calendar") {
      return { tool: "graph_command", reason: "soft_surface_command" };
    }
    return { tool: "graph_command", reason: "action_first_graph" };
  }

  if (isInstantPoiSearch(text)) {
    return { tool: "scout", reason: "instant_poi_search" };
  }

  if (isInstantEaterySearch(text)) {
    return { tool: "scout", reason: "instant_eatery_search" };
  }

  if (isLodgingBookingQuery(text)) {
    return { tool: "scout", reason: "instant_lodging_search" };
  }

  return { tool: "defer_classify", reason: "needs_chat_task_search_split" };
}

/** After async classifyInput — map to whitelist tool. */
export function mapClassifyToOperatorTool(
  category: OperatorClassifyCategory,
): OperatorTurnPlan {
  switch (category) {
    case "chat":
      return { tool: "small_talk", reason: "classify_chat" };
    case "task":
      return { tool: "task_injection", reason: "classify_task" };
    case "search":
      return { tool: "scout", reason: "classify_search" };
  }
}

export function isOperatorWhitelistTool(
  tool: string,
): tool is Exclude<OperatorTurnPlan["tool"], "defer_classify" | "noop"> {
  return (
    tool === "lens_command" ||
    tool === "filter_inventory" ||
    tool === "small_talk" ||
    tool === "task_injection" ||
    tool === "graph_command" ||
    tool === "scout" ||
    tool === "ask_chips"
  );
}
