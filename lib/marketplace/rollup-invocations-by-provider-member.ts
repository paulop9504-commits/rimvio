import type { ContextCapabilityInvocationV1 } from "@/lib/marketplace/context-capability-invocation-metadata";
import { formatProviderMemberLabel } from "@/lib/marketplace/format-provider-member-label";
import { getProviderNetworkMember } from "@/lib/marketplace/provider-member-registry";
export type ProviderMemberInvocationRollup = {
  readonly memberId: string;
  readonly displayLabel: string;
  readonly kind: string;
  readonly totalInvocations: number;
  readonly successfulInvocations: number;
};

/** Roll up Context capability invocations by Provider Network member id. */
export function rollupInvocationsByProviderMember(
  invocations: readonly ContextCapabilityInvocationV1[],
): readonly ProviderMemberInvocationRollup[] {
  const byMember = new Map<string, { total: number; success: number }>();

  for (const row of invocations) {
    const memberId = row.providerMemberId.trim();
    if (!memberId) {
      continue;
    }
    const prior = byMember.get(memberId) ?? { total: 0, success: 0 };
    byMember.set(memberId, {
      total: prior.total + 1,
      success: prior.success + (row.success ? 1 : 0),
    });
  }

  return [...byMember.entries()]
    .map(([memberId, counts]) => {
      const member = getProviderNetworkMember(memberId);
      return {
        memberId,
        displayLabel: formatProviderMemberLabel(memberId),
        kind: member?.kind ?? "organization",
        totalInvocations: counts.total,
        successfulInvocations: counts.success,
      };
    })
    .sort((left, right) => right.totalInvocations - left.totalInvocations);
}
