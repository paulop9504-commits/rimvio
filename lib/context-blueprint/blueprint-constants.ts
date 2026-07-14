/** Blueprint enums — no compose logic, no sub-contract imports. */

export const CONTEXT_BLUEPRINT_CONTRACT_VERSION = 7 as const;

export const CONTEXT_CONTAINER_KINDS = [
  "travel",
  "trade",
  "medical",
  "education",
  "finance",
  "work",
  "smart_home",
  "generic",
] as const;

export type ContextContainerKind = (typeof CONTEXT_CONTAINER_KINDS)[number];

export const CONTEXT_RESOURCE_KINDS = [
  "flight",
  "lodging",
  "transit",
  "eatery",
  "schedule",
  "ticket",
  "insurance",
  "payment",
  "people",
  "documents",
  "inventory",
  "appointment",
] as const;

export type ContextResourceKind = (typeof CONTEXT_RESOURCE_KINDS)[number];

export const DOMAIN_EXECUTOR_IDS = [
  "travel",
  "trade",
  "medical",
  "education",
  "finance",
  "work",
  "smart_home",
  "lodging",
  "eatery",
  "amenity",
  "activity",
  "schedule",
  "transit",
] as const;

export type DomainExecutorId = (typeof DOMAIN_EXECUTOR_IDS)[number];

export const CONTEXT_BLUEPRINT_APPROVAL_POLICIES = [
  "manual",
  "auto_allowed",
  "multi_step",
  "requires_identity",
] as const;

export type ContextBlueprintApprovalPolicy =
  (typeof CONTEXT_BLUEPRINT_APPROVAL_POLICIES)[number];

export const CONTEXT_BLUEPRINT_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type ContextBlueprintPriority =
  (typeof CONTEXT_BLUEPRINT_PRIORITIES)[number];

export const CONTEXT_BLUEPRINT_CREATORS = [
  "globe_ai",
  "user",
  "system",
] as const;

export type ContextBlueprintCreatedBy =
  (typeof CONTEXT_BLUEPRINT_CREATORS)[number];
