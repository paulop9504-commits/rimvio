/**
 * Capability exposure badges for Dev Hub — Auto vs Approval (exposure policy UI).
 */

import { resolveCapabilityExposurePolicy } from "@/lib/platform-sdk/capability-exposure-policy";
import type { CapabilityAction } from "@/lib/hub/capability/types";

export type DevCapabilityExposureBadge = "auto" | "approval";

export type DevCapabilityRow = {
  readonly action: CapabilityAction;
  readonly badge: DevCapabilityExposureBadge;
  readonly badgeLabel: string;
};

export function resolveDevCapabilityBadge(action: CapabilityAction): DevCapabilityExposureBadge {
  const policy = resolveCapabilityExposurePolicy(action.name, {
    approvalRequired: action.approvalRequired,
  });
  if (
    action.approvalRequired ||
    policy.userApprovalRequired ||
    policy.risk === "critical" ||
    policy.risk === "high"
  ) {
    return "approval";
  }
  return "auto";
}

export function buildDevCapabilityRows(actions: readonly CapabilityAction[]): DevCapabilityRow[] {
  return actions.map((action) => {
    const badge = resolveDevCapabilityBadge(action);
    return {
      action,
      badge,
      badgeLabel: badge === "approval" ? "Approval" : "Auto",
    };
  });
}
