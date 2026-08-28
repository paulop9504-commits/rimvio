export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

export type RuntimeType =
  | "pc-agent"
  | "cloud-agent"
  | "remote-agent"
  | "mobile-agent"
  | "api-tool";

export type PricingModel = "free" | "freemium" | "paid" | "usage-based";

export type PermissionRisk = "low" | "medium" | "high" | "critical";

export type CapabilityCategory =
  | "e-commerce"
  | "productivity"
  | "finance"
  | "communication"
  | "developer-tools"
  | "travel"
  | "media"
  | "other";

export type CapabilityAction = {
  id: string;
  name: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
  approvalRequired: boolean;
};

export type CapabilityPermission = {
  id: string;
  label: string;
  scope: string;
  whyNeeded: string;
  risk: PermissionRisk;
  enabled: boolean;
};

export type ContextField = {
  id: string;
  label: string;
  type: string;
  path: string;
};

export type CapabilityEvent = {
  id: string;
  name: string;
  description: string;
  payloadSchema: string;
  trigger: string;
};

export type ApprovalPolicy = {
  before: string[];
};

export type CapabilityDraft = {
  id: string;
  name: string;
  version: string;
  description: string;
  category: CapabilityCategory;
  tags: string[];
  iconDataUrl: string | null;
  pricing: PricingModel;
  manifestJson: string;
  runtime: {
    type: RuntimeType;
    entry: string;
  };
  inputType: string;
  actions: CapabilityAction[];
  outputEvents: string[];
  approval: ApprovalPolicy;
  permissions: CapabilityPermission[];
  selectedContext: ContextField[];
  inputSchemaJson: string;
  outputSchemaJson: string;
  events: CapabilityEvent[];
  changelog: string;
  publishConsents: {
    rights: boolean;
    permissions: boolean;
    policy: boolean;
    tested: boolean;
  };
};

export type StepValidationState = {
  package: boolean;
  manifest: boolean;
  permissions: boolean;
  context: boolean;
  test: boolean;
};

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type TestRunStatus = "idle" | "running" | "passed" | "failed";

export type PublishStatus = "idle" | "submitting" | "pending-review" | "published";

export type TestTimelineStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "success" | "failed";
  detail?: string;
};

export type SecurityCheck = {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
};
