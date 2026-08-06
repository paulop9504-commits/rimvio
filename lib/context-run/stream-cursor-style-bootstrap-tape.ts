/**
 * Cursor-feel bootstrap — emit Thought → Explore → Tool frames with yields
 * so the Activity Trail paints mid-turn (not one frozen status line).
 */

import {
  appendAgentActivityEvent,
  yieldAgentActivityFrame,
} from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";

export async function streamCursorStyleBootstrapTape(input?: {
  readonly exploreLabelKo?: string | null;
  readonly toolLabelKo?: string | null;
}): Promise<void> {
  await yieldAgentActivityFrame(70);
  appendAgentActivityEvent({
    kind: "explore",
    labelKo:
      input?.exploreLabelKo?.trim() ||
      AGENT_BOOT_EXPLORE_KO,
    detailKo: copy.globe.activityTrail.planningMoves,
    metricKo: copy.globe.activityTrail.exploredSearches(1),
    stage: "object_discovery",
  });
  await yieldAgentActivityFrame(120);
  appendAgentActivityEvent({
    kind: "tool",
    labelKo:
      input?.toolLabelKo?.trim() ||
      AGENT_BOOT_TOOL_KO,
    detailKo: copy.globe.activityTrail.runningTool,
    stage: "object_enrichment",
  });
  await yieldAgentActivityFrame(80);
}

const AGENT_BOOT_EXPLORE_KO = "후보·조건 탐색";
const AGENT_BOOT_TOOL_KO = "도구로 후보 조회";

/** Yield between product stages so React can paint Cursor-like midsteps. */
export async function yieldBetweenAgentStages(ms = 90): Promise<void> {
  await yieldAgentActivityFrame(ms);
}
