import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import {
  normalizeAnchorId,
  type NormalizeAnchorInput,
} from "@/lib/events/normalize-anchor-id";

/** Action dispatcher entry — resolve ec-id then load EventCandidate metadata. */
export function resolveDockEventCandidate(
  input: NormalizeAnchorInput
): EventCandidate | null {
  const ecId = normalizeAnchorId(input);
  if (!ecId) {
    return null;
  }
  return findEventCandidate(ecId);
}

export { normalizeAnchorId };
