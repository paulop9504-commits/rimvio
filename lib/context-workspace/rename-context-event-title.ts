/**
 * Soft rename of Context Event title (Capsule label) before / on Commit.
 */

import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function renameContextEventTitle(
  contextEventId: string,
  titleKo: string,
): boolean {
  const id = contextEventId.trim();
  const title = titleKo.trim();
  if (!id || !title) {
    return false;
  }
  const event = findLifeEventCandidate(id);
  if (!event) {
    return false;
  }
  if (event.title === title) {
    return true;
  }
  commitEventUpsert({
    id: event.id,
    title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: event.metadata,
  });
  return true;
}
