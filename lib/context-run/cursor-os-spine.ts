/**
 * Cursor OS Spine SSOT — four locked axes for “알아서 도는” NL.
 * Not a chat dump: Intent → Tool → Graph Diff → approval surface.
 *
 * @see docs/adr/021-cursor-os-spine-ssot.md
 * @see docs/adr/013-cursor-rimvio-isomorphism.md
 */

import {
  COMMIT_REQUIRED_INTENTS,
  SOFT_CONFIRM_INTENTS,
} from "@/lib/rule-engine/constitution";
import { NL_PIPELINE_STAGES } from "@/lib/context-run/natural-language-pipeline";

/** Product law — one line. */
export const CURSOR_OS_SPINE_LAW =
  "Intent routes Tools; lodging Search opens Context Workspace until Commit; other Tools stamp Graph Diff; stages stay ordered; only dangerous Actions Field-Commit." as const;

export const CURSOR_OS_SPINE_VERSION = 1 as const;

/**
 * Canonical Search tool stage order (must not invert).
 * Full NL stages remain `NL_PIPELINE_STAGES`.
 */
export const SEARCH_DIFF_STAGE_ORDER = [
  "tool_router",
  "graph_command_ir",
  "graph_engine",
] as const;

export type CursorOsSpineAxisId =
  | "intent_tool_router"
  | "tool_to_graph_diff"
  | "stage_order"
  | "approval_surface";

export type CursorOsSpineAxis = {
  readonly id: CursorOsSpineAxisId;
  readonly titleEn: string;
  readonly summaryKo: string;
  /** Code SSOT paths — PR must touch these, not invent parallel stores. */
  readonly wires: readonly string[];
};

/**
 * Four locked axes — Cursor Agent loop mapped onto Rimvio Reality Graph.
 */
export const CURSOR_OS_SPINE_AXES: readonly CursorOsSpineAxis[] = [
  {
    id: "intent_tool_router",
    titleEn: "Intent → ToolId",
    summaryKo:
      "Search만 lookup Tool · Revise/Pin/Filter/Delete는 tool null (graph/slots)",
    wires: [
      "lib/rule-engine/classify-intent-family.ts",
      "lib/rule-engine/resolve-tool-id.ts",
      "lib/rule-engine/route-tool-family.ts",
      "lib/tool-registry/invoke-rimvio-tool.ts",
    ],
  },
  {
    id: "tool_to_graph_diff",
    titleEn: "Tool result → Graph / Diff",
    summaryKo:
      "채팅 dump 금지 · lodging은 Workspace 우선 · Commit 후 lastBatch/session graph · Planner Diff 묶음",
    wires: [
      "lib/context-workspace/",
      "lib/graph-command/stamp-search-tool-results-to-diff.ts",
      "lib/graph-command/apply-graph-commands.ts",
      "lib/action-planner/run-action-plan.ts",
      "lib/reality-object/stamp-graph-node-object.ts",
      "lib/graph-command/project-session-graph-to-brain.ts",
      "lib/graph-command/bump-session-graph-projection.ts",
    ],
  },
  {
    id: "stage_order",
    titleEn: "Pipeline stage order",
    summaryKo:
      "tool_router → graph_command_ir → graph_engine (Search Diff 경로)",
    wires: [
      "lib/context-run/natural-language-pipeline.ts",
      "lib/context-run/run-natural-language-pipeline.ts",
    ],
  },
  {
    id: "approval_surface",
    titleEn: "Commit vs soft confirm",
    summaryKo:
      "Reserve/Purchase(+reservedOpIds) → Field Commit · 조건 수정 → soft chip",
    wires: [
      "lib/rule-engine/constitution.ts",
      "lib/rule-engine/gate-rule-execution.ts",
      "lib/globe/soft-confirm/",
      "lib/globe/context-hub/try-run-revise-command.ts",
      "lib/reality-commit/",
    ],
  },
] as const;

/** Field Commit Intent set — must stay Reserve | Purchase only. */
export const SPINE_FIELD_COMMIT_INTENTS = COMMIT_REQUIRED_INTENTS;

/** Soft confirm Intent set — condition edits, not Field. */
export const SPINE_SOFT_CONFIRM_INTENTS = SOFT_CONFIRM_INTENTS;

/** booking.prepare is prepare-only — Reality waits for Field Commit. */
export const SPINE_PREPARE_ONLY_TOOL_IDS = ["booking.prepare"] as const;

export function assertSearchDiffStageOrder(
  stagesVisited: readonly string[],
): boolean {
  const positions = SEARCH_DIFF_STAGE_ORDER.map((stage) =>
    stagesVisited.indexOf(stage),
  );
  if (positions.some((p) => p < 0)) {
    return false;
  }
  for (let i = 1; i < positions.length; i++) {
    if (positions[i]! < positions[i - 1]!) {
      return false;
    }
  }
  return true;
}

/** Full NL stage list must remain the pipeline SSOT. */
export function spineUsesCanonicalNlStages(): boolean {
  return NL_PIPELINE_STAGES.includes("tool_router");
}
