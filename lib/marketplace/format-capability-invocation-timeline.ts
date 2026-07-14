/**
 * L1 labels for capability invocation hub timeline rows.
 */

import { copy } from "@/lib/copy/human-ko";
import { formatProviderMemberLabel } from "@/lib/marketplace/format-provider-member-label";
import type { ContextCapabilityInvocationV1 } from "@/lib/marketplace/context-capability-invocation-metadata";

export type CapabilityInvocationTimelineRow = {
  id: string;
  labelKo: string;
  atIso: string;
  providerMemberId: string;
  providerMemberLabelKo: string;
  success: boolean;
};

function capabilityActionLabel(capabilityId: string): string {
  const labels = copy.globe.capabilityInvocationTimeline;
  return labels[capabilityId as keyof typeof labels] ?? capabilityId;
}

export function formatCapabilityInvocationTimelineLabel(
  invocation: ContextCapabilityInvocationV1,
): string {
  const action = capabilityActionLabel(invocation.capabilityId);
  const member = formatProviderMemberLabel(invocation.providerMemberId);
  const prefix = invocation.success
    ? action
    : copy.globe.capabilityInvocationFailed(action);
  return `${prefix} · ${member}`;
}

export function capabilityInvocationPriority(
  invocation: ContextCapabilityInvocationV1,
): number {
  if (!invocation.success) {
    return 9;
  }
  switch (invocation.capabilityId) {
    case "BOOK_HOTEL":
    case "BOOK_FLIGHT":
      return 0;
    case "NAVIGATE":
      return 2;
    default:
      return 4;
  }
}

export function buildCapabilityInvocationTimelineRows(
  invocations: readonly ContextCapabilityInvocationV1[],
  max = 4,
): CapabilityInvocationTimelineRow[] {
  return [...invocations]
    .sort((left, right) => {
      const priority =
        capabilityInvocationPriority(left) - capabilityInvocationPriority(right);
      if (priority !== 0) {
        return priority;
      }
      return right.atIso.localeCompare(left.atIso);
    })
    .slice(0, max)
    .map((invocation) => ({
      id: invocation.id,
      labelKo: formatCapabilityInvocationTimelineLabel(invocation),
      atIso: invocation.atIso,
      providerMemberId: invocation.providerMemberId,
      providerMemberLabelKo: formatProviderMemberLabel(invocation.providerMemberId),
      success: invocation.success,
    }));
}
