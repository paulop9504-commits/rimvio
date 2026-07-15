/**
 * Cursor-like Research approval gate — apply / reject after 납득.
 * Scores prepare; humans approve; Reality does not Commit here.
 */

import type { OperatorAskChipsComposePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";

/** Min 납득 to offer Apply (below → revise-first chip stronger). */
export const RESEARCH_APPROVAL_APPLY_MIN_CONFIDENCE = 0.35;

export type ResearchApprovalChipId = "apply" | "reject" | "revise";

export type ResearchApprovalGateBuilt = {
  readonly promptKo: string;
  readonly offerApply: boolean;
  readonly chips: OperatorAskChipsComposePayload["chips"];
  readonly snapshot: {
    readonly confidence: number;
    readonly bestTitle: string;
    readonly bestCandidateId: string | null;
    readonly sectorSummariesKo: readonly string[];
  };
};

/**
 * Build apply/reject chips like Cursor. Weak 납득 still shows gate,
 * but Apply is soft-labeled when signals are thin.
 */
export function buildResearchApprovalGate(input: {
  confidence: number;
  evidenceWeak: boolean;
  bestTitle: string;
  bestCandidateId: string | null;
  sectorSummariesKo?: readonly string[];
}): ResearchApprovalGateBuilt | null {
  const bestId = input.bestCandidateId?.trim() || null;
  const bestTitle = input.bestTitle?.trim() || "";
  if (!bestId && !bestTitle) {
    return null;
  }

  const confidence = input.confidence;
  const offerApply =
    confidence >= RESEARCH_APPROVAL_APPLY_MIN_CONFIDENCE &&
    Boolean(bestId || bestTitle) &&
    !input.evidenceWeak;

  const softApply =
    confidence >= RESEARCH_APPROVAL_APPLY_MIN_CONFIDENCE &&
    input.evidenceWeak;

  const sectorSummariesKo = input.sectorSummariesKo ?? [];

  const confPct = Math.round(confidence * 100);
  const promptKo = offerApply
    ? `납득도 ${confPct} · 「${bestTitle}」 — 이 근거로 진행할까요?`
    : softApply
      ? `납득도 ${confPct} · 신호는 적지만 「${bestTitle}」로 진행할까요?`
      : `납득도 ${confPct} · 근거가 약합니다. 다시 조사할까요?`;

  const chips: OperatorAskChipsComposePayload["chips"] = [];

  if (offerApply || softApply) {
    chips.push({
      id: "apply",
      labelKo: offerApply ? "이 근거로 진행" : "이대로 진행(약)",
      gapId: "research_approval",
      value: "apply",
    });
  }

  chips.push({
    id: "revise",
    labelKo: "조건 바꿔 다시",
    gapId: "research_approval",
    value: "revise",
  });

  chips.push({
    id: "reject",
    labelKo: "이 결과 거절",
    gapId: "research_approval",
    value: "reject",
  });

  return {
    promptKo,
    offerApply: offerApply || softApply,
    chips,
    snapshot: {
      confidence,
      bestTitle,
      bestCandidateId: bestId,
      sectorSummariesKo,
    },
  };
}

/** Compose one-liner under Research text when chips also append. */
export function formatResearchApprovalPromptKo(
  gate: ResearchApprovalGateBuilt,
): string {
  const labels = gate.chips.map((c) => c.labelKo).join(" · ");
  return `${gate.promptKo}\n→ ${labels}`;
}
