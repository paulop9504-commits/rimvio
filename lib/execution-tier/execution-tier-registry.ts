import type { CapabilityId } from "@/lib/capability-registry/capability-contract";

export type ExecutionTier = 0 | 1 | 2 | 3;

export type ExecutionTierLabel =
  | "read_only"
  | "draft"
  | "one_tap"
  | "commit";

const TIER_BY_CAPABILITY: Record<CapabilityId, ExecutionTier> = {
  CALENDAR: 0,
  OPEN_EVENT: 0,
  DISMISS_SURFACE: 0,
  CLARIFY_GOAL: 1,
  DOCUMENT: 1,
  SHEET: 1,
  SEARCH: 2,
  NAVIGATE: 2,
  MAP: 2,
  TAXI: 2,
  PARKING: 2,
  LINK: 2,
  ALARM: 2,
  CALL: 3,
  MESSAGE: 3,
  EMAIL: 3,
  BOOK_FLIGHT: 3,
  BOOK_HOTEL: 3,
  CHECK_IN: 3,
  CONFIRM_PLACE: 3,
};

const TIER_LABEL: Record<ExecutionTier, ExecutionTierLabel> = {
  0: "read_only",
  1: "draft",
  2: "one_tap",
  3: "commit",
};

export function resolveExecutionTier(capabilityId: CapabilityId): ExecutionTier {
  return TIER_BY_CAPABILITY[capabilityId] ?? 2;
}

export function executionTierLabel(tier: ExecutionTier): ExecutionTierLabel {
  return TIER_LABEL[tier];
}

export function executionTierRequiresCommitApproval(tier: ExecutionTier): boolean {
  return tier >= 3;
}

export type ExecutionTierGateInput = {
  capabilityId: CapabilityId;
  metadata?: Record<string, string>;
};

export type ExecutionTierGateResult =
  | { allowed: true; tier: ExecutionTier; label: ExecutionTierLabel }
  | { allowed: false; tier: ExecutionTier; label: ExecutionTierLabel; reason: "commit_approval_required" };

/** Gate capability dispatch — tier 3 requires metadata.commitApproved=true. */
export function gateCapabilityByExecutionTier(
  input: ExecutionTierGateInput,
): ExecutionTierGateResult {
  const tier = resolveExecutionTier(input.capabilityId);
  const label = executionTierLabel(tier);
  if (executionTierRequiresCommitApproval(tier)) {
    const approved = input.metadata?.commitApproved === "true";
    if (!approved) {
      return {
        allowed: false,
        tier,
        label,
        reason: "commit_approval_required",
      };
    }
  }
  return { allowed: true, tier, label };
}

export function isDraftExecutionTier(capabilityId: CapabilityId): boolean {
  return resolveExecutionTier(capabilityId) <= 1;
}
