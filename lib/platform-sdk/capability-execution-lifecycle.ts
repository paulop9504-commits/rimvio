/**
 * Capability Execution Lifecycle — Registered → Validated → Published → Discoverable → Executable.
 * Dev registers; Rimvio gates Agent access per stage + policy.
 */

import {
  isAgentDiscoverableCapability,
  normalizeCapabilityLifecycleStatus,
  type CapabilityIndexStatus,
} from "@/lib/platform-sdk/capability-lifecycle";
import {
  classifyCapability,
  type CapabilityClass,
} from "@/lib/platform-sdk/capability-classification";

export type CapabilityExecutionStage =
  | "registered"
  | "validated"
  | "published"
  | "discoverable"
  | "executable";

export function resolveExecutionStage(status: CapabilityIndexStatus): CapabilityExecutionStage {
  const normalized = normalizeCapabilityLifecycleStatus(status);
  switch (normalized) {
    case "DRAFT":
      return "registered";
    case "VALIDATING":
      return "validated";
    case "TESTING":
      return "published";
    case "PUBLISHED":
      return "discoverable";
    case "SUSPENDED":
    case "DEPRECATED":
      return "registered";
    default:
      return "registered";
  }
}

export function isStageAtLeast(
  current: CapabilityExecutionStage,
  required: CapabilityExecutionStage,
): boolean {
  const order: CapabilityExecutionStage[] = [
    "registered",
    "validated",
    "published",
    "discoverable",
    "executable",
  ];
  return order.indexOf(current) >= order.indexOf(required);
}

export function isCapabilityDiscoverableAtStage(
  status: CapabilityIndexStatus,
  capClass: CapabilityClass,
): boolean {
  if (!isAgentDiscoverableCapability(status)) return false;
  const stage = resolveExecutionStage(status);
  if (!isStageAtLeast(stage, "discoverable")) return false;
  if (capClass === "delete") return false;
  return true;
}

export function isCapabilityExecutableAtStage(
  status: CapabilityIndexStatus,
  capClass: CapabilityClass,
  agentAutoExecute: boolean,
): boolean {
  if (!isAgentDiscoverableCapability(status)) return false;
  const stage = resolveExecutionStage(status);
  if (!isStageAtLeast(stage, "discoverable")) return false;
  if (capClass === "delete") return false;
  if (!agentAutoExecute && (capClass === "transaction" || capClass === "share")) {
    return false;
  }
  return true;
}
