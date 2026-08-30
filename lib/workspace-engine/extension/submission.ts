/**
 * Workspace Extension submission — unified validate → sandbox → review pipeline.
 */

import { validateMapViewExtension } from "@/lib/workspace-engine/view-contracts/map-view-contract";
import type { ViewExtensionDraft } from "@/lib/workspace-engine/view-contracts/types";
import {
  validateDomainOntologySchema,
  type DomainOntologySchema,
} from "@/lib/workspace-engine/ontology/domain-ontology-schema";
import type { RimvioProducerKind } from "@/lib/workspace-engine/producer-kind";

export const WORKSPACE_EXTENSION_PIPELINE = [
  "schema_validation",
  "sandbox",
  "performance",
  "security",
  "human_review",
  "verified",
] as const;

export type WorkspaceExtensionPipelineStage = (typeof WORKSPACE_EXTENSION_PIPELINE)[number];

export type WorkspaceExtensionSubmission =
  | {
      readonly producerKind: "view";
      readonly viewExtension: ViewExtensionDraft;
    }
  | {
      readonly producerKind: "ontology";
      readonly ontologySchema: DomainOntologySchema;
    };

export type WorkspaceExtensionValidationResult = {
  readonly valid: boolean;
  readonly stage: WorkspaceExtensionPipelineStage;
  readonly errorsKo: readonly string[];
  readonly warningsKo: readonly string[];
};

export function validateWorkspaceExtensionSubmission(
  submission: WorkspaceExtensionSubmission,
): WorkspaceExtensionValidationResult {
  if (submission.producerKind === "view") {
    const result =
      submission.viewExtension.contractKind === "map"
        ? validateMapViewExtension(submission.viewExtension)
        : { valid: false, errorsKo: ["Unsupported view contract"], warningsKo: [] };
    return {
      valid: result.valid,
      stage: result.valid ? "sandbox" : "schema_validation",
      errorsKo: result.errorsKo,
      warningsKo: result.warningsKo,
    };
  }

  const result = validateDomainOntologySchema(submission.ontologySchema);
  return {
    valid: result.valid,
    stage: result.valid ? "sandbox" : "schema_validation",
    errorsKo: result.errorsKo,
    warningsKo: result.warningsKo,
  };
}

export function producerKindFromSubmission(
  submission: WorkspaceExtensionSubmission,
): RimvioProducerKind {
  return submission.producerKind;
}
