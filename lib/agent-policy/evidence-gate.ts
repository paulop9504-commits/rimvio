/**
 * Law 14 — Evidence Required.
 * Recommend only with grounded evidence lines (never bare “추천”).
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ConstraintMemoryBag } from "@/lib/agent-policy/constraint-memory";

export const RECOMMEND_EVIDENCE_KINDS = [
  "distance",
  "price",
  "schedule",
  "preference",
  "rating",
  "constraint",
] as const;

export type RecommendEvidenceKind = (typeof RECOMMEND_EVIDENCE_KINDS)[number];

export type RecommendEvidence = {
  readonly ok: boolean;
  readonly linesKo: readonly string[];
  readonly kinds: readonly RecommendEvidenceKind[];
};

export function buildRecommendEvidence(input: {
  readonly node: Pick<
    ContextWorkspaceNode,
    "title" | "amountLabel" | "rating" | "tags" | "summaryKo"
  >;
  readonly constraints?: ConstraintMemoryBag | null;
  readonly walkMinutes?: number | null;
  readonly judgmentKo?: string | null;
}): RecommendEvidence {
  const lines: string[] = [];
  const kinds: RecommendEvidenceKind[] = [];
  const push = (kind: RecommendEvidenceKind, line: string) => {
    const t = line.trim();
    if (!t || lines.includes(t)) return;
    lines.push(t);
    kinds.push(kind);
  };

  if (input.walkMinutes != null && Number.isFinite(input.walkMinutes)) {
    push("distance", `도보 ${Math.round(input.walkMinutes)}분`);
  }
  if (input.node.amountLabel?.trim()) {
    push("price", `요금 · ${input.node.amountLabel.trim()}`);
  }
  if (input.node.rating != null && Number.isFinite(input.node.rating)) {
    push("rating", `평점 ★ ${input.node.rating.toFixed(1)}`);
  }
  if (input.judgmentKo?.trim()) {
    push("schedule", input.judgmentKo.trim());
  }
  const c = input.constraints;
  if (c?.nearLabelKo) {
    push("constraint", `${c.nearLabelKo} 위치 조건 충족`);
  }
  if (c?.maxNightlyPriceKrw != null && input.node.amountLabel) {
    push("preference", "예산 조건과 맞춤");
  }
  if (input.node.tags.some((t) => t.startsWith("stay:"))) {
    const stay = input.node.tags.find((t) => t.startsWith("stay:"));
    if (stay) push("preference", `타입 · ${stay.replace("stay:", "")}`);
  }

  return {
    ok: lines.length >= 1,
    linesKo: lines.slice(0, 4),
    kinds: kinds.slice(0, 4),
  };
}

/** Law 14 gate — block bare recommend copy without evidence. */
export function gateRecommendCopy(input: {
  readonly titleKo: string;
  readonly evidence: RecommendEvidence;
  readonly fallbackKo?: string | null;
}): { readonly ok: boolean; readonly copyKo: string; readonly evidence: RecommendEvidence } {
  if (!input.evidence.ok || input.evidence.linesKo.length === 0) {
    return {
      ok: false,
      copyKo:
        input.fallbackKo?.trim() ||
        `${input.titleKo} · 근거를 모으는 중이에요`,
      evidence: input.evidence,
    };
  }
  return {
    ok: true,
    copyKo: `${input.titleKo} · ${input.evidence.linesKo[0]}`,
    evidence: input.evidence,
  };
}
