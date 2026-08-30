/**
 * Producer / Reviewer Standard System — structured definitions.
 * UI, validation, and Agent policy share this SSOT (not hardcoded copy in components).
 */

export type StandardRole = "producer" | "reviewer" | "shared";

export type StandardKind =
  | "capability_standard"
  | "producer_guide"
  | "reviewer_guide"
  | "contract_standard"
  | "certification_standard"
  | "main_agent_policy"
  | "wdk_overview"
  | "view_producer_guide"
  | "ontology_producer_guide";

export type SideEffectClass = "READ" | "WRITE" | "TRANSACTION" | "DESTRUCTIVE";

export type CertificationLevel = "UNVERIFIED" | "TESTED" | "VERIFIED" | "TRUSTED";

export type ReviewDecision = "PASS" | "FAIL" | "NEEDS_IMPROVEMENT";

/** Pairwise capability comparison — feeds future ranking, not computed here. */
export type CapabilityComparisonPreference =
  | "a_better"
  | "b_better"
  | "equivalent"
  | "both_fail";

export type ChecklistItem = {
  readonly id: string;
  readonly labelKo: string;
  readonly required?: boolean;
};

export type StandardExample = {
  readonly kind: "good" | "bad";
  readonly items: readonly string[];
};

export type StandardRule = {
  readonly id: string;
  readonly titleKo: string;
  readonly whyKo: string;
  readonly examples?: readonly StandardExample[];
  readonly checklist?: readonly ChecklistItem[];
};

export type GuideSection = {
  readonly id: string;
  readonly titleKo: string;
  readonly descriptionKo?: string;
  readonly rules?: readonly StandardRule[];
  readonly checklist?: readonly ChecklistItem[];
  readonly bullets?: readonly string[];
};

export type EvaluationCriterion = {
  readonly id: string;
  readonly titleKo: string;
  readonly descriptionKo: string;
  readonly automated: boolean;
};

export type EvaluationScoreDimension = {
  readonly id: string;
  readonly labelKo: string;
  readonly min: number;
  readonly max: number;
};

export type CertificationLevelSpec = {
  readonly level: CertificationLevel;
  readonly titleKo: string;
  readonly descriptionKo: string;
};

export type StandardDefinition = {
  readonly id: StandardKind;
  readonly version: string;
  readonly role: StandardRole;
  readonly titleKo: string;
  readonly summaryKo: string;
  readonly effectiveDateIso: string;
  readonly updatedAtIso: string;
  readonly changelogKo?: readonly string[];
  readonly sections: readonly GuideSection[];
};

export type CapabilityContractField = {
  readonly field: string;
  readonly descriptionKo: string;
  readonly required: boolean;
};

export type ReviewEvaluationDraft = {
  readonly capabilityId: string;
  readonly scenarioId?: string;
  readonly decision?: ReviewDecision;
  readonly scores?: Partial<Record<string, number>>;
  readonly checklistCompleted: readonly string[];
  readonly notesKo?: string;
  readonly comparedCapabilityIds?: readonly string[];
  readonly comparisonPreference?: CapabilityComparisonPreference;
};

export type ProducerReuseFlowStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly nextOnYes?: string;
  readonly nextOnNo?: string;
};
