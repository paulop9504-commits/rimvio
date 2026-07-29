/**
 * Session store for Context Reference Links (ADR-030).
 */

import type { ContextReferenceLink } from "@/lib/context-reference/types";

const byTarget = new Map<string, ContextReferenceLink[]>();
const EVENT = "rimvio:context-reference-links";

function emit(targetEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { targetEventId } }),
  );
}

export function listContextReferenceLinks(
  targetEventId: string,
): readonly ContextReferenceLink[] {
  const id = targetEventId.trim();
  if (!id) {
    return [];
  }
  return byTarget.get(id) ?? [];
}

export function writeContextReferenceLink(
  link: ContextReferenceLink,
): ContextReferenceLink {
  const target = link.targetEventId.trim();
  const prev = byTarget.get(target) ?? [];
  const next = [
    link,
    ...prev.filter(
      (row) =>
        !(
          row.sourceEventId === link.sourceEventId &&
          row.kind === link.kind
        ),
    ),
  ].slice(0, 24);
  byTarget.set(target, next);
  emit(target);
  return link;
}

export function clearContextReferenceLinksForTests(): void {
  byTarget.clear();
}

export { EVENT as CONTEXT_REFERENCE_LINKS_UPDATED };
