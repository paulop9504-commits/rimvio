/**
 * Operator turn — Context SSOT + fixed tool gate.
 * @see docs/RIMVIO_OPERATOR_TURN.md
 */

import type { ExplorationMode } from "@/lib/globe/discovery-policy";
import type { ScoutContract } from "@/lib/globe/contracts/scout-contract";
import type { ScoutSelectedAnchorWire } from "@/lib/globe/contracts/scout-contract-store";
import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { DiscoveryLensSession } from "@/lib/globe/discovery-lens/types";
import type { ResourceReelKindFilter } from "@/lib/globe/resource-reel/resource-reel-kind-filter";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

/** Fixed whitelist — no invent-at-runtime tools. */
export const OPERATOR_FIXED_TOOLS = [
  "lens_command",
  "filter_inventory",
  "small_talk",
  "task_injection",
  "scout",
  "ask_chips",
] as const;

export type OperatorFixedToolId = (typeof OPERATOR_FIXED_TOOLS)[number];

export type OperatorTurnSsot = {
  readonly contextEventId: string;
  readonly scoutContract: ScoutContract | null;
  readonly selectedAnchor: ScoutSelectedAnchorWire | null;
  readonly lensSession: DiscoveryLensSession | null;
  readonly lastBatch: ContextConditionLastBatchWire | null;
  readonly reelKinds: readonly GlobeResourceReelKind[];
  readonly reelItemCount: number;
  readonly composeTail: readonly { role: string; text: string }[];
  readonly hasActiveSpec: boolean;
  /** Scout distribution policy for this turn (deterministic). */
  readonly explorationMode: ExplorationMode;
};

export type OperatorTurnPlan =
  | {
      readonly tool: "lens_command";
      readonly reason: "nl_lens_candidate";
    }
  | {
      readonly tool: "filter_inventory";
      readonly kindFilter: ResourceReelKindFilter;
      readonly reason: "narrow_cue_with_slice";
    }
  | {
      readonly tool: "scout";
      readonly reason:
        | "narrow_cue_without_slice"
        | "search_or_bare_domain"
        | "classify_search"
        | "instant_poi_search"
        | "instant_eatery_search"
        | "instant_lodging_search";
    }
  | {
      readonly tool: "defer_classify";
      readonly reason: "needs_chat_task_search_split";
    }
  | {
      readonly tool: "small_talk";
      readonly reason: "classify_chat";
    }
  | {
      readonly tool: "task_injection";
      readonly reason: "classify_task";
    }
  | {
      readonly tool: "ask_chips";
      readonly reason: "convergence_or_clarify";
    }
  | {
      readonly tool: "noop";
      readonly reason: "empty_input";
    };

export type OperatorClassifyCategory = "chat" | "task" | "search";
