import type { CapabilityReputation, ProducerReputation } from "@/lib/trust-pipeline/types";

export function scoreProducerReputation(rep: ProducerReputation): number {
  const success = rep.reviewSuccessPct * 0.35 + rep.userSuccessPct * 0.35;
  const volume = Math.min(rep.verifiedCapabilities, 50) * 0.4;
  const penalty = rep.securityIncidents * 25 + rep.rollbacks * 10;
  return Math.max(0, Math.min(100, success + volume - penalty));
}

export function scoreCapabilityReputation(rep: CapabilityReputation): number {
  if (rep.security === "FAIL" || rep.verification === "UNVERIFIED") return 0;
  const quality = rep.successRatePct * 0.45 + (rep.humanScore / 5) * 30;
  const usage = Math.min(Math.log10(Math.max(rep.usage, 1)) * 8, 20);
  const failPenalty = rep.failureRatePct * 4;
  const trustBoost = rep.verification === "TRUSTED" ? 8 : rep.verification === "VERIFIED" ? 4 : 0;
  return Math.max(0, Math.min(100, quality + usage + trustBoost - failPenalty));
}

export function mainAgentMaySelect(rep: CapabilityReputation): boolean {
  return (
    rep.security === "PASS" &&
    (rep.verification === "VERIFIED" || rep.verification === "TRUSTED") &&
    scoreCapabilityReputation(rep) >= 40
  );
}
