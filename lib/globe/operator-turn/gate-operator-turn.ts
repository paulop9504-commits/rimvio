/**
 * Deterministic Operator tool gate — one fixed tool per turn.
 * @see docs/RIMVIO_OPERATOR_TURN.md
 */

import { isInstantPoiSearch } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { parseLensCommand } from "@/lib/globe/discovery-lens/parse-lens-command";
import { parseResourceReelKindFilter } from "@/lib/globe/resource-reel/parse-resource-reel-kind-filter";
import {
  reelHasKindSlice,
} from "@/lib/globe/operator-turn/read-operator-turn-ssot";
import type {
  OperatorClassifyCategory,
  OperatorTurnPlan,
  OperatorTurnSsot,
} from "@/lib/globe/operator-turn/types";

/**
 * Sync stage: lens candidate · filter vs scout · else defer classify.
 * Caller must still run `applyLensCommand` for lens (geo resolve); if not handled, re-enter.
 */
export function gateOperatorTurnSync(input: {
  text: string;
  ssot: OperatorTurnSsot;
  /** When true, skip lens parse (already tried / not handled). */
  skipLens?: boolean;
}): OperatorTurnPlan {
  const text = input.text.trim();
  if (!text && !input.ssot.hasActiveSpec) {
    return { tool: "noop", reason: "empty_input" };
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

  if (isInstantPoiSearch(text)) {
    return { tool: "scout", reason: "instant_poi_search" };
  }

  const kindFilter = parseResourceReelKindFilter(text);
  if (kindFilter !== null) {
    if (reelHasKindSlice(input.ssot, kindFilter)) {
      return {
        tool: "filter_inventory",
        kindFilter,
        reason: "narrow_cue_with_slice",
      };
    }
    return { tool: "scout", reason: "narrow_cue_without_slice" };
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
    tool === "scout" ||
    tool === "ask_chips"
  );
}
