/**
 * Default Capsule / Context name for close → Commit.
 */

import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

export function suggestWorkspaceCapsuleTitle(input: {
  readonly contextEventId: string;
  readonly workspace?: ContextWorkspaceState | null;
}): string {
  const event = findLifeEventCandidate(input.contextEventId);
  const fromEvent = event?.title?.trim();
  if (fromEvent) {
    return fromEvent;
  }
  const place = event?.place?.trim();
  if (place) {
    return /여행$/u.test(place) ? place : `${place} 여행`;
  }
  const query = input.workspace?.query?.trim() ?? "";
  if (query) {
    const cleaned = query.replace(/\s*숙소\s*$/u, "").trim();
    if (cleaned) {
      return /여행$/u.test(cleaned) ? cleaned : `${cleaned} 여행`;
    }
  }
  return "새 맥락";
}
