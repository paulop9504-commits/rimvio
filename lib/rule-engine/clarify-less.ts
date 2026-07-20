/**
 * Clarify Less — at most one clarification; single candidate → execute.
 * Ambiguous → one chip set; pick re-enters the same turn pipeline.
 */

export type ClarifyCandidate = {
  readonly id: string;
  readonly labelKo: string;
};

export type ClarifyLessChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: string;
  readonly value: string;
};

export type ClarifyLessResult =
  | {
      readonly kind: "execute";
      readonly picked: ClarifyCandidate;
      readonly reasonKo: string;
    }
  | {
      readonly kind: "clarify";
      readonly questionKo: string;
      readonly candidates: readonly ClarifyCandidate[];
      /** Exactly one ask — chip pick resumes pipeline with picked id. */
      readonly chips: readonly ClarifyLessChip[];
    }
  | {
      readonly kind: "blocked";
      readonly reasonKo: string;
    };

function chipsFromCandidates(
  candidates: readonly ClarifyCandidate[],
): readonly ClarifyLessChip[] {
  return candidates.slice(0, 5).map((c) => ({
    id: `clarify_${c.id}`,
    labelKo: c.labelKo,
    gapId: "pick",
    value: c.id,
  }));
}

/**
 * R4 — Prefer execute. Ask once only when ≥2 candidates and no ordinal/selection.
 */
export function resolveClarifyLess(input: {
  readonly intentLabelKo: string;
  readonly candidates: readonly ClarifyCandidate[];
  /** Explicit ordinal / selection already resolved (첫 번째, 선택됨). */
  readonly alreadyResolved?: ClarifyCandidate | null;
}): ClarifyLessResult {
  if (input.alreadyResolved) {
    return {
      kind: "execute",
      picked: input.alreadyResolved,
      reasonKo: "이미 고른 대상으로 진행해요",
    };
  }

  const list = input.candidates.filter((c) => c.id && c.labelKo.trim());
  if (list.length === 0) {
    return {
      kind: "blocked",
      reasonKo: `${input.intentLabelKo}할 대상이 없어요`,
    };
  }
  if (list.length === 1) {
    return {
      kind: "execute",
      picked: list[0]!,
      reasonKo: "대상이 하나라 바로 진행해요",
    };
  }

  const names = list
    .slice(0, 3)
    .map((c) => c.labelKo)
    .join(" · ");
  const candidates = list.slice(0, 5);
  return {
    kind: "clarify",
    questionKo: `어느 ${input.intentLabelKo} 말씀하시나요? (${names})`,
    candidates,
    chips: chipsFromCandidates(candidates),
  };
}

/** Prefer first visible reservable — 「첫 번째 예약」. */
export function pickFirstCandidate(
  candidates: readonly ClarifyCandidate[],
): ClarifyCandidate | null {
  return candidates[0] ?? null;
}
