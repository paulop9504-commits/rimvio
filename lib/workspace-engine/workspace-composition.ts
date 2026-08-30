/**
 * Workspace composition — Ontology → Objects → Capabilities → Views → Workspace.
 */

import type { RimvioProducerKind } from "@/lib/workspace-engine/producer-kind";
import type { WorkspaceEngineLayer } from "@/lib/workspace-engine/layers";
import type { DomainOntologySchema } from "@/lib/workspace-engine/ontology/domain-ontology-schema";
import type { ViewContractKind } from "@/lib/workspace-engine/view-contracts/types";

export type WorkspaceCompositionSlot = {
  readonly layer: WorkspaceEngineLayer;
  readonly artifactId: string;
  readonly kind: RimvioProducerKind | "workspace";
};

export type WorkspaceCompositionPlan = {
  readonly goalSummaryKo: string;
  readonly domain: string;
  readonly ontologySchemaId: string | null;
  readonly capabilityIds: readonly string[];
  readonly viewKinds: readonly ViewContractKind[];
  readonly slots: readonly WorkspaceCompositionSlot[];
};

/** Example: property investment goal → composed workspace plan. */
export function planWorkspaceFromGoal(input: {
  readonly goalSummaryKo: string;
  readonly domain: string;
  readonly ontology: DomainOntologySchema | null;
  readonly capabilityIds?: readonly string[];
  readonly preferredViews?: readonly ViewContractKind[];
}): WorkspaceCompositionPlan {
  const capabilityIds = input.capabilityIds ?? [];
  const viewKinds = input.preferredViews ?? ["map", "table"];

  const slots: WorkspaceCompositionSlot[] = [];

  if (input.ontology) {
    for (const obj of input.ontology.objectTypes) {
      slots.push({
        layer: "object",
        artifactId: obj.typeId,
        kind: "ontology",
      });
    }
  }

  for (const capId of capabilityIds) {
    slots.push({ layer: "data", artifactId: capId, kind: "capability" });
  }

  for (const view of viewKinds) {
    slots.push({ layer: "view", artifactId: view, kind: "view" });
  }

  slots.push({
    layer: "view",
    artifactId: "workspace-sdk-frame",
    kind: "workspace",
  });

  return {
    goalSummaryKo: input.goalSummaryKo,
    domain: input.domain,
    ontologySchemaId: input.ontology?.schemaId ?? null,
    capabilityIds,
    viewKinds,
    slots,
  };
}

/** Ontology → Map View binding example from user spec. */
export function bindObjectTypeToMapView(objectTypeId: string): {
  readonly objectTypeId: string;
  readonly viewKind: ViewContractKind;
  readonly projection: "marker";
} {
  return {
    objectTypeId,
    viewKind: "map",
    projection: "marker",
  };
}
