/** Living map resource — stage drives pin signal badge + resume routing. */

export const RESOURCE_OPERATION_DOMAINS = ["lodging", "eatery"] as const;

export type ResourceOperationDomain = (typeof RESOURCE_OPERATION_DOMAINS)[number];

export const RESOURCE_OPERATION_STAGES = [
  "searching",
  "comparing",
  "selected",
  "booking",
  "awaiting_pay",
  "committed",
  "failed",
  "dismissed",
] as const;

export type ResourceOperationStage = (typeof RESOURCE_OPERATION_STAGES)[number];

/** Traffic-light tone on map pins. */
export const RESOURCE_OPERATION_SIGNAL_TONES = [
  "amber",
  "blue",
  "green",
  "red",
  "muted",
] as const;

export type ResourceOperationSignalTone =
  (typeof RESOURCE_OPERATION_SIGNAL_TONES)[number];

export type ResourceOperation = {
  operationId: string;
  contextEventId: string;
  resourceId: string;
  domain: ResourceOperationDomain;
  label: string;
  stage: ResourceOperationStage;
  lat: number | null;
  lng: number | null;
  updatedAt: string;
};

export type ResourceOperationResumeIntent = "book" | "pay" | null;
