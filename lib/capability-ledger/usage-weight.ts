/**
 * Usage weight + output quality from tool result and verification (P2).
 */

import type { CapabilityExecutionStatus } from "@/lib/capability-ledger/types";
import type { RimvioToolId } from "@/lib/tool-registry";
import { resolveInputClassForTool } from "@/lib/capability-ledger/tier-table";

export type UsageWeightInput = {
  readonly toolId: RimvioToolId;
  readonly toolOk: boolean;
  readonly candidateCount?: number;
  readonly waitingCommit?: boolean;
  readonly verified?: boolean;
  readonly pickedId?: string | null;
};

export function deriveExecutionStatus(input: UsageWeightInput): CapabilityExecutionStatus {
  if (input.toolId === "booking.prepare" || input.waitingCommit) {
    return "blocked";
  }
  if (!input.toolOk) {
    return "failed";
  }
  const count = input.candidateCount ?? 0;
  if (count === 0 && resolveInputClassForTool(input.toolId) === "lookup") {
    return "empty";
  }
  if (input.verified === false) {
    return "partial";
  }
  return "success";
}

export function computeOutputQuality(input: UsageWeightInput): number {
  const status = deriveExecutionStatus(input);
  if (status === "blocked") return 0;
  if (status === "failed") return 0;
  if (status === "empty") return 0.1;

  let quality = 0.6;
  const count = input.candidateCount ?? 0;
  if (count > 0) quality += 0.2;
  if (count >= 5) quality += 0.1;
  if (input.pickedId) quality += 0.1;
  if (input.verified) quality = Math.min(1, quality + 0.05);

  return Math.round(quality * 100) / 100;
}

export function computeUsageWeight(input: UsageWeightInput): number {
  const status = deriveExecutionStatus(input);
  const inputClass = resolveInputClassForTool(input.toolId);

  if (inputClass === "commit_gate") {
    return 0;
  }
  if (status === "failed" || status === "blocked") {
    return 0;
  }
  if (status === "empty") {
    return 0.25;
  }
  if (status === "partial") {
    return 0.5;
  }

  let weight = 1;
  if (inputClass === "rank" && input.pickedId) {
    weight = 1.5;
  }
  if (inputClass === "analyze") {
    weight = 2;
  }
  const quality = computeOutputQuality(input);
  if (quality >= 0.9) {
    weight *= 1.1;
  }

  return Math.round(weight * 100) / 100;
}

export function computePayoutKrw(input: {
  readonly unitPriceKrw: number;
  readonly usageWeight: number;
  readonly executionStatus: CapabilityExecutionStatus;
}): number {
  if (input.executionStatus === "blocked") {
    return 0;
  }
  return Math.round(input.unitPriceKrw * input.usageWeight);
}
