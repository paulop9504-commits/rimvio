/**
 * Multi Operator roles — Coach / players metaphor for Context OS.
 * Does not invent a parallel chat OS; stamps only (+ reuse trade dual-approval).
 * @see docs/RIMVIO_TEAM_COLLABORATION.md Phase 3
 */

export const MULTI_OPERATOR_ROLES = [
  /** Globe AI / L1 — Intent · Blueprint create. Never Commits Reality. */
  "architect",
  /** Container AI / Operator — Execution prepare · Field handoff. Never Commits. */
  "operator",
  /** Captain — sole Reality Commit authority (Article 0). */
  "human",
] as const;

export type MultiOperatorRole = (typeof MULTI_OPERATOR_ROLES)[number];

export const CONTEXT_MULTI_OPERATOR_APPROVAL_META_KEY =
  "contextMultiOperatorApprovalV1" as const;

export type MultiOperatorApprovalWireV1 = {
  readonly version: 1;
  /** ISO stamps when each role marked ready — human stamp only after Commit. */
  readonly stamps: Readonly<Partial<Record<MultiOperatorRole, string>>>;
};

function asWire(value: unknown): MultiOperatorApprovalWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<MultiOperatorApprovalWireV1>;
  if (row.version !== 1 || !row.stamps || typeof row.stamps !== "object") {
    return null;
  }
  return row as MultiOperatorApprovalWireV1;
}

export function readMultiOperatorApproval(
  metadata: Record<string, unknown> | null | undefined,
): MultiOperatorApprovalWireV1 {
  return (
    asWire(metadata?.[CONTEXT_MULTI_OPERATOR_APPROVAL_META_KEY]) ?? {
      version: 1,
      stamps: {},
    }
  );
}

export function stampMultiOperatorRole(input: {
  metadata?: Record<string, unknown> | null;
  role: MultiOperatorRole;
  now?: Date;
}): Record<string, unknown> {
  const prev = readMultiOperatorApproval(input.metadata);
  const atIso = (input.now ?? new Date()).toISOString();
  const wire: MultiOperatorApprovalWireV1 = {
    version: 1,
    stamps: {
      ...prev.stamps,
      [input.role]: atIso,
    },
  };
  return {
    ...(input.metadata ?? {}),
    [CONTEXT_MULTI_OPERATOR_APPROVAL_META_KEY]: wire,
  };
}

/**
 * Operator-prepared + no human stamp yet → ready for captain Commit.
 * Missing wire = legacy path (compat: allow Commit).
 */
export function isOperatorPreparedForHumanCommit(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const wire = asWire(metadata?.[CONTEXT_MULTI_OPERATOR_APPROVAL_META_KEY]);
  if (!wire) {
    return true;
  }
  if (!wire.stamps.operator) {
    return true;
  }
  return !wire.stamps.human;
}

/** Market negotiation dual-approval — seeking + listing (existing room fields). */
export function isTradeDualApproved(room: {
  seekingApprovedAtIso: string | null;
  listingApprovedAtIso: string | null;
}): boolean {
  return Boolean(room.seekingApprovedAtIso && room.listingApprovedAtIso);
}
