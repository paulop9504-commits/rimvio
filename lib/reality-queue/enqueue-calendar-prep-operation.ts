/**
 * Calendar prep — Field queue only (never Reality Commit).
 */

import { syncRealityPipelineAfterOperationChange } from "@/lib/reality-pipeline";
import { upsertPreparedRealityOperation } from "@/lib/reality-queue/prepared-operations-store";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type CalendarPrepEnqueueInput = {
  readonly contextEventId: string;
  readonly contextLabelKo?: string | null;
  readonly placeLabelKo: string;
  readonly placeId?: string | null;
};

export function enqueueCalendarPrepOperation(
  input: CalendarPrepEnqueueInput,
): RealityOperationV1 {
  const operationId = `op:calendar:${input.contextEventId}:${Date.now().toString(36)}`;
  const label = input.placeLabelKo.trim() || "일정";
  const op: RealityOperationV1 = {
    operationId,
    type: "itinerary",
    domain: "travel",
    status: "pending",
    contextEventId: input.contextEventId.trim(),
    contextLabelKo: input.contextLabelKo?.trim() || null,
    labelKo: `${label} 일정 넣기`,
    createdBy: "ai_assistant",
    preview: {
      titleKo: "캘린더 준비",
      summaryKo: `${label}을 일정에 넣을 준비를 했어요`,
      diffFromKo: "일정 없음",
      diffToKo: `${label} 일정 준비`,
      placeLabelKo: label,
      confidencePct: 75,
    },
    needApproval: true,
    dependsOnItemIds: [],
    dependencyNoteKo: "결재함에서 확인하면 캘린더에 반영돼요",
    undoAllowed: true,
    expiresAtIso: new Date(Date.now() + 60 * 60_000).toISOString(),
    sourceRef: input.placeId?.trim() || null,
    engineId: "calendar_prep",
    kind: "calendar",
    detailKo: "소프트 일정 · 아직 캘린더에 쓰지 않음",
  };
  upsertPreparedRealityOperation(op);
  syncRealityPipelineAfterOperationChange({
    contextEventId: input.contextEventId.trim(),
    utterance: `${label} 일정 넣기`,
    contextLabelKo: input.contextLabelKo,
    destinationLabelKo: label,
  });
  return op;
}
