import { validateCapabilityId, validateManifestStep, validatePermissionsStep } from "@/lib/hub/capability/validation";
import type { PlatformDraft, PlatformStepValidationState } from "@/lib/hub/platform/types";
import { canPublishAnyMarket } from "@/lib/platform-sdk/markets";

function isValidJson(raw: string): boolean {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

export function validateIdentityStep(draft: PlatformDraft): boolean {
  return (
    Boolean(draft.name.trim()) &&
    !validateCapabilityId(draft.id) &&
    Boolean(draft.description.trim())
  );
}

export function validateOrganizationStep(draft: PlatformDraft): boolean {
  return Boolean(draft.operator?.name?.trim());
}

export function validateProductStep(draft: PlatformDraft): boolean {
  return Boolean(draft.category) && draft.tags.length > 0;
}

export function validateArchitectureStep(draft: PlatformDraft): boolean {
  return Boolean(draft.runtime.entry.trim()) && Boolean(draft.runtime.type);
}

export function validateDataStep(draft: PlatformDraft): boolean {
  return isValidJson(draft.dataCollectionsJson);
}

export function validateUiStep(draft: PlatformDraft): boolean {
  return isValidJson(draft.uiRoutesJson);
}

export function validateCapabilitiesStep(draft: PlatformDraft): boolean {
  return validateManifestStep(draft);
}

export function validateWorkflowStep(draft: PlatformDraft): boolean {
  return (
    Boolean(draft.workflowDescription.trim()) ||
    draft.events.length > 0 ||
    draft.approval.before.length > 0
  );
}

export function validateMarketsStep(draft: PlatformDraft): boolean {
  const hasCountry =
    draft.markets.deployments.filter((d) => d.country !== "GLOBAL").length > 0;
  return hasCountry && canPublishAnyMarket(draft.markets);
}

export function validateCommerceStep(draft: PlatformDraft): boolean {
  return Boolean(draft.commerceNotes.trim());
}

export function validateSecurityStep(draft: PlatformDraft): boolean {
  return draft.securityScanPassed;
}

export function computePlatformStepValidation(
  draft: PlatformDraft,
  testsPassed: boolean,
): PlatformStepValidationState {
  return {
    identity: validateIdentityStep(draft),
    organization: validateOrganizationStep(draft),
    product: validateProductStep(draft),
    architecture: validateArchitectureStep(draft),
    data: validateDataStep(draft),
    ui: validateUiStep(draft),
    capabilities: validateCapabilitiesStep(draft),
    workflow: validateWorkflowStep(draft),
    permissions: validatePermissionsStep(draft),
    markets: validateMarketsStep(draft),
    commerce: validateCommerceStep(draft),
    security: validateSecurityStep(draft),
    testing: testsPassed,
  };
}

export function canPublishPlatform(
  stepValidation: PlatformStepValidationState,
  draft: PlatformDraft,
): boolean {
  const allSteps = Object.values(stepValidation).every(Boolean);
  const consents =
    draft.publishConsents.rights &&
    draft.publishConsents.permissions &&
    draft.publishConsents.policy &&
    draft.publishConsents.tested;
  return allSteps && consents;
}

export function platformStepKeyForId(
  step: number,
): keyof PlatformStepValidationState | null {
  const map: Record<number, keyof PlatformStepValidationState> = {
    1: "identity",
    2: "organization",
    3: "product",
    4: "architecture",
    5: "data",
    6: "ui",
    7: "capabilities",
    8: "workflow",
    9: "permissions",
    10: "markets",
    11: "commerce",
    12: "security",
    13: "testing",
    14: "testing",
  };
  return map[step] ?? null;
}
