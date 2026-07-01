import { dispatchExecutionFeedClear } from "@/lib/context-run/execution-feed-bridge";
import { clearGlobeChatSession } from "@/lib/globe/chat/globe-chat-session-store";
import { clearPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

/** Reset compose chat — spectrum X starts a fresh thread. */
export function resetGlobeComposeChatSession(graphId: string): void {
  if (!graphId.trim()) {
    return;
  }
  clearGlobeChatSession(graphId.trim());
  clearPortalComposeRunState(graphId.trim());
  dispatchExecutionFeedClear();
}
