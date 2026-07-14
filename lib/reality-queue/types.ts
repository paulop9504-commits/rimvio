/**
 * Reality Queue — Pending Reality before L5 Commit.
 * Field tab (맞춤) = Reality Control Center surface.
 * @see docs/RIMVIO_CONSTITUTION.md Article 0
 */

export type RealityQueueItemStatus = "ready" | "needs_review" | "running" | "blocked";

export type RealityQueueItemKind =
  | "execution_step"
  | "trade"
  | "lodging"
  | "flight"
  | "transit"
  | "finance"
  | "calendar"
  | "other";

export type RealityQueueItemV1 = {
  readonly itemId: string;
  readonly kind: RealityQueueItemKind;
  readonly labelKo: string;
  readonly status: RealityQueueItemStatus;
  readonly contextEventId: string | null;
  readonly detailKo?: string | null;
  readonly amountLabel?: string | null;
  /** Trade handshake or plan step id for deep link. */
  readonly sourceRef?: string | null;
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

export type RealityControlSnapshotV1 = {
  readonly version: 1;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly agents: readonly RealityAgentChipV1[];
  readonly items: readonly RealityQueueItemV1[];
  readonly impact: RealityImpactSummaryV1;
  /** True when ≥1 ready item and zero needs_review/running blockers for gate. */
  readonly canCommit: boolean;
  readonly primaryContextEventId: string | null;
};
