import {
  computeScoreDistribution,
  type ScoreDistributionTelemetry,
} from "@/lib/globe/discovery-policy/compute-score-distribution";
import type { ExplorationMode } from "@/lib/globe/discovery-policy/exploration-mode";
import { emitSearchHubAction } from "@/lib/globe/resource/hub-action-record-store";

export type ExplorationDomainScoreTelemetry = {
  readonly domain: "lodging" | "eatery" | "activity" | "amenity";
  readonly distribution: ScoreDistributionTelemetry;
};

export type ExplorationScoutScoreTelemetryInput = {
  readonly contextEventId: string;
  readonly explorationMode: ExplorationMode;
  readonly batchId: string;
  readonly lodgingScores?: readonly number[];
  readonly eateryScores?: readonly number[];
  readonly activityScores?: readonly number[];
};

function domainRow(
  domain: ExplorationDomainScoreTelemetry["domain"],
  scores: readonly number[] | undefined,
): ExplorationDomainScoreTelemetry | null {
  if (!scores?.length) {
    return null;
  }
  const distribution = computeScoreDistribution(scores);
  if (!distribution) {
    return null;
  }
  return { domain, distribution };
}

/** Append-only search log row with σ metadata — internal telemetry only. */
export function logExplorationScoutScoreTelemetry(
  input: ExplorationScoutScoreTelemetryInput,
): void {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return;
  }

  const domains = [
    domainRow("lodging", input.lodgingScores),
    domainRow("eatery", input.eateryScores),
    domainRow("activity", input.activityScores),
  ].filter((row): row is ExplorationDomainScoreTelemetry => row != null);

  if (domains.length === 0) {
    return;
  }

  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.info("[exploration-score-telemetry]", {
      contextEventId,
      explorationMode: input.explorationMode,
      batchId: input.batchId,
      domains: domains.map((row) => ({
        domain: row.domain,
        stdDev: row.distribution.stdDev,
        mean: row.distribution.mean,
        count: row.distribution.count,
      })),
    });
  }

  void emitSearchHubAction({
    contextEventId,
    sourceHubId: "hub.exploration_telemetry",
    approvalPolicy: "auto_prep",
    payload: {
      query: `scout:${input.explorationMode}`,
      filters: {
        batchId: input.batchId,
        explorationMode: input.explorationMode,
        scoreTelemetry: Object.fromEntries(
          domains.map((row) => [
            row.domain,
            {
              stdDev: row.distribution.stdDev,
              mean: row.distribution.mean,
              count: row.distribution.count,
              min: row.distribution.min,
              max: row.distribution.max,
            },
          ]),
        ),
      },
    },
  });
}
