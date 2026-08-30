/**
 * Consensus engine — 3-of-N, confidence, dispute (R4).
 */

import type {
  ConsensusResult,
  RealityTask,
  RealityTaskStatus,
  VerifierResponse,
} from "@/lib/reality-data-network/types";
import {
  DEFAULT_CONSENSUS_THRESHOLD,
  DEFAULT_CONSENSUS_VERIFIERS,
} from "@/lib/reality-data-network/types";

export type ConsensusEvaluation = {
  readonly result: ConsensusResult;
  readonly taskStatus: RealityTaskStatus;
  readonly epistemic: "confirmed" | "observed" | "inferred";
  readonly submissionStatus: "verified" | "rejected" | "disputed" | "in_review" | "pending";
};

export function evaluateConsensus(input: {
  readonly task: RealityTask;
  readonly responses: readonly VerifierResponse[];
}): ConsensusEvaluation {
  const required = input.task.requiredVerifiers || DEFAULT_CONSENSUS_VERIFIERS;
  const threshold = input.task.consensusThreshold || DEFAULT_CONSENSUS_THRESHOLD;
  const responses = input.responses.filter((r) => r.taskId === input.task.taskId);

  if (responses.length < required) {
    return {
      result: {
        taskId: input.task.taskId,
        verdict: null,
        confidence: 0,
        agreementRate: 0,
        status: "pending",
        responseCount: responses.length,
        requiredVerifiers: required,
        responses,
      },
      taskStatus: responses.length > 0 ? "in_review" : "open",
      epistemic: "observed",
      submissionStatus: responses.length > 0 ? "in_review" : "pending",
    };
  }

  const counts = new Map<string, number>();
  for (const r of responses) {
    counts.set(r.answerId, (counts.get(r.answerId) ?? 0) + 1);
  }

  let bestId = "";
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }

  const agreementRate = bestCount / responses.length;
  const confidence = Math.round(agreementRate * 100) / 100;
  const meetsThreshold = agreementRate >= threshold;

  const hasSplit =
    counts.size > 1 &&
    [...counts.values()].filter((c) => c === bestCount).length > 1;

  const status: ConsensusResult["status"] =
    meetsThreshold && !hasSplit ? "resolved" : "disputed";

  const taskStatus: RealityTaskStatus = status === "resolved" ? "resolved" : "disputed";

  let epistemic: ConsensusEvaluation["epistemic"] = "observed";
  let submissionStatus: ConsensusEvaluation["submissionStatus"] = "in_review";

  if (status === "resolved" && bestId === "yes") {
    epistemic = "confirmed";
    submissionStatus = "verified";
  } else if (status === "resolved" && bestId === "no") {
    epistemic = "observed";
    submissionStatus = "rejected";
  } else if (status === "disputed") {
    epistemic = "inferred";
    submissionStatus = "disputed";
  }

  return {
    result: {
      taskId: input.task.taskId,
      verdict: bestId || null,
      confidence,
      agreementRate,
      status,
      responseCount: responses.length,
      requiredVerifiers: required,
      responses,
    },
    taskStatus,
    epistemic,
    submissionStatus,
  };
}

import { computeContributorRewardV2 } from "@/lib/contributor-ledger/reward-formula-v2";

export function computeVerifierPayout(input: {
  readonly baseRewardKrw: number;
  readonly qualityMultiplier: number;
  readonly difficulty: number;
  readonly verificationConfidence?: number | null;
  readonly uniquenessScore?: number | null;
}): number {
  return computeContributorRewardV2({
    baseRewardKrw: input.baseRewardKrw,
    qualityMultiplier: input.qualityMultiplier,
    difficulty: input.difficulty,
    verificationConfidence: input.verificationConfidence,
    uniquenessScore: input.uniquenessScore,
  }).amountKrw;
}
