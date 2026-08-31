/**
 * Capability → Runtime requirement hints — compiled from Capability Specification when possible.
 */

import {
  compileCapabilitySpecificationFromId,
  type RimvioCapabilityRequirementSpec,
} from "@/lib/rimvio-protocol/capability-specification";

export type RuntimeRequirement =
  | "tool"
  | "context"
  | "event"
  | "permission"
  | "network"
  | "browser"
  | "location"
  | "database"
  | "plc"
  | "camera";

export type CapabilityRuntimeRequirements = {
  readonly capabilityId: string;
  readonly required: readonly RuntimeRequirement[];
  readonly preferredRuntimeTypes: readonly (
    | "pc"
    | "browser"
    | "cloud"
    | "mobile"
    | "industrial"
  )[];
  readonly infrastructureKinds: readonly string[];
  readonly specification: RimvioCapabilityRequirementSpec;
};

function mapSpecToRuntimeRequirements(
  spec: RimvioCapabilityRequirementSpec,
): RuntimeRequirement[] {
  const required: RuntimeRequirement[] = ["tool", "network"];

  for (const iface of spec.runtimeInterfaces) {
    if (iface === "context") required.push("context");
    if (iface === "event") required.push("event");
    if (iface === "permission") required.push("permission");
  }
  for (const support of spec.runtimeSupports) {
    if (support === "database") required.push("database");
    if (support === "plc") required.push("plc");
    if (support === "camera") required.push("camera");
  }
  if (spec.runtimeTypes.includes("browser")) {
    required.push("browser");
  }
  if (
    spec.runtimeTypes.includes("browser") ||
    spec.infrastructureKinds.includes("supplier_api")
  ) {
    required.push("location");
  }

  return [...new Set(required)];
}

export function resolveCapabilityRuntimeRequirements(
  capabilityId: string,
): CapabilityRuntimeRequirements {
  const specification = compileCapabilitySpecificationFromId(capabilityId);
  const spec = specification.requirements;

  return {
    capabilityId,
    required: mapSpecToRuntimeRequirements(spec),
    preferredRuntimeTypes: spec.runtimeTypes,
    infrastructureKinds: spec.infrastructureKinds,
    specification: spec,
  };
}
