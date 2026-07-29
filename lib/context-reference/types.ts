/**
 * Context Reference Link — user-approved edges between independent Contexts (ADR-030).
 */

export const CONTEXT_REFERENCE_KINDS = [
  "style",
  "preference",
  "budget",
  "generic",
] as const;

export type ContextReferenceKind = (typeof CONTEXT_REFERENCE_KINDS)[number];

export type ContextReferenceLink = {
  readonly id: string;
  /** Context that receives preference / style (e.g. Osaka). */
  readonly targetEventId: string;
  /** Context that is referenced, not mutated (e.g. Jeju). */
  readonly sourceEventId: string;
  readonly kind: ContextReferenceKind;
  readonly labelKo: string;
  readonly approvedByHuman: true;
  readonly createdAtIso: string;
  /** Short preference lines extracted at link time (display / scout bias). */
  readonly preferenceLinesKo: readonly string[];
};

export type LinkableContextCandidate = {
  readonly eventId: string;
  readonly titleKo: string;
  readonly placeKo: string | null;
  readonly kind: ContextReferenceKind;
  readonly chipLabelKo: string;
};
