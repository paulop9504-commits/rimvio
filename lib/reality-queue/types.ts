/**
 * Reality Queue — Pending Reality before L5 Commit.
 * Field tab = Reality Control Center.
 * Items are Operations (Commit Objects), not chat answers.
 * @see docs/RIMVIO_CONSTITUTION.md Article 0
 */

export type RealityQueueItemStatus =
  | "ready"
  | "needs_review"
  | "running"
  | "blocked"
  | "pending";

export type RealityQueueItemKind =
  | "execution_step"
  | "trade"
  | "lodging"
  | "flight"
  | "eatery"
  | "itinerary"
  | "transit"
  | "finance"
  | "calendar"
  | "other";

/** Domain folder in Reality Queue (다운로드 폴더 비유). */
export type RealityOperationDomain =
  | "travel"
  | "shopping"
  | "finance"
  | "work"
  | "other";

/** Operation / Commit Object type — Cursor Diff analog. */
export type RealityOperationType =
  | "reservation"
  | "booking_prep"
  | "itinerary"
  | "search_list"
  | "payment_prep"
  | "trade"
  | "message_draft"
  | "other";

export type RealityOperationPreviewV1 = {
  readonly titleKo: string;
  readonly summaryKo: string;
  /** Diff-style before → after. */
  readonly diffFromKo?: string | null;
  readonly diffToKo?: string | null;
  readonly providerLabelKo?: string | null;
  readonly placeLabelKo?: string | null;
  readonly amountLabel?: string | null;
  readonly cancelPolicyKo?: string | null;
  readonly confidencePct?: number | null;
  readonly resourceId?: string | null;
};

/**
 * Operation = work card in Reality Queue (not a dump file).
 * AI prepares → Pending → human Reflect / Edit / Delete / Commit.
 */
export type RealityOperationV1 = {
  readonly operationId: string;
  readonly type: RealityOperationType;
  readonly domain: RealityOperationDomain;
  readonly status: RealityQueueItemStatus;
  readonly contextEventId: string | null;
  readonly contextLabelKo: string | null;
  readonly labelKo: string;
  readonly createdBy: "ai_assistant" | "human" | "system";
  readonly preview: RealityOperationPreviewV1;
  readonly needApproval: boolean;
  readonly dependsOnItemIds: readonly string[];
  readonly dependencyNoteKo: string | null;
  readonly undoAllowed: boolean;
  /** ISO — price hold / offer expiry. */
  readonly expiresAtIso: string | null;
  readonly sourceRef?: string | null;
  readonly engineId?: string | null;
  /** Legacy kind for chips / filters. */
  readonly kind: RealityQueueItemKind;
  readonly amountLabel?: string | null;
  readonly detailKo?: string | null;
};

/** @deprecated alias — prefer RealityOperationV1 */
export type RealityQueueItemV1 = RealityOperationV1 & {
  readonly itemId: string;
};

export type RealityAgentChipStatus = "ready" | "running" | "needs_review" | "idle";

export type RealityAgentChipV1 = {
  readonly agentId: string;
  readonly labelKo: string;
  readonly status: RealityAgentChipStatus;
};

export type RealityImpactSummaryV1 = {
  readonly timeSavedLabel: string | null;
  readonly costLabel: string | null;
  readonly risk: "low" | "medium" | "high";
  readonly pendingCount: number;
};

export type RealityOperationFolderV1 = {
  /** Stable key — contextEventId or synthetic (no collision when multiple travel contexts). */
  readonly folderId: string;
  readonly domain: RealityOperationDomain;
  /** Context folder title — e.g. 「다음 주 여행」. */
  readonly labelKo: string;
  /** Domain eyebrow — TRAVEL / SHOPPING. */
  readonly domainLabelKo: string;
  readonly contextEventId: string | null;
  readonly items: readonly RealityQueueItemV1[];
};

export type RealityControlSnapshotV1 = {
  readonly version: 1;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly agents: readonly RealityAgentChipV1[];
  readonly items: readonly RealityQueueItemV1[];
  /** Grouped Pending Reality folders. */
  readonly folders: readonly RealityOperationFolderV1[];
  readonly impact: RealityImpactSummaryV1;
  /** True when ≥1 ready item and zero needs_review/running blockers for gate. */
  readonly canCommit: boolean;
  readonly primaryContextEventId: string | null;
};

export function asQueueItem(operation: RealityOperationV1): RealityQueueItemV1 {
  return {
    ...operation,
    itemId: operation.operationId,
  };
}
