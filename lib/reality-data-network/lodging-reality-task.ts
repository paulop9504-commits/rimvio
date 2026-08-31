/**
 * Lodging pilot — photo_authenticity task from verify-lodging-candidate (R5).
 */

import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  verifyLodgingCandidate,
  type LodgingVerificationFailReason,
} from "@/lib/globe/lodging/verify-lodging-candidate";
import { createRealityTask, readRealityTasks } from "@/lib/reality-data-network/task-pool";
import type { RealityTask } from "@/lib/reality-data-network/types";
import { buildSuggestedRealityPatch, patchToAiPreLabel } from "@/lib/reality-data-network/ai-pre-label";

export type LodgingRealityTaskSpawnResult = {
  readonly spawned: boolean;
  readonly task: RealityTask | null;
  readonly reason: LodgingVerificationFailReason | "already_pending" | "not_needed" | null;
};

function lodgingTargetRef(row: ContextLodgingInventoryRow): string {
  return `lodging:${row.liteapiHotelId ?? row.placeId}`;
}

function hasPendingPhotoTask(targetRef: string): boolean {
  return readRealityTasks().some(
    (t) =>
      t.targetRef === targetRef &&
      t.taskType === "photo_authenticity" &&
      (t.status === "open" || t.status === "in_review"),
  );
}

/** Spawn photo_authenticity when lodging verification fails on photo confidence. */
export function spawnLodgingPhotoAuthenticityTask(input: {
  readonly row: ContextLodgingInventoryRow;
  readonly contextEventId?: string | null;
  readonly supplierId?: string;
  readonly supplierLabel?: string;
}): LodgingRealityTaskSpawnResult {
  const verification = verifyLodgingCandidate({ row: input.row, mode: "strict" });

  if (verification.ok) {
    return { spawned: false, task: null, reason: "not_needed" };
  }

  const photoFail = verification.failReasons.includes("photo_confidence");
  const imageFail = verification.failReasons.includes("images");
  if (!photoFail && !imageFail) {
    return { spawned: false, task: null, reason: "not_needed" };
  }

  const targetRef = lodgingTargetRef(input.row);
  if (hasPendingPhotoTask(targetRef)) {
    return { spawned: false, task: null, reason: "already_pending" };
  }

  const preLabel = buildSuggestedRealityPatch({
    domain: "lodging",
    titleKo: input.row.name ?? "숙소",
    targetLabelKo: input.row.name ?? "숙소",
    visionLabels: input.row.images.length > 0 ? ["hotel room", "lodging"] : [],
  });

  const task = createRealityTask({
    taskType: "photo_authenticity",
    titleKo: "객실 사진 진위",
    targetLabelKo: input.row.name ?? "숙소",
    domain: "lodging",
    supplierId: input.supplierId ?? "rimvio-agent-spawn",
    supplierLabel: input.supplierLabel ?? "Agent Spawn",
    preLabel: {
      domain: "lodging",
      targetLabelKo: input.row.name ?? undefined,
      visionLabels: ["hotel room"],
    },
    aiPreLabel: {
      ...patchToAiPreLabel(preLabel),
      photoConfidence: input.row.photoConfidence ?? "unknown",
      imageCount: input.row.images.length,
      verificationScore: verification.score100,
    },
    targetRef,
    contextEventId: input.contextEventId ?? null,
    spawnReason: photoFail ? "photo_confidence" : "images",
    mediaUrl: input.row.images[0] ?? null,
  });

  return {
    spawned: true,
    task,
    reason: photoFail ? "photo_confidence" : "images",
  };
}

/** Batch spawn for hotel.lookup candidates with weak photo confidence. */
export function spawnLodgingPhotoTasksForCandidates(input: {
  readonly rows: readonly ContextLodgingInventoryRow[];
  readonly contextEventId?: string | null;
  readonly maxSpawn?: number;
}): readonly LodgingRealityTaskSpawnResult[] {
  const max = input.maxSpawn ?? 3;
  const results: LodgingRealityTaskSpawnResult[] = [];

  for (const row of input.rows) {
    if (results.filter((r) => r.spawned).length >= max) break;

    const weakPhoto =
      row.photoConfidence === "nearby_identity" ||
      row.photoConfidence === "mock" ||
      row.images.length < 2;

    if (!weakPhoto) continue;

    results.push(
      spawnLodgingPhotoAuthenticityTask({
        row,
        contextEventId: input.contextEventId,
      }),
    );
  }

  return results;
}
