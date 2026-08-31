/**
 * Capability contract — constitutional fields beyond manifest slice.
 * docs/RIMVIO_OS_CONSTITUTION.md §8
 */

import type { CapabilityDeclaration } from "@/lib/platform-sdk/types";
import type { RimvioContextPath } from "@/lib/rimvio-protocol/context";

export type CapabilitySideEffect =
  | "creates_object"
  | "updates_object"
  | "sends_message"
  | "charges_payment"
  | "external_network"
  | "reads_context"
  | "writes_data";

export type CapabilityRiskTier = "low" | "medium" | "high" | "critical";

export type RimvioCapabilityContract = {
  readonly identity: CapabilityDeclaration;
  readonly contextRequirements: readonly RimvioContextPath[];
  readonly sideEffects: readonly CapabilitySideEffect[];
  readonly riskTier: CapabilityRiskTier;
  readonly approvalPolicy: "none" | "conditional" | "user_required" | "field_commit";
  readonly runtimeTier: "native" | "sandbox" | "external";
  readonly version: string;
};

export function defaultCapabilityContract(
  cap: CapabilityDeclaration,
  opts?: Partial<Pick<RimvioCapabilityContract, "riskTier" | "approvalPolicy" | "sideEffects">>,
): RimvioCapabilityContract {
  const risk: CapabilityRiskTier =
    opts?.riskTier ??
    (cap.approvalRequired ? "high" : cap.id.includes("payment") ? "critical" : "low");

  return {
    identity: cap,
    contextRequirements: ["user.id", "market.country", "locale.currency"],
    sideEffects: opts?.sideEffects ?? (cap.id.includes("create") ? ["creates_object", "writes_data"] : ["reads_context"]),
    riskTier: risk,
    approvalPolicy:
      opts?.approvalPolicy ??
      (cap.approvalRequired ? "user_required" : risk === "critical" ? "field_commit" : "none"),
    runtimeTier: "native",
    version: "1.0.0",
  };
}
