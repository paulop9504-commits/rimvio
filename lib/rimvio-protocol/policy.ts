/**
 * Policy engine contract (🟢 — shape locked early).
 */

import type { RimvioContextEnvelope } from "@/lib/rimvio-protocol/context";

export type RimvioPolicyDecision =
  | "allow"
  | "deny"
  | "require_approval"
  | "require_verification";

export type RimvioPolicyRequest = {
  readonly userId: string;
  readonly platformId: string;
  readonly capabilityId?: string | null;
  readonly action: string;
  readonly context: RimvioContextEnvelope;
};

export type RimvioPolicyResult = {
  readonly decision: RimvioPolicyDecision;
  readonly reasonKo?: string | null;
};

export type RimvioPolicyEngine = {
  evaluate(input: RimvioPolicyRequest): Promise<RimvioPolicyResult>;
};

/** MVP — payment and high-risk capabilities always require approval. */
export function evaluatePolicyMvp(input: RimvioPolicyRequest): RimvioPolicyResult {
  const action = input.action.toLowerCase();
  const cap = input.capabilityId?.toLowerCase() ?? "";

  if (cap.includes("payment") || action.includes("pay") || cap.includes("purchase")) {
    return { decision: "require_approval", reasonKo: "결제는 승인이 필요합니다." };
  }
  if (cap.includes("create_listing") || action === "sell") {
    return { decision: "require_approval", reasonKo: "등록 전 확인이 필요할 수 있습니다." };
  }
  if (action === "search" || cap.includes("search")) {
    return { decision: "allow" };
  }
  return { decision: "allow" };
}
