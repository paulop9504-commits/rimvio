/**
 * Capability #93 — Change Explanation.
 * Human-readable rationale for each agent change.
 */

import type { DevProjectChange } from "@/lib/hub/dev/dev-project-state";

export type ChangeExplanation = {
  readonly changeId: string;
  readonly path: string;
  readonly summaryKo: string;
  readonly whyKo: string;
  readonly impactKo: string;
};

function explainPath(path: string, summary: string): { whyKo: string; impactKo: string } {
  if (path.includes("manifest")) {
    return {
      whyKo: "Platform manifest를 capability 목록과 동기화합니다.",
      impactKo: "Publish·Preview가 최신 capability 구조를 인식합니다.",
    };
  }
  if (path.includes("schemas/")) {
    return {
      whyKo: `${summary}의 입출력 contract를 정의합니다.`,
      impactKo: "API 호출 검증과 adapter 생성이 가능해집니다.",
    };
  }
  if (path.includes("capabilities/")) {
    return {
      whyKo: `${summary} capability 구현 파일을 추가/수정합니다.`,
      impactKo: "Sandbox invoke와 workflow 실행에 반영됩니다.",
    };
  }
  if (path.includes("adapter/")) {
    return {
      whyKo: "외부 API 연동 adapter를 맞춥니다.",
      impactKo: "Payment·booking 흐름이 end-to-end로 동작합니다.",
    };
  }
  return {
    whyKo: "Agent가 Platform 변경을 적용했습니다.",
    impactKo: "Changes 탭에서 검토 후 accept할 수 있습니다.",
  };
}

/** Generate L1 explanations for project changes. */
export function explainChanges(changes: readonly DevProjectChange[]): readonly ChangeExplanation[] {
  return changes.map((ch) => {
    const { whyKo, impactKo } = explainPath(ch.path, ch.summary);
    const verb = ch.kind === "add" ? "추가" : "수정";
    return {
      changeId: ch.id,
      path: ch.path,
      summaryKo: `${ch.path.split("/").pop()} ${verb} (+${ch.additions})`,
      whyKo,
      impactKo,
    };
  });
}

/** One-line rollup for event bridge / activity panel. */
export function summarizeChangeExplanation(explanations: readonly ChangeExplanation[]): string {
  if (explanations.length === 0) return "변경 없음";
  if (explanations.length === 1) return explanations[0]!.summaryKo;
  return `${explanations.length}개 파일 변경 · ${explanations[0]!.summaryKo} 외 ${explanations.length - 1}건`;
}
