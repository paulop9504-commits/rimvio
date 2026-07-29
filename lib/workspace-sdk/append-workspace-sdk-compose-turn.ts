/**
 * Append SDK prep turn into Context Agent compose thread.
 */

import { appendContextAgentComposeTurn } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import {
  dispatchWorkspaceSdkOpen,
  writeWorkspaceSdkSession,
} from "@/lib/workspace-sdk/workspace-sdk-session-store";

export function appendWorkspaceSdkComposeTurn(input: {
  readonly contextEventId: string;
  readonly frame: WorkspaceSdkFrame;
  /** Open Host immediately (default true). */
  readonly openHost?: boolean;
}): void {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return;
  }
  writeWorkspaceSdkSession(input.frame);
  appendContextAgentComposeTurn(contextEventId, {
    role: "assistant",
    kind: "workspace_sdk",
    text: input.frame.primaryFocus.askKo,
    payload: {
      frame: input.frame,
    },
  });
  if (input.openHost !== false) {
    dispatchWorkspaceSdkOpen(contextEventId);
  }
}
