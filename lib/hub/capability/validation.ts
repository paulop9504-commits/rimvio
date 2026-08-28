import type { CapabilityDraft, StepValidationState } from "@/lib/hub/capability/types";

const CAPABILITY_ID_RE = /^[a-z][a-z0-9._-]*$/;

export function validateCapabilityId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) {
    return "Capability ID is required.";
  }
  if (!CAPABILITY_ID_RE.test(trimmed)) {
    return "Use lowercase dot-separated naming (a-z, 0-9, ., _, -).";
  }
  if (trimmed === "reserved.system") {
    return "This ID is already taken.";
  }
  return null;
}

export function validatePackageStep(draft: CapabilityDraft): {
  valid: boolean;
  errors: Record<string, string>;
  hints: string[];
} {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) {
    errors.name = "This field is required.";
  } else if (draft.name.length > 50) {
    errors.name = "Name must be 50 characters or fewer.";
  }
  const idError = validateCapabilityId(draft.id);
  if (idError) {
    errors.id = idError;
  }
  if (!draft.description.trim()) {
    errors.description = "This field is required.";
  } else if (draft.description.length > 200) {
    errors.description = "Description must be 200 characters or fewer.";
  }
  const hints: string[] = [];
  if (draft.name.trim()) hints.push("Name valid");
  if (!idError) hints.push("Capability ID available");
  if (draft.description.trim() && draft.description.length <= 200) {
    hints.push("Description valid");
  }
  if (draft.iconDataUrl) hints.push("Icon uploaded");
  return { valid: Object.keys(errors).length === 0, errors, hints };
}

export function validateManifestJson(json: string): {
  valid: boolean;
  error: string | null;
  line?: number;
} {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed.name || !parsed.version || !parsed.runtime) {
      return { valid: false, error: "Missing required field: name, version, or runtime." };
    }
    const runtime = parsed.runtime as { type?: string };
    const allowed = ["pc-agent", "cloud-agent", "remote-agent", "mobile-agent", "api-tool"];
    if (!runtime.type || !allowed.includes(runtime.type)) {
      return { valid: false, error: `Unsupported runtime type "${runtime.type ?? ""}".` };
    }
    return { valid: true, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    const lineMatch = message.match(/position (\d+)/);
    return { valid: false, error: message, line: lineMatch ? 1 : undefined };
  }
}

export function validateManifestStep(draft: CapabilityDraft): boolean {
  return validateManifestJson(draft.manifestJson).valid && draft.actions.length > 0;
}

export function validatePermissionsStep(draft: CapabilityDraft): boolean {
  return draft.permissions.some((p) => p.enabled);
}

export function validateContextStep(draft: CapabilityDraft): boolean {
  return (
    draft.selectedContext.length > 0 &&
    isValidJson(draft.inputSchemaJson) &&
    isValidJson(draft.outputSchemaJson)
  );
}

function isValidJson(raw: string): boolean {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

export function computeStepValidation(
  draft: CapabilityDraft,
  testsPassed: boolean,
): StepValidationState {
  return {
    package: validatePackageStep(draft).valid,
    manifest: validateManifestStep(draft),
    permissions: validatePermissionsStep(draft),
    context: validateContextStep(draft),
    test: testsPassed,
  };
}

export function canPublish(
  stepValidation: StepValidationState,
  draft: CapabilityDraft,
): boolean {
  const allSteps =
    stepValidation.package &&
    stepValidation.manifest &&
    stepValidation.permissions &&
    stepValidation.context &&
    stepValidation.test;
  const consents =
    draft.publishConsents.rights &&
    draft.publishConsents.permissions &&
    draft.publishConsents.policy &&
    draft.publishConsents.tested;
  return allSteps && consents;
}

export function computeSecurityImpact(
  draft: CapabilityDraft,
): "low" | "medium" | "high" | "critical" {
  const enabled = draft.permissions.filter((p) => p.enabled);
  if (enabled.some((p) => p.risk === "critical")) return "critical";
  if (enabled.some((p) => p.risk === "high")) return "high";
  if (enabled.some((p) => p.risk === "medium")) return "medium";
  return "low";
}
