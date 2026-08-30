import type { CertificationLevel } from "@/lib/hub/standards/types";
import type { TrustLaneStage, TrustPromotionDecision } from "@/lib/trust-pipeline/types";

const ORDER: readonly TrustLaneStage[] = [
  "submission",
  "quarantine",
  "automated_guard",
  "sandbox",
  "human_review",
  "tested",
  "verified",
  "staging",
  "canary",
  "production",
];

export function trustLaneIndex(stage: TrustLaneStage): number {
  return ORDER.indexOf(stage);
}

/** Review PASS never jumps to production. */
export function promoteTrustLane(input: {
  readonly from: TrustLaneStage;
  readonly reviewPassed?: boolean;
  readonly stagingHealthy?: boolean;
  readonly canaryHealthy?: boolean;
}): TrustPromotionDecision {
  const from = input.from;

  if (from === "human_review") {
    if (!input.reviewPassed) {
      return {
        from,
        to: null,
        allowed: false,
        reasonKo: "검수 PASS 없이 승격할 수 없어요.",
      };
    }
    return {
      from,
      to: "tested",
      allowed: true,
      reasonKo: "PASS는 TESTED 자격이에요. Production이 아니에요.",
    };
  }

  if (from === "verified") {
    return {
      from,
      to: "staging",
      allowed: true,
      reasonKo: "VERIFIED는 Staging 자격이에요. 전체 사용자에게 바로 열지 않아요.",
    };
  }

  if (from === "staging") {
    if (!input.stagingHealthy) {
      return { from, to: null, allowed: false, reasonKo: "Staging telemetry가 불안정해요." };
    }
    return { from, to: "canary", allowed: true, reasonKo: "제한된 사용자 Canary로 확대해요." };
  }

  if (from === "canary") {
    if (!input.canaryHealthy) {
      return { from, to: null, allowed: false, reasonKo: "Canary anomaly — rollback / disable." };
    }
    return { from, to: "production", allowed: true, reasonKo: "Canary가 안정되면 TRUSTED Production." };
  }

  const idx = trustLaneIndex(from);
  const next = ORDER[idx + 1] ?? null;
  if (!next) {
    return { from, to: null, allowed: false, reasonKo: "이미 Production이에요." };
  }
  return { from, to: next, allowed: true, reasonKo: `${from} → ${next}` };
}

export function certificationToLane(level: CertificationLevel): TrustLaneStage {
  switch (level) {
    case "TRUSTED":
      return "production";
    case "VERIFIED":
      return "verified";
    case "TESTED":
      return "tested";
    default:
      return "quarantine";
  }
}

export function laneToCertification(stage: TrustLaneStage): CertificationLevel {
  if (stage === "production") return "TRUSTED";
  if (stage === "canary" || stage === "staging" || stage === "verified") return "VERIFIED";
  if (stage === "tested" || stage === "human_review") return "TESTED";
  return "UNVERIFIED";
}

export const CANARY_ROLLOUT_STEPS = [10, 100, 1_000, 10_000] as const;

export function nextCanaryCohort(currentUsers: number): number | null {
  const next = CANARY_ROLLOUT_STEPS.find((n) => n > currentUsers);
  return next ?? null;
}
