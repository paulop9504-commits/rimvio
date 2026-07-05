/** Bridge planning truth — committed co-planning on EventCandidate (NOT Blueprint). */

export const BRIDGE_PLANNING_TRUTH_META_KEY = "bridgePlanningTruthV1" as const;
export const BRIDGE_PLANNING_HISTORY_META_KEY = "bridgePlanningHistoryV1" as const;
export const BRIDGE_PLANNING_PROPOSAL_META_KEY = "bridgePlanningProposalV1" as const;
export const BRIDGE_PLANNING_PROPOSAL_QUEUE_META_KEY =
  "bridgePlanningProposalQueueV1" as const;

export type BridgePlanningDestinationResolution = "hypothesis" | "confirmed";

export type BridgePlanningTruthV1 = {
  readonly version: 1;
  readonly revision: number;
  readonly updatedByUserId: string;
  readonly updatedAtIso: string;
  readonly goalKo?: string | null;
  readonly destination: {
    readonly label: string;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly resolution: BridgePlanningDestinationResolution;
  };
  readonly pathLabels: readonly string[];
  readonly pinnedLegIndex: number;
  readonly flowStrokeStyle?: "solid" | "dashed";
};

export type BridgePlanningProposalV1 = {
  readonly version: 1;
  readonly proposedByUserId: string;
  readonly proposedByDisplayName?: string | null;
  readonly destinationLabel: string;
  readonly pathLabels?: readonly string[];
  readonly proposedAtIso: string;
};

export function isBridgePlanningProposalV1(
  value: unknown,
): value is BridgePlanningProposalV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<BridgePlanningProposalV1>;
  return (
    row.version === 1 &&
    typeof row.proposedByUserId === "string" &&
    typeof row.destinationLabel === "string" &&
    typeof row.proposedAtIso === "string"
  );
}

export function isBridgePlanningTruthV1(
  value: unknown,
): value is BridgePlanningTruthV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<BridgePlanningTruthV1>;
  return (
    row.version === 1 &&
    typeof row.revision === "number" &&
    typeof row.updatedByUserId === "string" &&
    typeof row.updatedAtIso === "string" &&
    Boolean(row.destination?.label) &&
    Array.isArray(row.pathLabels)
  );
}
