/**
 * Draft Edge — schedule add stays pre-Commit.
 * "여기 일정에 넣어" → Draft Edge · committed:false
 */

import type { SpatialDraftEdge } from "@/lib/spatial-retrieval/types";

export function createScheduleDraftEdge(input: {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly titleKo?: string | null;
  readonly nowIso?: string;
}): SpatialDraftEdge {
  const stamp = input.nowIso ?? new Date().toISOString();
  return {
    id: `draft_schedule_${input.toEntityId}_${stamp}`,
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    kind: "schedule_add",
    status: "draft",
    committed: false,
    labelKo: input.titleKo?.trim()
      ? `${input.titleKo.trim()} 일정 초안`
      : "일정 추가 초안",
    createdAtIso: stamp,
  };
}

export function isPreCommitDraft(edge: SpatialDraftEdge): boolean {
  return edge.status === "draft" && edge.committed === false;
}
