import type { SemanticTriple } from "@/lib/semantic/types";

export function pushSemanticTriple(
  out: SemanticTriple[],
  triple: SemanticTriple,
  max = 32,
): void {
  if (out.length >= max) {
    return;
  }
  const dup = out.some(
    (row) =>
      row.subjectId === triple.subjectId &&
      row.predicate === triple.predicate &&
      row.objectId === triple.objectId,
  );
  if (!dup) {
    out.push(triple);
  }
}
