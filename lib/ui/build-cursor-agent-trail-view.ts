/**
 * Map Agent Activity transcript → Cursor-like trail view model (ADR-050).
 * Hierarchy: Thought Xs · phase verb · nested Auto · Exploring · Waiting.
 */

import type {
  AgentActivityEvent,
  AgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";

export type CursorAgentTrailStep = {
  readonly id: string;
  readonly tier: "main" | "sub";
  readonly labelKo: string;
  readonly detailKo: string | null;
  readonly active: boolean;
  readonly done: boolean;
};

export type CursorAgentTrailNestedStep = {
  readonly id: string;
  readonly titleKo: string;
  readonly detailKo: string | null;
  readonly auto: boolean;
  readonly active: boolean;
};

export type CursorAgentTrailView = {
  readonly goalKo: string;
  readonly startedAtMs: number;
  readonly running: boolean;
  readonly ranCount: number;
  readonly toolCount: number;
  readonly exploredCount: number;
  readonly toolsUsedLineKo: string;
  readonly steps: readonly CursorAgentTrailStep[];
  /** Cursor: "Thought for 6s" */
  readonly thoughtLineKo: string;
  /** Cursor: "Running tool" / "Planning next moves" */
  readonly phaseLineKo: string | null;
  readonly summaryLineKo: string;
  readonly exploredLineKo: string | null;
  readonly nested: CursorAgentTrailNestedStep | null;
  readonly waitLineKo: string | null;
  readonly finished: boolean;
  readonly doneLineKo: string | null;
};

function phaseLineFor(
  last: AgentActivityEvent,
  running: boolean,
): string | null {
  if (!running) return null;
  switch (last.kind) {
    case "tool":
      return copy.globe.activityTrail.runningTool;
    case "explore":
      return copy.globe.activityTrail.planningMoves;
    case "thought":
      return copy.globe.activityTrail.planningMoves;
    case "patch":
      return copy.globe.activityTrail.runningTool;
    case "verify":
      return copy.globe.activityTrail.waitingAgent;
    default:
      return copy.globe.activityTrail.planningMoves;
  }
}

function nestedTitleFor(last: AgentActivityEvent): string {
  const label = last.labelKo.trim();
  if (label) return label;
  return copy.globe.activityTrail.boot;
}

function nestedDetailFor(
  last: AgentActivityEvent,
  running: boolean,
): string | null {
  if (last.detailKo?.trim()) return last.detailKo.trim();
  if (!running) return null;
  if (last.kind === "explore") {
    return copy.globe.activityTrail.planningMoves;
  }
  if (last.kind === "tool" || last.kind === "patch") {
    return copy.globe.activityTrail.runningTool;
  }
  return copy.globe.activityTrail.planningMoves;
}

function buildTrailSteps(
  events: readonly AgentActivityEvent[],
  running: boolean,
): CursorAgentTrailStep[] {
  const steps: CursorAgentTrailStep[] = [];
  for (const event of events) {
    const label = event.labelKo.trim() || event.detailKo?.trim() || "";
    if (!label) continue;

    if (event.kind === "thought" || event.kind === "verify") {
      steps.push({
        id: event.id,
        tier: "main",
        labelKo: label,
        detailKo: event.detailKo?.trim() || null,
        active: running && event === events[events.length - 1],
        done: !running || event !== events[events.length - 1],
      });
      continue;
    }

    steps.push({
      id: event.id,
      tier: event.kind === "explore" ? "sub" : "main",
      labelKo: label,
      detailKo: event.detailKo?.trim() || null,
      active: running && event === events[events.length - 1],
      done: !running || event !== events[events.length - 1],
    });
  }

  if (steps.length === 0 && events.length > 0) {
    const last = events[events.length - 1]!;
    steps.push({
      id: last.id,
      tier: "main",
      labelKo: nestedTitleFor(last),
      detailKo: nestedDetailFor(last, running),
      active: running,
      done: !running,
    });
  }

  return steps;
}

export function buildCursorAgentTrailView(
  tape: AgentActivityTranscript | null,
  nowMs: number = Date.now(),
): CursorAgentTrailView | null {
  if (!tape || tape.events.length === 0) {
    return null;
  }

  const toolish = tape.events.filter(
    (e) => e.kind === "tool" || e.kind === "explore" || e.kind === "patch",
  );
  const toolCount = tape.events.filter((e) => e.kind === "tool" || e.kind === "patch").length;
  const ranCount = Math.max(1, toolish.length || tape.events.length - 1);
  const exploredCount = tape.events.filter((e) => e.kind === "explore").length;
  const endMs = tape.endedAtMs ?? nowMs;
  const thoughtSec = Math.max(
    1,
    Math.round((endMs - tape.startedAtMs) / 1000),
  );

  const last = tape.events[tape.events.length - 1]!;
  const nestedActive = tape.running;

  return {
    goalKo:
      tape.utterance.trim().slice(0, 96) ||
      copy.globe.activityTrail.title,
    startedAtMs: tape.startedAtMs,
    running: tape.running,
    ranCount,
    toolCount,
    exploredCount,
    toolsUsedLineKo: copy.globe.activityTrail.toolsUsed(toolCount),
    steps: buildTrailSteps(tape.events, tape.running),
    thoughtLineKo: copy.globe.activityTrail.thoughtFor(thoughtSec),
    phaseLineKo: phaseLineFor(last, tape.running),
    summaryLineKo: copy.globe.activityTrail.ranCommands(ranCount),
    exploredLineKo:
      exploredCount > 0
        ? copy.globe.activityTrail.exploredSearches(exploredCount)
        : toolish.length > 0
          ? copy.globe.activityTrail.exploredSearches(Math.min(ranCount, 1))
          : null,
    nested: {
      id: last.id,
      titleKo: nestedTitleFor(last),
      detailKo: nestedDetailFor(last, nestedActive),
      auto: true,
      active: nestedActive,
    },
    waitLineKo: tape.running
      ? exploredCount > 0 || last.kind === "tool"
        ? copy.globe.activityTrail.waitingSubagent
        : copy.globe.activityTrail.waitingAgent
      : null,
    finished: !tape.running,
    doneLineKo: !tape.running ? copy.globe.activityTrail.done : null,
  };
}
