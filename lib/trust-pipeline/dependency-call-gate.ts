import type { CertificationLevel } from "@/lib/hub/standards/types";
import type { CapabilityCallGateResult, CapabilityCallNode } from "@/lib/trust-pipeline/types";

const TRUST_RANK: Record<CertificationLevel, number> = {
  UNVERIFIED: 0,
  TESTED: 1,
  VERIFIED: 2,
  TRUSTED: 3,
};

export function canCapabilityCall(
  caller: CapabilityCallNode,
  callee: CapabilityCallNode,
): CapabilityCallGateResult {
  if (caller.trust === "UNVERIFIED" && TRUST_RANK[callee.trust] >= TRUST_RANK.VERIFIED) {
    return {
      allowed: false,
      reasonKo: "UNVERIFIED Capability는 VERIFIED/TRUSTED를 호출할 수 없어요.",
    };
  }
  if (caller.permissionLevel < callee.permissionLevel) {
    return {
      allowed: false,
      reasonKo: `권한 L${caller.permissionLevel}은 L${callee.permissionLevel} Capability를 호출할 수 없어요.`,
    };
  }
  return { allowed: true, reasonKo: "호출 허용" };
}

export function walkCapabilityCallGraph(input: {
  readonly nodes: readonly CapabilityCallNode[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
}): readonly CapabilityCallGateResult[] {
  const byId = new Map(input.nodes.map((n) => [n.capabilityId, n]));
  return input.edges.map((edge) => {
    const caller = byId.get(edge.from);
    const callee = byId.get(edge.to);
    if (!caller || !callee) {
      return { allowed: false, reasonKo: "그래프에 없는 Capability예요." };
    }
    return canCapabilityCall(caller, callee);
  });
}
