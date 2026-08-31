/**
 * Producer / Reviewer Standard System — public API.
 */

export type {
  CertificationLevel,
  CertificationLevelSpec,
  CapabilityComparisonPreference,
  CapabilityContractField,
  ChecklistItem,
  EvaluationCriterion,
  EvaluationScoreDimension,
  GuideSection,
  ProducerReuseFlowStep,
  ReviewDecision,
  ReviewEvaluationDraft,
  SideEffectClass,
  StandardDefinition,
  StandardExample,
  StandardKind,
  StandardRole,
  StandardRule,
} from "@/lib/hub/standards/types";

export {
  ALL_STANDARDS,
  CAPABILITY_CONTRACT_FIELDS,
  CAPABILITY_STANDARD,
  CERTIFICATION_LEVELS,
  CERTIFICATION_STANDARD,
  CONTRACT_STANDARD,
  HUB_STANDARDS_NAV,
  MAIN_AGENT_CAPABILITY_POLICY,
  MAIN_AGENT_POLICY_STANDARD,
  PRODUCER_GUIDE,
  PRODUCER_REUSE_FLOW,
  PRODUCER_SUBMIT_CHECKLIST,
  REVIEWER_CHECKLIST,
  REVIEWER_EVALUATION_CRITERIA,
  REVIEWER_GUIDE,
  REVIEWER_SCORE_DIMENSIONS,
  RIMVIO_CAPABILITY_STANDARD_VERSION,
  RIMVIO_STANDARD_EFFECTIVE_DATE,
  SIDE_EFFECT_CLASS_EXAMPLES,
  inferSideEffectClass,
  lifecycleToCertificationLevel,
  resolveStandardById,
  searchStandards,
  type HubStandardsView,
} from "@/lib/hub/standards/capability-standards";

import type { HubStandardsView } from "@/lib/hub/standards/capability-standards";
import {
  PRODUCER_GUIDE,
  PRODUCER_SUBMIT_CHECKLIST,
  REVIEWER_CHECKLIST,
  REVIEWER_GUIDE,
} from "@/lib/hub/standards/capability-standards";

/** Deep link into Hub Standards pane. */
export function hubStandardsHref(view: HubStandardsView = "overview"): string {
  return `/hub/workspace?pane=standards&standards=${view}`;
}

/** Contextual guide mode for embedded panels. */
export type ContextualGuideMode = "producer" | "reviewer";

export function contextualGuideStandard(mode: ContextualGuideMode) {
  return mode === "producer" ? PRODUCER_GUIDE : REVIEWER_GUIDE;
}

export function contextualChecklist(mode: ContextualGuideMode) {
  return mode === "producer" ? PRODUCER_SUBMIT_CHECKLIST : REVIEWER_CHECKLIST;
}
