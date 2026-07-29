/**
 * Node projection models — Host flesh for Progressive Morphology (ADR-034).
 * Pure data; UI components only render these rows.
 */

import type { ContextRealityBundle } from "@/lib/reality-os/context-reality-store";
import {
  usedGoodsFocusSequence,
  workspaceKindTemplate,
} from "@/lib/workspace-kind/templates";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";

export type NodePipelineStageState = "done" | "current" | "waiting";

export type NodePipelineStage = {
  readonly slotId: string;
  readonly labelKo: string;
  readonly state: NodePipelineStageState;
};

export type NodeSpatialTeaser = {
  readonly headlineKo: string;
  readonly bodyKo: string;
  readonly pinHintKo: string;
};

export type NodeDashboardTeaser = {
  readonly headlineKo: string;
  readonly metrics: readonly {
    readonly labelKo: string;
    readonly valueKo: string;
  }[];
};

export type WorkspaceNodeProjectionModel =
  | {
      readonly surface: "pipeline";
      readonly stages: readonly NodePipelineStage[];
    }
  | {
      readonly surface: "map";
      readonly spatial: NodeSpatialTeaser;
    }
  | {
      readonly surface: "dashboard";
      readonly dashboard: NodeDashboardTeaser;
    }
  | {
      readonly surface:
        | "cards"
        | "list"
        | "thread"
        | "shell"
        | "grid"
        | "timeline"
        | "canvas"
        | "graph"
        | "calendar"
        | "ledger";
      readonly useCandidateCards: true;
    };

function slotLabelForKind(
  kind: WorkspaceSdkFrame["kind"],
  slotId: string,
): string {
  return (
    workspaceKindTemplate(kind).slots.find((s) => s.id === slotId)?.labelKo ??
    slotId
  );
}

function resolveUsedGoodsRole(frame: WorkspaceSdkFrame): "sell" | "buy" {
  const focus = frame.primaryFocus.slotId;
  if (
    focus === "conditions" ||
    focus === "sellers" ||
    /구매/.test(frame.header.titleKo)
  ) {
    return "buy";
  }
  return "sell";
}

function resolveFocusSequence(frame: WorkspaceSdkFrame): readonly string[] {
  if (frame.kind === "used_goods") {
    return usedGoodsFocusSequence(resolveUsedGoodsRole(frame));
  }
  return workspaceKindTemplate(frame.kind).focusSequence;
}

/**
 * Build Host Node model from frame + optional Reality bundle.
 */
export function buildWorkspaceNodeProjectionModel(input: {
  readonly frame: WorkspaceSdkFrame;
  readonly bundle: ContextRealityBundle | null;
}): WorkspaceNodeProjectionModel {
  const { frame } = input;
  const surface = frame.node.surface;

  if (surface === "pipeline") {
    const sequence = resolveFocusSequence(frame);
    const focus = frame.primaryFocus.slotId;
    const focusIndex = sequence.indexOf(focus);
    const stages: NodePipelineStage[] = sequence.map((slotId, index) => {
      let state: NodePipelineStageState = "waiting";
      if (slotId === focus) {
        state = "current";
      } else if (focusIndex >= 0 && index < focusIndex) {
        state = "done";
      }
      return {
        slotId,
        labelKo: slotLabelForKind(frame.kind, slotId),
        state,
      };
    });
    return { surface: "pipeline", stages };
  }

  if (surface === "map") {
    return {
      surface: "map",
      spatial: {
        headlineKo: "공간 Reality",
        bodyKo:
          frame.ai.stripHintKo?.trim() ||
          "지도에 핀이 쌓이면 여기서 바로 이어가요",
        pinHintKo: frame.header.titleKo || "맥락",
      },
    };
  }

  if (surface === "dashboard") {
    const nextBit =
      frame.progressiveHintKo?.split("·")[1]?.trim() || "준비 중";
    return {
      surface: "dashboard",
      dashboard: {
        headlineKo: "현황",
        metrics: [
          {
            labelKo: frame.primaryFocus.labelKo,
            valueKo: "맞추는 중",
          },
          {
            labelKo: "다음",
            valueKo: nextBit,
          },
        ],
      },
    };
  }

  return {
    surface: "cards",
    useCandidateCards: true,
  };
}
