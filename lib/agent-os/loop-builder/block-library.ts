/**
 * Flowchart block library — categorized palette for Loop Canvas.
 */

import type { LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

export type LoopBlockLibraryCategory = "control" | "action" | "data" | "human" | "custom";

export type LoopBlockLibraryItem = {
  readonly kind: LoopNodeKind;
  readonly category: LoopBlockLibraryCategory;
  readonly label: string;
  readonly hintKo: string;
};

export const LOOP_BLOCK_LIBRARY_CATEGORIES: readonly {
  readonly id: LoopBlockLibraryCategory;
  readonly label: string;
}[] = [
  { id: "control", label: "Control" },
  { id: "action", label: "Action" },
  { id: "data", label: "Data" },
  { id: "human", label: "Human" },
  { id: "custom", label: "Custom" },
];

export const LOOP_BLOCK_LIBRARY: readonly LoopBlockLibraryItem[] = [
  { kind: "TRIGGER", category: "control", label: "Trigger", hintKo: "Loop 시작" },
  { kind: "CONDITION", category: "control", label: "Condition", hintKo: "조건 분기" },
  { kind: "DECIDE", category: "control", label: "Branch", hintKo: "다음 경로 선택" },
  { kind: "RETRY", category: "control", label: "Loop / Retry", hintKo: "재시도 · 되돌아가기" },
  { kind: "WAIT", category: "control", label: "Wait", hintKo: "지연 후 계속" },
  { kind: "REPLAN", category: "control", label: "Parallel", hintKo: "병렬 재계획" },
  { kind: "CAPABILITY", category: "action", label: "Capability", hintKo: "Capability 실행" },
  { kind: "TOOL", category: "action", label: "Tool", hintKo: "Tool Gateway" },
  { kind: "API", category: "action", label: "API", hintKo: "HTTP API" },
  { kind: "DATABASE", category: "action", label: "Database", hintKo: "DB 읽기/쓰기" },
  { kind: "BROWSER", category: "action", label: "Browser", hintKo: "브라우저 검증" },
  { kind: "WORKFLOW", category: "action", label: "Workflow", hintKo: "하위 워크플로" },
  { kind: "ACT", category: "action", label: "Execute", hintKo: "일반 실행" },
  { kind: "INPUT", category: "data", label: "Input", hintKo: "입력 매핑" },
  { kind: "OUTPUT", category: "data", label: "Output", hintKo: "출력 변수" },
  { kind: "VARIABLE", category: "data", label: "Variable", hintKo: "변수 설정" },
  { kind: "CONTEXT", category: "data", label: "Context", hintKo: "맥락 읽기" },
  { kind: "STATE", category: "data", label: "State", hintKo: "상태 스냅샷" },
  { kind: "ASK_USER", category: "human", label: "Ask User", hintKo: "사용자 확인" },
  { kind: "APPROVAL", category: "human", label: "Approval", hintKo: "승인 대기" },
  { kind: "COMPLETE", category: "human", label: "Complete", hintKo: "성공 종료" },
  { kind: "FAIL", category: "human", label: "Fail", hintKo: "실패 종료" },
  { kind: "CUSTOM", category: "custom", label: "Code", hintKo: "커스텀 코드 블록" },
  { kind: "UNDERSTAND", category: "control", label: "Understand", hintKo: "요청 구조화" },
  { kind: "VERIFY", category: "control", label: "Verify", hintKo: "결과 검증" },
  { kind: "OBSERVE", category: "control", label: "Observe", hintKo: "결과 관찰" },
  { kind: "INSPECT", category: "control", label: "Inspect", hintKo: "상태 확인" },
];

export function listBlocksByCategory(category: LoopBlockLibraryCategory): readonly LoopBlockLibraryItem[] {
  return LOOP_BLOCK_LIBRARY.filter((b) => b.category === category);
}
