/**
 * Resolve “계속해” → next Action utterance from Context Work State.
 */

import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import { isExplicitContextContinue } from "@/lib/context-run/should-spawn-new-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  readOrBuildContextWorkState,
} from "@/lib/workstream/sync-context-work-state";
import type { ContextWorkState } from "@/lib/workstream/context-work-state";
import type { ContextWorkNextAction } from "@/lib/workstream/context-work-state";

export function isContinueWorkUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (isExplicitContextContinue(text)) return true;
  if (classifyActionVerb(text) === "resume") return true;
  return /^(?:계속(?:해|해줘| 진행)?|이어서|다음|진행)$/iu.test(text);
}

export type NextWorkActionResult = {
  readonly work: ContextWorkState;
  readonly action: ContextWorkNextAction | null;
  readonly enqueueUtterance: string | null;
  readonly replyKo: string;
};

export function resolveNextWorkAction(input: {
  readonly contextEventId: string;
  readonly utterance?: string | null;
}): NextWorkActionResult {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  const work = readOrBuildContextWorkState({
    contextEventId,
    event,
  });
  const action = work.nextActions[0] ?? null;
  if (!action) {
    return {
      work,
      action: null,
      enqueueUtterance: null,
      replyKo:
        work.percent >= 100
          ? "핵심 칸은 채워졌어요. 결재함에서 확정하거나 더 말해 주세요."
          : "지금 바로 이을 다음 작업이 없어요. 숙소·맛집·동선 중 말해 주세요.",
    };
  }
  return {
    work,
    action,
    enqueueUtterance: action.enqueueUtterance,
    replyKo: `이어서 「${action.labelKo}」를 진행할게요.`,
  };
}
