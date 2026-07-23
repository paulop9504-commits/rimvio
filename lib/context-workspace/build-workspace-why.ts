/**
 * WHY Layer — Action · Reason · Impact for the last Workspace change.
 */

import {
  domainLabelKo,
  type ContextWorkspaceState,
  type ContextWorkspaceTransitionOp,
  type WorkspaceWhyEntry,
} from "@/lib/context-workspace/types";

export function buildWorkspaceWhy(input: {
  op: ContextWorkspaceTransitionOp;
  prev: ContextWorkspaceState;
  nextVisibleCount: number;
  addedCount?: number;
  removedCount?: number;
  nodeIds?: readonly string[];
  simulateScenarioKo?: string | null;
  changeKo?: string | null;
}): WorkspaceWhyEntry {
  const domain = domainLabelKo(input.prev.domain);
  const nodeIds = [...(input.nodeIds ?? [])];
  const atIso = new Date().toISOString();

  switch (input.op) {
    case "add_nodes":
    case "find_similar":
      return {
        actionKo: `${domain} ${(input.addedCount ?? 0) || "후보"} 생성`,
        reasonsKo: [
          input.op === "find_similar"
            ? "선택 노드와 유사도 높음"
            : "검색 의도와 장소 조건 일치",
          "예산·평점 후보군에 포함",
        ],
        impactsKo: [
          `보이는 곳 ${input.nextVisibleCount}곳`,
          "선택지 다양성 증가",
        ],
        nodeIds,
        atIso,
      };
    case "filter":
      return {
        actionKo: "필터 적용",
        reasonsKo: [
          input.changeKo?.trim() || "말한 조건에 맞춤",
          "예산·평점·태그 교집합",
        ],
        impactsKo: [
          `${input.nextVisibleCount}곳만 남김`,
          "노이즈 후보 감소",
        ],
        nodeIds,
        atIso,
      };
    case "remove":
      return {
        actionKo: "노드 삭제",
        reasonsKo: ["사용자가 제외를 요청"],
        impactsKo: [
          `${input.removedCount ?? 1}곳 제거`,
          `남은 곳 ${input.nextVisibleCount}`,
        ],
        nodeIds,
        atIso,
      };
    case "compare":
      return {
        actionKo: "비교 묶음",
        reasonsKo: ["나란히 보고 고르기"],
        impactsKo: [`${nodeIds.length || input.prev.compareIds.length}곳 비교`],
        nodeIds,
        atIso,
      };
    case "simulate":
      return {
        actionKo: "가정 시뮬",
        reasonsKo: [
          input.simulateScenarioKo?.trim() || "가정 시나리오",
          "날씨·예산 조건 반영",
        ],
        impactsKo: [
          input.changeKo?.trim() || "우선순위 재정렬",
          `보이는 곳 ${input.nextVisibleCount}`,
        ],
        nodeIds,
        atIso,
      };
    case "optimize_route":
      return {
        actionKo: "동선 최적화",
        reasonsKo: ["가까운 순 방문", "이동 거리 최소화"],
        impactsKo: ["예상 이동 감소", "방문 순서 갱신"],
        nodeIds,
        atIso,
      };
    case "select":
      return {
        actionKo: "노드 선택",
        reasonsKo: ["자세히 보기 / 다음 편집 대상"],
        impactsKo: ["WHY · 예약 준비 가능"],
        nodeIds,
        atIso,
      };
    case "commit":
      return {
        actionKo: "Reality Commit 준비",
        reasonsKo: ["Draft → Globe 반영"],
        impactsKo: [`${input.nextVisibleCount}곳 Forest에 심기`],
        nodeIds,
        atIso,
      };
    default:
      return {
        actionKo: input.changeKo?.trim() || "Workspace 변경",
        reasonsKo: ["자연어 의도 반영"],
        impactsKo: [`보이는 곳 ${input.nextVisibleCount}`],
        nodeIds,
        atIso,
      };
  }
}
