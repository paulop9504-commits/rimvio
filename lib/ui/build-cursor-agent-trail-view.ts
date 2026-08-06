/**
 * Map Agent Activity transcript → Cursor-like trail view model (ADR-050).
 * Hierarchy: muted counters · goal · explore rollups · nested Auto step · wait footer.
 */

import type { AgentActivityTranscript } from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";

export type CursorAgentTrailNestedStep = {
  readonly id: string;
  readonly titleKo: string;
  readonly detailKo: string | null;
  readonly auto: boolean;
  readonly active: boolean;
};

export type CursorAgentTrailView = {
  readonly goalKo: string;
  readonly ranCount: number;
  readonly exploredCount: number;
  readonly summaryLineKo: string;
  readonly exploredLineKo: string | null;
  readonly nested: CursorAgentTrailNestedStep | null;
  readonly waitLineKo: string | null;
  readonly finished: boolean;
  readonly doneLineKo: string | null;
};

export function buildCursorAgentTrailView(
  tape: AgentActivityTranscript | null,
): CursorAgentTrailView | null {
  if (!tape || tape.events.length === 0) {
    return null;
  }

  const toolish = tape.events.filter(
    (e) => e.kind === "tool" || e.kind === "explore" || e.kind === "patch",
  );
  const ranCount = Math.max(1, toolish.length || tape.events.length - 1);
  const exploredCount = tape.events.filter((e) => e.kind === "explore").length;

  const last = tape.events[tape.events.length - 1]!;
  const nestedActive = tape.running;
  const nestedTitle =
    last.labelKo.trim() || copy.globe.activityTrail.boot;

  return {
    goalKo:
      tape.utterance.trim().slice(0, 96) ||
      copy.globe.activityTrail.title,
    ranCount,
    exploredCount,
    summaryLineKo: copy.globe.activityTrail.ranCommands(ranCount),
    exploredLineKo:
      exploredCount > 0
        ? copy.globe.activityTrail.exploredCommands(exploredCount)
        : toolish.length > 0
          ? copy.globe.activityTrail.exploredCommands(Math.min(ranCount, 1))
          : null,
    nested: {
      id: last.id,
      titleKo: nestedTitle,
      detailKo: nestedActive
        ? last.detailKo?.trim() || copy.globe.activityTrail.planningMoves
        : last.detailKo?.trim() || null,
      auto: true,
      active: nestedActive,
    },
    waitLineKo: nestedActive ? copy.globe.activityTrail.waitingAgent : null,
    finished: !tape.running,
    doneLineKo: !tape.running ? copy.globe.activityTrail.done : null,
  };
}
