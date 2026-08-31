/**
 * Standard Loop node catalog — users pick these; they do not invent runtime code.
 */

import type { LoopNode, LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

export type LoopPaletteItem = {
  readonly kind: LoopNodeKind;
  readonly group: "core" | "capability" | "data" | "custom";
  readonly label: string;
  readonly hintKo: string;
};

export const LOOP_PALETTE: readonly LoopPaletteItem[] = [
  { kind: "TRIGGER", group: "core", label: "Trigger", hintKo: "언제 시작할지" },
  { kind: "UNDERSTAND", group: "core", label: "Understand", hintKo: "요청을 구조화" },
  { kind: "INSPECT", group: "core", label: "Inspect", hintKo: "현재 상태 확인" },
  { kind: "DECIDE", group: "core", label: "Decide", hintKo: "다음 행동 선택" },
  { kind: "ACT", group: "core", label: "Execute", hintKo: "실제 작업" },
  { kind: "OBSERVE", group: "core", label: "Observe", hintKo: "결과 관찰" },
  { kind: "VERIFY", group: "core", label: "Verify", hintKo: "검증" },
  { kind: "CONDITION", group: "core", label: "Condition", hintKo: "분기" },
  { kind: "REPLAN", group: "core", label: "Replan", hintKo: "계획 수정" },
  { kind: "RETRY", group: "core", label: "Retry", hintKo: "재시도" },
  { kind: "WAIT", group: "core", label: "Wait", hintKo: "대기" },
  { kind: "ASK_USER", group: "core", label: "Ask User", hintKo: "사용자에게 묻기" },
  { kind: "APPROVAL", group: "core", label: "Approval", hintKo: "승인 필요" },
  { kind: "COMPLETE", group: "core", label: "Complete", hintKo: "완료" },
  { kind: "FAIL", group: "core", label: "Fail", hintKo: "실패 종료" },
  { kind: "CAPABILITY", group: "capability", label: "Capability", hintKo: "Capability 끼워 넣기" },
  { kind: "TOOL", group: "capability", label: "Tool", hintKo: "기존 Tool Gateway" },
  { kind: "API", group: "capability", label: "API", hintKo: "API 호출" },
  { kind: "DATABASE", group: "capability", label: "Database", hintKo: "데이터" },
  { kind: "BROWSER", group: "capability", label: "Browser", hintKo: "화면 검증" },
  { kind: "WORKFLOW", group: "capability", label: "Workflow", hintKo: "워크플로" },
  { kind: "INPUT", group: "data", label: "Input", hintKo: "입력" },
  { kind: "OUTPUT", group: "data", label: "Output", hintKo: "출력" },
  { kind: "VARIABLE", group: "data", label: "Variable", hintKo: "변수" },
  { kind: "CONTEXT", group: "data", label: "Context", hintKo: "대화 맥락" },
  { kind: "STATE", group: "data", label: "State", hintKo: "현재 상태" },
  { kind: "CUSTOM", group: "custom", label: "Custom Code", hintKo: "직접 코드 작성" },
];

export const EXECUTING_KINDS: readonly LoopNodeKind[] = [
  "ACT",
  "CAPABILITY",
  "TOOL",
  "API",
  "DATABASE",
  "BROWSER",
  "WORKFLOW",
  "CUSTOM",
];

export function isLoopExecutingNode(node: LoopNode): boolean {
  if (EXECUTING_KINDS.includes(node.kind)) {
    if (node.kind === "CUSTOM") return Boolean(node.config.customCode?.trim());
    return true;
  }
  return Boolean(node.config.capabilityId || node.config.toolId);
}

export function defaultLabelForKind(kind: LoopNodeKind): string {
  return LOOP_PALETTE.find((p) => p.kind === kind)?.label ?? kind;
}

export function createLoopNode(
  kind: LoopNodeKind,
  id: string,
  label?: string,
  config: LoopNode["config"] = {},
): LoopNode {
  return {
    id,
    kind,
    label: label ?? defaultLabelForKind(kind),
    config: {
      onSuccess: kind === "VERIFY" ? "continue" : undefined,
      onFailure: kind === "VERIFY" ? "replan" : undefined,
      maxAttempts: kind === "RETRY" ? 2 : undefined,
      ...config,
    },
  };
}
