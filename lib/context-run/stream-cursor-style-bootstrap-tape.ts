/**
 * Cursor-feel bootstrap — emit Thought → Explore → Tool frames with yields
 * so the Activity Trail paints mid-turn (not one frozen status line).
 */

import {
  appendAgentActivityEvent,
  yieldAgentActivityFrame,
} from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";

/** Match AgentExecutionFeed hold (~1.15s) + roll (~0.95s) so lines stay readable. */
const BOOT_YIELD_MS = 1100;
const STAGE_YIELD_MS = 1000;

export async function streamCursorStyleBootstrapTape(input?: {
  readonly exploreLabelKo?: string | null;
  readonly toolLabelKo?: string | null;
}): Promise<void> {
  await yieldAgentActivityFrame(BOOT_YIELD_MS);
  appendAgentActivityEvent({
    kind: "explore",
    labelKo:
      input?.exploreLabelKo?.trim() ||
      AGENT_BOOT_EXPLORE_KO,
    detailKo: copy.globe.activityTrail.planningMoves,
    metricKo: copy.globe.activityTrail.exploredSearches(1),
    stage: "object_discovery",
  });
  await yieldAgentActivityFrame(BOOT_YIELD_MS);
  appendAgentActivityEvent({
    kind: "tool",
    labelKo:
      input?.toolLabelKo?.trim() ||
      AGENT_BOOT_TOOL_KO,
    detailKo: copy.globe.activityTrail.runningTool,
    stage: "object_enrichment",
  });
  await yieldAgentActivityFrame(BOOT_YIELD_MS);
}

const AGENT_BOOT_EXPLORE_KO = "후보·조건 탐색";
const AGENT_BOOT_TOOL_KO = "도구로 후보 조회";

/** Yield between product stages so React can paint Cursor-like midsteps. */
export async function yieldBetweenAgentStages(ms = STAGE_YIELD_MS): Promise<void> {
  await yieldAgentActivityFrame(ms);
}
