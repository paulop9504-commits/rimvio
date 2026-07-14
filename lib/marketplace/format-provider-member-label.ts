/**
 * L1 provider member display labels — single formatter for Engine Store + hub timeline.
 * @see docs/RIMVIO_STACK_ALIGNMENT.md
 */

import { copy } from "@/lib/copy/human-ko";
import { getProviderNetworkMember } from "@/lib/marketplace/provider-member-registry";

export function formatProviderMemberLabel(memberId: string): string {
  const labels = copy.globe.engineStore.providerMember;
  const l1 = labels[memberId as keyof typeof labels];
  if (l1) {
    return l1;
  }
  const member = getProviderNetworkMember(memberId);
  return member?.displayLabel ?? memberId;
}
