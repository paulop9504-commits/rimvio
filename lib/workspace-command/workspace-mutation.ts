/**
 * WorkspaceIntent → WorkspaceMutation → Draft State only.
 * Delegates to applyWorkspaceTransition — never Globe / Global / source.
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { setWorkspaceNodeActionReadyState } from "@/lib/context-workspace/set-node-action-ready-state";
import type {
  WorkspaceIntent,
  WorkspaceMutation,
} from "@/lib/workspace-command/types";
import { assertWorkspaceMutationAllowed } from "@/lib/workspace-command/workspace-store";

function buildMutation(
  workspaceId: string,
  intent: WorkspaceIntent,
  targetObjectId?: string | null,
): WorkspaceMutation {
  return {
    workspaceId,
    targetObjectId: targetObjectId?.trim() || undefined,
    mutationType: intent.action,
    changes: {
      ...intent.parameters,
      target: intent.target,
    },
  };
}

export function buildWorkspaceMutation(input: {
  readonly workspaceId: string;
  readonly intent: WorkspaceIntent;
  readonly targetObjectId?: string | null;
}): WorkspaceMutation {
  assertWorkspaceMutationAllowed(input.intent.action);
  return buildMutation(
    input.workspaceId,
    input.intent,
    input.targetObjectId,
  );
}

/**
 * Apply mutation to Active Workspace Draft State only.
 * Returns updated state or null if no-op / rejected.
 */
export function applyWorkspaceMutation(input: {
  readonly workspaceId: string;
  readonly intent: WorkspaceIntent;
  readonly mutation: WorkspaceMutation;
  readonly targetObjectId?: string | null;
}): {
  readonly state: ContextWorkspaceState | null;
  readonly summaryKo: string;
} {
  assertWorkspaceMutationAllowed(input.intent.action);
  assertWorkspaceMutationAllowed(input.mutation.mutationType);

  const contextEventId = input.workspaceId.trim();
  const nodeIds = input.targetObjectId?.trim()
    ? [input.targetObjectId.trim()]
    : undefined;
  const params = input.intent.parameters;

  const action =
    input.intent.action === "modify_context"
      ? "filter"
      : input.intent.action === "optimize_context"
        ? "move"
        : input.intent.action === "analyze_context"
          ? "simulate"
          : input.intent.action === "create_draft"
            ? "prepare"
            : input.intent.action;

  switch (action) {
    case "filter": {
      if (params.historyOp === "undo") {
        const state = applyWorkspaceTransition({
          contextEventId,
          op: "undo",
        });
        return {
          state,
          summaryKo: state?.lastChangeKo ?? "되돌렸어요",
        };
      }
      if (params.historyOp === "redo") {
        const state = applyWorkspaceTransition({
          contextEventId,
          op: "redo",
        });
        return {
          state,
          summaryKo: state?.lastChangeKo ?? "다시 적용했어요",
        };
      }
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter:
          (params.filter as
            | import("@/lib/context-workspace/types").ContextWorkspaceFilter
            | null
            | undefined) ?? null,
        sortBy:
          (params.sortBy as
            | import("@/lib/graph-command/types").GraphFilterPredicate["sortBy"]
            | null
            | undefined) ?? null,
        changeKo: "Draft 필터를 바꿨어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "필터 적용",
      };
    }

    case "add_constraint": {
      if (typeof params.pin === "boolean") {
        const state = applyWorkspaceTransition({
          contextEventId,
          op: "bookmark",
          nodeIds,
          pin: params.pin,
          changeKo: params.pin ? "고정했어요" : "고정을 해제했어요",
        });
        return {
          state,
          summaryKo: state?.lastChangeKo ?? "제약 반영",
        };
      }
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: { tagIncludes: ["constrained"] },
        changeKo: "Draft 조건을 추가했어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "조건 추가",
      };
    }

    case "remove_constraint": {
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "filter",
        filter: {},
        changeKo: "Draft 조건을 해제했어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "조건 해제",
      };
    }

    case "replace": {
      if (params.remove) {
        const state = applyWorkspaceTransition({
          contextEventId,
          op: "remove",
          nodeIds,
          changeKo: "Draft에서 빼 두었어요",
        });
        return {
          state,
          summaryKo: state?.lastChangeKo ?? "제거",
        };
      }
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "find_similar",
        nodeIds,
        changeKo: "비슷한 후보로 Draft를 바꿨어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "교체",
      };
    }

    case "move": {
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "optimize_route",
        changeKo: "Draft 동선을 바꿨어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "동선 변경",
      };
    }

    case "compare": {
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "compare",
        nodeIds,
        changeKo: "Draft 비교에 넣었어요",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "비교",
      };
    }

    case "simulate": {
      const scenario =
        typeof params.simulateScenarioKo === "string"
          ? params.simulateScenarioKo
          : "what-if";
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "simulate",
        simulateScenarioKo: scenario,
        changeKo: "What-if · Draft only",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "시뮬레이션",
      };
    }

    case "prepare": {
      // Prepared State on Draft node — never Reality Commit / Globe stamp
      const oid = nodeIds?.[0];
      if (oid) {
        const next = setWorkspaceNodeActionReadyState({
          contextEventId,
          nodeId: oid,
          state: "prepare",
        });
        return {
          state: next,
          summaryKo: "예약 준비 · Draft (Commit 아님)",
        };
      }
      const state = applyWorkspaceTransition({
        contextEventId,
        op: "bookmark",
        pin: true,
        changeKo: "준비 대상으로 표시 · Draft",
      });
      return {
        state,
        summaryKo: state?.lastChangeKo ?? "준비",
      };
    }

    default: {
      return {
        state: null,
        summaryKo: `알 수 없는 의도: ${String(action)}`,
      };
    }
  }
}
