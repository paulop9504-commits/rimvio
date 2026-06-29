import { dispatchExecutionFeedClear } from "@/lib/context-run/execution-feed-bridge";
import {
  clearRunState,
  completeRunState,
  readActiveRunState,
} from "@/lib/context-run/run-state-store";

/** Result artifact linger — enough to read toast/summary, then dismiss. */
export const EXECUTION_FEED_DONE_TTL_MS = 8_000;

/** Idle linger after supply ack when no durable run is active. */
export const EXECUTION_FEED_IDLE_TTL_MS = 20_000;

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function shouldRetainExecutionFeed(): boolean {
  const run = readActiveRunState();
  return run?.status === "active";
}

export function cancelExecutionFeedDismiss(): void {
  if (dismissTimer != null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function finalizeFeedDismiss(): void {
  dispatchExecutionFeedClear();
  const run = readActiveRunState();
  if (run?.status === "completed") {
    clearRunState();
  }
}

export function scheduleExecutionFeedDismiss(
  reason: "supply_clear" | "run_complete",
): void {
  cancelExecutionFeedDismiss();

  if (reason === "supply_clear" && shouldRetainExecutionFeed()) {
    return;
  }

  const ttl =
    reason === "run_complete"
      ? EXECUTION_FEED_DONE_TTL_MS
      : EXECUTION_FEED_IDLE_TTL_MS;

  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    if (reason === "supply_clear" && shouldRetainExecutionFeed()) {
      return;
    }
    finalizeFeedDismiss();
  }, ttl);
}

/** Mark run complete and schedule feed dismiss — quick-list / wizard confirm. */
export function finishContextRun(): void {
  completeRunState();
  scheduleExecutionFeedDismiss("run_complete");
}
