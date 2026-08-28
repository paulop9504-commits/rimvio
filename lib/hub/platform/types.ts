import type {
  CapabilityDraft,
  CapabilityPermission,
  PublishStatus,
  AutosaveStatus,
  TestRunStatus,
} from "@/lib/hub/capability/types";

export type PlatformWizardStepId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14;

export type PlatformRuntimeTier = "native" | "hosted";

export type PlatformDataIsolation = "tenant_strict" | "shared_read";

/** Full 14-step platform submission draft — extends capability fields for manifest bridge. */
export type PlatformDraft = CapabilityDraft & {
  architectureNotes: string;
  runtimeTier: PlatformRuntimeTier;
  dataCollectionsJson: string;
  dataIsolation: PlatformDataIsolation;
  uiRoutesJson: string;
  workflowDescription: string;
  commerceNotes: string;
  securityScanPassed: boolean;
};

export type PlatformStepValidationState = {
  identity: boolean;
  organization: boolean;
  product: boolean;
  architecture: boolean;
  data: boolean;
  ui: boolean;
  capabilities: boolean;
  workflow: boolean;
  permissions: boolean;
  markets: boolean;
  commerce: boolean;
  security: boolean;
  testing: boolean;
};

export type { CapabilityPermission, PublishStatus, AutosaveStatus, TestRunStatus };

export const PLATFORM_WIZARD_STEP_LABELS: readonly {
  id: PlatformWizardStepId;
  label: string;
  key: keyof PlatformStepValidationState;
}[] = [
  { id: 1, label: "Platform Identity", key: "identity" },
  { id: 2, label: "Organization", key: "organization" },
  { id: 3, label: "Product Definition", key: "product" },
  { id: 4, label: "Architecture", key: "architecture" },
  { id: 5, label: "Data", key: "data" },
  { id: 6, label: "UI", key: "ui" },
  { id: 7, label: "Capabilities", key: "capabilities" },
  { id: 8, label: "Workflow", key: "workflow" },
  { id: 9, label: "Permissions", key: "permissions" },
  { id: 10, label: "Markets", key: "markets" },
  { id: 11, label: "Commerce", key: "commerce" },
  { id: 12, label: "Security", key: "security" },
  { id: 13, label: "Testing", key: "testing" },
  { id: 14, label: "Review & Publish", key: "testing" },
];
