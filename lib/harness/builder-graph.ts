/**
 * Harness ↔ React Flow graph sync (Builder Phase 2).
 */

import type { Edge, Node } from "@xyflow/react";
import type { Harness, HarnessNode, HarnessNodeType } from "@/lib/rimvio-protocol/harness/schema";

export type HarnessFlowNodeData = {
  harnessNode: HarnessNode;
  selected?: boolean;
};

const TYPE_COLORS: Record<HarnessNodeType, string> = {
  TRIGGER: "#22C55E",
  RESEARCH: "#3B82F6",
  EXTRACT: "#8B5CF6",
  ACTION: "#A78BFA",
  CONDITION: "#F59E0B",
  REPORT: "#14B8A6",
  VERIFY: "#EC4899",
};

export function harnessNodeAccent(type: HarnessNodeType): string {
  return TYPE_COLORS[type] ?? "#64748B";
}

export function defaultHarnessNodePosition(index: number): { x: number; y: number } {
  return { x: 120, y: 40 + index * 120 };
}

export function harnessToFlowNodes(harness: Harness): Node<HarnessFlowNodeData>[] {
  return harness.nodes.map((node, index) => ({
    id: node.id,
    type: "harnessNode",
    position: node.position ?? defaultHarnessNodePosition(index),
    data: { harnessNode: node },
    draggable: true,
    selectable: true,
  }));
}

export function harnessToFlowEdges(harness: Harness): Edge[] {
  const edges: Edge[] = [];
  for (const node of harness.nodes) {
    for (const nextId of node.next ?? []) {
      edges.push({
        id: `${node.id}->${nextId}`,
        source: node.id,
        target: nextId,
        animated: false,
        style: { stroke: "#CBD5E1" },
      });
    }
  }
  return edges;
}

export function applyFlowPositionsToHarness(
  harness: Harness,
  nodes: readonly Node<HarnessFlowNodeData>[],
): Harness {
  const posById = new Map(nodes.map((n) => [n.id, n.position]));
  return {
    ...harness,
    nodes: harness.nodes.map((n) => {
      const pos = posById.get(n.id);
      return pos ? { ...n, position: { x: pos.x, y: pos.y } } : n;
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function applyFlowEdgesToHarness(
  harness: Harness,
  edges: readonly Edge[],
): Harness {
  const nextMap = new Map<string, string[]>();
  for (const e of edges) {
    const list = nextMap.get(e.source) ?? [];
    list.push(e.target);
    nextMap.set(e.source, list);
  }
  return {
    ...harness,
    nodes: harness.nodes.map((n) => ({
      ...n,
      next: nextMap.get(n.id) ?? [],
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function addHarnessBuilderNode(
  harness: Harness,
  type: HarnessNodeType,
  name?: string,
): Harness {
  const id = `n_${type.toLowerCase()}_${harness.nodes.length + 1}`;
  const node: HarnessNode = {
    id,
    type,
    name: name ?? type,
    description: "",
    position: defaultHarnessNodePosition(harness.nodes.length),
    actions: [],
    permissions: [],
    constraints: [],
    verification: [],
    next: [],
  };
  const nodes = [...harness.nodes];
  if (nodes.length > 0) {
    const last = nodes[nodes.length - 1];
    if (last) {
      nodes[nodes.length - 1] = {
        ...last,
        next: [...(last.next ?? []), id],
      };
    }
  }
  return {
    ...harness,
    nodes: [...nodes, node],
    updatedAt: new Date().toISOString(),
  };
}

export function updateHarnessNodeFields(
  harness: Harness,
  nodeId: string,
  patch: Partial<Pick<HarnessNode, "name" | "description">>,
): Harness {
  return {
    ...harness,
    nodes: harness.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    updatedAt: new Date().toISOString(),
  };
}

export function removeHarnessBuilderNode(harness: Harness, nodeId: string): Harness {
  return {
    ...harness,
    nodes: harness.nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        next: (n.next ?? []).filter((id) => id !== nodeId),
      })),
    updatedAt: new Date().toISOString(),
  };
}

/** Rule-based Builder assistant — structured patches only (no fake chat essays). */
export function applyBuilderAssistantCommand(
  harness: Harness,
  command: string,
): { harness: Harness; message: string } {
  const text = command.trim();
  const lower = text.toLowerCase();

  if (/검증|verify/.test(lower) && /추가|add/.test(lower)) {
    const next = addHarnessBuilderNode(harness, "VERIFY", "결과 검증");
    return { harness: next, message: "VERIFY 노드를 추가했습니다." };
  }
  if (/검색|research/.test(lower) && /추가|add/.test(lower)) {
    const next = addHarnessBuilderNode(harness, "RESEARCH", "검색");
    return { harness: next, message: "RESEARCH 노드를 추가했습니다." };
  }
  if (/추출|extract/.test(lower) && /추가|add/.test(lower)) {
    const next = addHarnessBuilderNode(harness, "EXTRACT", "추출");
    return { harness: next, message: "EXTRACT 노드를 추가했습니다." };
  }
  if (/리포트|report/.test(lower) && /추가|add/.test(lower)) {
    const next = addHarnessBuilderNode(harness, "REPORT", "리포트");
    return { harness: next, message: "REPORT 노드를 추가했습니다." };
  }
  const price = text.match(/(\d+)\s*만/);
  if (/가격|budget|price/.test(lower) && price) {
    const won = Number(price[1]) * 10_000;
    const next: Harness = {
      ...harness,
      constraints: [
        ...harness.constraints.filter((c) => c.field !== "price"),
        { field: "price", operator: "lte", value: won, action: "block" },
      ],
      updatedAt: new Date().toISOString(),
    };
    return { harness: next, message: `가격 제약 price <= ${won.toLocaleString("ko-KR")} 을 설정했습니다.` };
  }
  if (/승인|approval|결제|financial/.test(lower)) {
    const next: Harness = {
      ...harness,
      permissions: [
        ...harness.permissions.filter((p) => p.type !== "FINANCIAL"),
        {
          type: "FINANCIAL",
          scope: "checkout",
          approvalRequired: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    return { harness: next, message: "FINANCIAL 권한(승인 필요)을 추가했습니다." };
  }

  return {
    harness,
    message:
      "이해한 명령: 노드 추가(검색/추출/검증/리포트), 가격 N만, 결제 승인. 예: 「검증 단계 추가해줘」",
  };
}

export const HARNESS_BUILDER_STEPS = [
  { id: 1, title: "목적 정의", description: "이름 · 목표" },
  { id: 2, title: "전문 지식", description: "설명 · 도메인" },
  { id: 3, title: "Capability 구성", description: "노드 그래프" },
  { id: 4, title: "권한 · 제약", description: "Permission / Constraint" },
  { id: 5, title: "검증 기준", description: "Verification" },
  { id: 6, title: "테스트", description: "스키마 검증" },
  { id: 7, title: "배포 준비", description: "status → testing" },
] as const;
