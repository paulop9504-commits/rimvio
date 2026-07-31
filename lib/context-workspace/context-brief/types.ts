/**
 * Context Brief — graph-level summary (not LLM essay SSOT).
 * @see docs/adr/022-context-workspace-first.md
 */

export type ContextBriefRoleKind =
  | "arrival"
  | "stay"
  | "experience"
  | "food"
  | "route"
  | "other";

export type ContextBriefRole = {
  readonly kind: ContextBriefRoleKind;
  readonly labelKo: string;
  readonly placeTitle: string;
  readonly nodeId: string;
};

/** Graph → short human brief. groundsKo max 4. */
export type ContextBrief = {
  readonly titleKo: string;
  readonly thesisKo: string;
  readonly groundsKo: readonly string[];
  readonly roles: readonly ContextBriefRole[];
  readonly nodeIdsInOrder: readonly string[];
};

/** Peek Mini Brief — max 3 lines from entity attrs. */
export type NodeContextBrief = {
  readonly roleLabelKo: string | null;
  readonly linesKo: readonly string[];
};
