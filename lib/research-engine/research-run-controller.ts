/**
 * Research run session — supersede prior in-flight work (Cursor cancel feel).
 */

import {
  markScoutNarrationComposeDone,
  readRunningScoutNarrationTurnId,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";

const generationByContext = new Map<string, number>();
const controllerByContext = new Map<string, AbortController>();

export type ResearchRunHandle = {
  readonly contextEventId: string;
  readonly generation: number;
  readonly signal: AbortSignal;
  readonly isCurrent: () => boolean;
  readonly abort: () => void;
};

/** Abort any prior Research for this context; return a fresh AbortSignal. */
export function beginResearchRun(contextEventId: string): ResearchRunHandle {
  const id = contextEventId.trim();
  controllerByContext.get(id)?.abort();

  const runningNarration = readRunningScoutNarrationTurnId(id);
  if (runningNarration) {
    markScoutNarrationComposeDone(id, runningNarration);
  }

  const generation = (generationByContext.get(id) ?? 0) + 1;
  generationByContext.set(id, generation);
  const controller = new AbortController();
  controllerByContext.set(id, controller);

  return {
    contextEventId: id,
    generation,
    signal: controller.signal,
    isCurrent: () =>
      generationByContext.get(id) === generation && !controller.signal.aborted,
    abort: () => {
      controller.abort();
    },
  };
}

export function isResearchRunCurrent(
  contextEventId: string,
  generation: number,
): boolean {
  const id = contextEventId.trim();
  return generationByContext.get(id) === generation;
}

export function throwIfResearchAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    const err = new Error("research_aborted");
    err.name = "AbortError";
    throw err;
  }
}
