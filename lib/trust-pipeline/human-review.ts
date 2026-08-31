import type { HumanReviewBallot, HumanReviewConsensus } from "@/lib/trust-pipeline/types";

export function evaluateHumanReviewConsensus(input: {
  readonly producerId: string;
  readonly ballots: readonly HumanReviewBallot[];
}): HumanReviewConsensus {
  const distinctReviewers = new Set(input.ballots.map((b) => b.reviewerId));
  if (input.ballots.some((b) => b.reviewerId === input.producerId)) {
    return {
      decision: "HUMAN_REVIEW_REQUIRED",
      eligibleForNextStage: false,
      productionAllowed: false,
      reasonKo: "Producer와 Reviewer를 분리해야 해요.",
    };
  }

  if (distinctReviewers.size < 2) {
    return {
      decision: "HUMAN_REVIEW_REQUIRED",
      eligibleForNextStage: false,
      productionAllowed: false,
      reasonKo: "검수는 서로 다른 Reviewer 2명 이상이 필요해요.",
    };
  }

  const votes = input.ballots.map((b) => b.vote);
  if (votes.includes("FAIL")) {
    return {
      decision: "FAIL",
      eligibleForNextStage: false,
      productionAllowed: false,
      reasonKo: "FAIL 표가 있어 다음 단계로 갈 수 없어요.",
    };
  }
  if (votes.includes("SUSPICIOUS")) {
    return {
      decision: "HUMAN_REVIEW_REQUIRED",
      eligibleForNextStage: false,
      productionAllowed: false,
      reasonKo: "SUSPICIOUS 표가 있어 추가 사람이 봐야 해요.",
    };
  }

  const allPass = votes.every((v) => v === "PASS");
  return {
    decision: allPass ? "PASS" : "HUMAN_REVIEW_REQUIRED",
    eligibleForNextStage: allPass,
    productionAllowed: false,
    reasonKo: allPass
      ? "검수 PASS는 Staging 자격이지 Production 권한이 아니에요."
      : "합의가 없어 추가 검수가 필요해요.",
  };
}
