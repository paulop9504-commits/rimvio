import type {
  ExecutionFeedArtifactInput,
  ExecutionFeedGoalInput,
  ExecutionFeedState,
  ExecutionFeedStepInput,
} from "@/lib/context-run/execution-feed-types";
import { cancelExecutionFeedDismiss } from "@/lib/context-run/execution-feed-lifecycle";
import {
  reduceExecutionFeedArtifact,
  reduceExecutionFeedArtifactTab,
  reduceExecutionFeedClear,
  reduceExecutionFeedGoal,
  reduceExecutionFeedStep,
  reduceExecutionFeedTogglePill,
} from "@/lib/context-run/execution-feed-reducer";

export const GLOBE_EXECUTION_FEED_CHANGE = "rimvio:globe-execution-feed-change";

let feedState: ExecutionFeedState = { run: null };
let lastComposerGoalKo = "";

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ExecutionFeedState>(GLOBE_EXECUTION_FEED_CHANGE, {
      detail: feedState,
    }),
  );
}

export function readExecutionFeedState(): ExecutionFeedState {
  return feedState;
}

export function dispatchExecutionFeedGoal(input: ExecutionFeedGoalInput): void {
  cancelExecutionFeedDismiss();
  lastComposerGoalKo = input.goalKo.trim();
  feedState = reduceExecutionFeedGoal(feedState, input);
  emit();
}

export function readLastComposerGoalKo(): string {
  return lastComposerGoalKo;
}

export function dispatchExecutionFeedStep(input: ExecutionFeedStepInput): void {
  feedState = reduceExecutionFeedStep(feedState, input);
  emit();
}

export function dispatchExecutionFeedArtifact(input: ExecutionFeedArtifactInput): void {
  feedState = reduceExecutionFeedArtifact(feedState, input);
  emit();
}

export function dispatchExecutionFeedTogglePill(pillId: string): void {
  feedState = reduceExecutionFeedTogglePill(feedState, pillId);
  emit();
}

export function dispatchExecutionFeedArtifactTab(tabId: string): void {
  feedState = reduceExecutionFeedArtifactTab(feedState, tabId);
  emit();
}

export function dispatchExecutionFeedClear(): void {
  feedState = reduceExecutionFeedClear();
  emit();
}

export function subscribeExecutionFeedChange(
  listener: (state: ExecutionFeedState) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ExecutionFeedState>).detail);
  };
  window.addEventListener(GLOBE_EXECUTION_FEED_CHANGE, handler);
  listener(feedState);
  return () => window.removeEventListener(GLOBE_EXECUTION_FEED_CHANGE, handler);
}
