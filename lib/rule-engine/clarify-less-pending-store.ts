/**
 * ClarifyLess pending — one ask; chip pick resumes same turn pipeline.
 */

export type ClarifyLessPending = {
  readonly originalUtterance: string;
  readonly intentLabelKo: string;
  readonly candidateIds: readonly string[];
  readonly atIso: string;
};

const pendingByContext = new Map<string, ClarifyLessPending>();

export function writeClarifyLessPending(
  contextEventId: string,
  pending: ClarifyLessPending,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  pendingByContext.set(id, pending);
}

export function readClarifyLessPending(
  contextEventId: string,
): ClarifyLessPending | null {
  return pendingByContext.get(contextEventId.trim()) ?? null;
}

export function clearClarifyLessPending(contextEventId: string): void {
  pendingByContext.delete(contextEventId.trim());
}

/**
 * Resume utterance after chip pick — prepend picked label for graph resolve.
 */
export function buildClarifyResumeUtterance(input: {
  readonly originalUtterance: string;
  readonly pickedLabelKo: string;
}): string {
  const original = input.originalUtterance.trim();
  const label = input.pickedLabelKo.trim();
  if (!label) {
    return original;
  }
  if (!original) {
    return label;
  }
  // Prefer entity-first resume so pin/delete/reserve resolve the chip pick.
  return `${label} ${original}`;
}
