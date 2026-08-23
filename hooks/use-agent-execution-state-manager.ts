"use client";

/**
 * Always-on Agent Execution State — subscribe + refresh for Workspace / Globe UI.
 */

import { useEffect, useState } from "react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  ensureAgentExecutionStateManager,
  readAgentExecutionStateSnapshot,
  refreshAgentExecutionStateSnapshot,
  type AgentExecutionStateSnapshot,
} from "@/lib/workstream/agent-execution-state-manager";
import { subscribeAgentRuntimeBus } from "@/lib/workstream/agent-runtime-bus";
import { subscribeAgentExecutionSession } from "@/lib/workstream/agent-execution-session";
import { subscribeContextWorkspaceUpdated } from "@/lib/context-workspace/workspace-store";

export function useAgentExecutionStateManager(
  contextEventId: string,
): AgentExecutionStateSnapshot | null {
  const [snapshot, setSnapshot] = useState<AgentExecutionStateSnapshot | null>(
    null,
  );

  useEffect(() => {
    const id = contextEventId.trim();
    if (!id) {
      setSnapshot(null);
      return;
    }

    ensureAgentExecutionStateManager();

    const refresh = () => {
      const event = findLifeEventCandidate(id);
      setSnapshot(
        refreshAgentExecutionStateSnapshot({
          contextEventId: id,
          event,
        }),
      );
    };

    refresh();

    const unsubBus = subscribeAgentRuntimeBus((event) => {
      if (event.contextEventId !== id) return;
      refresh();
    });
    const unsubSession = subscribeAgentExecutionSession(() => refresh());
    const unsubWs = subscribeContextWorkspaceUpdated((updatedId) => {
      if (updatedId === id) refresh();
    });

    return () => {
      unsubBus();
      unsubSession();
      unsubWs();
    };
  }, [contextEventId]);

  return snapshot ?? readAgentExecutionStateSnapshot(contextEventId.trim());
}
