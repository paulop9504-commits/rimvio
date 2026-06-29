"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dispatchExecutionFeedArtifactTab,
  dispatchExecutionFeedTogglePill,
  readExecutionFeedState,
  readLastComposerGoalKo,
  subscribeExecutionFeedChange,
} from "@/lib/context-run/execution-feed-bridge";
import {
  scheduleExecutionFeedDismiss,
} from "@/lib/context-run/execution-feed-lifecycle";
import type { ExecutionFeedState } from "@/lib/context-run/execution-feed-types";
import {
  syncIntentSupplyAckToFeed,
  syncIntentSupplyPendingToFeed,
} from "@/lib/context-run/sync-intent-supply-to-feed";
import { subscribeContextRunWatcher } from "@/lib/context-run/watcher-reconstruct";
import {
  subscribeGlobeIntentSupplyAck,
  subscribeGlobeIntentSupplyClear,
  subscribeGlobeIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-intent-supply-bridge";

/** Globe prompt execution feed — Claude-style pills + artifact, not chat. */
export function useGlobeExecutionFeed() {
  const [state, setState] = useState<ExecutionFeedState>(() => readExecutionFeedState());

  useEffect(() => subscribeExecutionFeedChange(setState), []);

  useEffect(() => subscribeContextRunWatcher(), []);

  useEffect(() => {
    return subscribeGlobeIntentSupplyPending((pending) => {
      const goalKo = readLastComposerGoalKo();
      if (!goalKo) {
        return;
      }
      syncIntentSupplyPendingToFeed(pending, goalKo);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeIntentSupplyAck((ack) => {
      const goalKo = readLastComposerGoalKo();
      syncIntentSupplyAckToFeed(ack, goalKo || ack.summaryKo);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeIntentSupplyClear(() => {
      scheduleExecutionFeedDismiss("supply_clear");
    });
  }, []);

  const togglePill = useCallback((pillId: string) => {
    dispatchExecutionFeedTogglePill(pillId);
  }, []);

  const toggleArtifactTab = useCallback((tabId: string) => {
    dispatchExecutionFeedArtifactTab(tabId);
  }, []);

  return { state, togglePill, toggleArtifactTab };
}
