import { scanCapabilitySource } from "@/lib/trust-pipeline/automated-guard";
import { evaluateHumanReviewConsensus } from "@/lib/trust-pipeline/human-review";
import { clampExternalProducerPermission } from "@/lib/trust-pipeline/permission-level";
import { promoteTrustLane } from "@/lib/trust-pipeline/promotion";
import { evaluateSandboxPolicy } from "@/lib/trust-pipeline/sandbox-policy";
import type {
  HumanReviewBallot,
  TrustSubmissionInput,
  TrustSubmissionResult,
} from "@/lib/trust-pipeline/types";

/** Isolated intake — submitted code is never executable. */
export function runTrustSubmissionPipeline(input: TrustSubmissionInput & {
  readonly ballots?: readonly HumanReviewBallot[];
}): TrustSubmissionResult {
  const permissionLevel = clampExternalProducerPermission(input.declaredPermissionLevel);
  const guard = scanCapabilitySource({
    source: input.source,
    dependencies: input.dependencies,
  });

  if (guard.blocked) {
    return {
      stage: "automated_guard",
      quarantined: true,
      executable: false,
      productionAllowed: false,
      permissionLevel,
      guard,
      sandboxOk: false,
      review: null,
      promotion: {
        from: "automated_guard",
        to: null,
        allowed: false,
        reasonKo: "1차 방어에서 차단됐어요.",
      },
      findings: guard.findings,
    };
  }

  const sandbox = evaluateSandboxPolicy({ source: input.source });
  if (!sandbox.ok) {
    return {
      stage: "sandbox",
      quarantined: true,
      executable: false,
      productionAllowed: false,
      permissionLevel,
      guard,
      sandboxOk: false,
      review: null,
      promotion: {
        from: "sandbox",
        to: null,
        allowed: false,
        reasonKo: sandbox.violations[0]?.messageKo ?? "Sandbox 정책 위반",
      },
      findings: guard.findings,
    };
  }

  const review = input.ballots
    ? evaluateHumanReviewConsensus({ producerId: input.producerId, ballots: input.ballots })
    : null;

  if (!review) {
    return {
      stage: "human_review",
      quarantined: true,
      executable: false,
      productionAllowed: false,
      permissionLevel,
      guard,
      sandboxOk: true,
      review: null,
      promotion: promoteTrustLane({ from: "sandbox" }),
      findings: guard.findings,
    };
  }

  const promotion = promoteTrustLane({
    from: "human_review",
    reviewPassed: review.eligibleForNextStage,
  });

  return {
    stage: review.eligibleForNextStage ? "tested" : "human_review",
    quarantined: true,
    executable: false,
    productionAllowed: false,
    permissionLevel,
    guard,
    sandboxOk: true,
    review,
    promotion,
    findings: guard.findings,
  };
}
