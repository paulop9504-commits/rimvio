/**
 * View Contract — View-layer extension SSOT.
 * Map is a View, not a Capability.
 */

export const VIEW_CONTRACT_KINDS = [
  "map",
  "timeline",
  "table",
  "graph",
  "ontology_tree",
] as const;

export type ViewContractKind = (typeof VIEW_CONTRACT_KINDS)[number];

export type ViewContractField = {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly descriptionKo: string;
};

export type ViewContractEvent = {
  readonly id: string;
  readonly descriptionKo: string;
  readonly payloadSchema?: string;
};

export type ViewContractAction = {
  readonly id: string;
  readonly descriptionKo: string;
  readonly inputSchema?: string;
};

export type ViewContractSpec = {
  readonly kind: ViewContractKind;
  readonly version: string;
  readonly titleKo: string;
  readonly summaryKo: string;
  /** Input object type id — e.g. GeoObject[] for map */
  readonly consumesObjectType: string;
  readonly objectRequirements: readonly ViewContractField[];
  readonly events: readonly ViewContractEvent[];
  readonly actions: readonly ViewContractAction[];
  readonly permissions: readonly string[];
};

export type ViewExtensionDraft = {
  readonly extensionId: string;
  readonly contractKind: ViewContractKind;
  readonly contractVersion: string;
  readonly consumes: readonly string[];
  readonly supportsEvents: readonly string[];
  readonly permissions: readonly string[];
  readonly testObjectCount?: number;
  readonly producerId?: string;
};

export type ViewExtensionValidationResult = {
  readonly valid: boolean;
  readonly errorsKo: readonly string[];
  readonly warningsKo: readonly string[];
};
