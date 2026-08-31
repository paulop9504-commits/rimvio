import { mainAgentMaySelect } from "@/lib/trust-pipeline";
import type { CapabilityContract, CapabilityInvokeRequest } from "@/lib/capability-runtime/types";

export type GatewayAdmitResult = {
  readonly admitted: boolean;
  readonly reasonKo: string;
};

/** Agent may pass capabilityId + input only. Tokens and source are rejected. */
export function admitCapabilityInvoke(input: {
  readonly request: CapabilityInvokeRequest;
  readonly contract: CapabilityContract;
  readonly forbiddenFields?: Readonly<Record<string, unknown>>;
}): GatewayAdmitResult {
  const forbidden = input.forbiddenFields ?? {};
  if ("githubToken" in forbidden || "accessToken" in input.request.input) {
    return { admitted: false, reasonKo: "Main Agent는 GitHub Token을 가질 수 없어요." };
  }
  if ("source" in input.request.input || "repoClone" in input.request.input) {
    return { admitted: false, reasonKo: "Main Agent는 소스를 받을 수 없어요." };
  }
  if (input.request.capabilityId !== input.contract.capabilityId) {
    return { admitted: false, reasonKo: "Capability ID가 계약과 달라요." };
  }
  if (
    !mainAgentMaySelect({
      capabilityId: input.contract.capabilityId,
      verification: input.contract.trust,
      successRatePct: 90,
      humanScore: 4,
      usage: 100,
      failureRatePct: 1,
      security: "PASS",
    })
  ) {
    return { admitted: false, reasonKo: "이 Capability는 Main Agent 실행 자격이 없어요." };
  }
  return { admitted: true, reasonKo: "Gateway 통과" };
}
