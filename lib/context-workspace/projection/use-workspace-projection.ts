"use client";

import { useSyncExternalStore } from "react";
import {
  readWorkspaceProjection,
  subscribeWorkspaceProjection,
} from "@/lib/context-workspace/projection/compare-decision-state";
import type { WorkspaceProjectionState } from "@/lib/context-workspace/projection/types";

/**
 * Subscribe to Workspace Projection Mode for a Context.
 * Compare Decision is projection — not sheet-open boolean.
 */
export function useWorkspaceProjection(
  contextEventId: string | null | undefined,
): WorkspaceProjectionState {
  const id = contextEventId?.trim() ?? "";
  return useSyncExternalStore(
    subscribeWorkspaceProjection,
    () => readWorkspaceProjection(id),
    () => readWorkspaceProjection(""),
  );
}
