/**
 * Repair strategies — mutate invoke input before retry (Cursor-style self-heal).
 */

export type RepairPlan = {
  readonly capabilityId: string;
  readonly input: Record<string, unknown>;
  readonly strategyKo: string;
};

export function planCapabilityRepair(input: {
  readonly capabilityId: string;
  readonly currentInput: Readonly<Record<string, unknown>>;
  readonly errors: readonly string[];
  readonly attempt: number;
}): RepairPlan | null {
  const { capabilityId, currentInput, errors, attempt } = input;
  const next = { ...currentInput };

  if (capabilityId === "hotel.search") {
    if (errors.includes("hotelsFound_is_zero") || errors.includes("location")) {
      return {
        capabilityId,
        input: {
          ...next,
          location: "난바, 오사카",
          guests: next.guests ?? "2",
          _repair: { attempt, strategy: "widen_location" },
        },
        strategyKo: "검색 지역을 넓혀 재시도",
      };
    }
  }

  if (capabilityId === "product.search") {
    if (errors.includes("products_empty")) {
      return {
        capabilityId,
        input: {
          ...next,
          query: "laptop",
          limit: Math.min(10, (typeof next.limit === "number" ? next.limit : 5) + 3),
          _repair: { attempt, strategy: "broaden_query" },
        },
        strategyKo: "검색어를 넓혀 재시도",
      };
    }
  }

  if (capabilityId.startsWith("workspace.") && errors.includes("workspace_patch_no_effect")) {
    return {
      capabilityId: "workspace.entity.create",
      input: {
        workspaceId: next.workspaceId,
        domain: "poi",
        query: next.utterance ?? "fallback entity",
        _repair: { attempt, strategy: "fallback_create" },
      },
      strategyKo: "Workspace 엔티티 생성으로 복구",
    };
  }

  if (capabilityId.startsWith("graph.") && errors.includes("graph_mutation_missing")) {
    return {
      capabilityId,
      input: {
        ...next,
        fromId: next.fromId ?? "anchor-a",
        toId: next.toId ?? "anchor-b",
        relation: "near",
        _repair: { attempt, strategy: "default_nodes" },
      },
      strategyKo: "기본 노드로 그래프 연결 재시도",
    };
  }

  if (capabilityId.startsWith("api.http") && errors.some((e) => e.startsWith("http_"))) {
    return null;
  }

  return null;
}
