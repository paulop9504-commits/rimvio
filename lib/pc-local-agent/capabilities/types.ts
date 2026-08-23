export type CapabilityTier = "builtin" | "installable" | "sensitive";

export type CapabilityInstallKind =
  | "bundled"
  | "npm_module"
  | "browser_extension";

export type CapabilityDefinition = {
  id: string;
  name: string;
  description: string;
  version: string;
  tier: CapabilityTier;
  provides: string[];
  requires: string[];
  installKind: CapabilityInstallKind;
  permissions: string[];
  /** npm package name when installKind is npm_module */
  npmPackage?: string;
};

export type InstalledCapability = {
  id: string;
  device_id: string;
  capability_id: string;
  version: string;
  status: "installed" | "failed" | "revoked";
  installed_at: string;
  metadata: Record<string, unknown>;
};

export type CapabilityRequestStatus = "pending" | "approved" | "cancelled" | "completed";

export type CapabilityRequest = {
  id: string;
  user_id: string;
  device_id: string;
  task_id: string;
  required_capabilities: string[];
  reason: string;
  status: CapabilityRequestStatus;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
};

export type InstallJobStatus = "queued" | "running" | "completed" | "failed";

export type InstallJob = {
  id: string;
  request_id: string;
  device_id: string;
  capability_id: string;
  status: InstallJobStatus;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress_pct: number;
};

export type CapabilityGapResult = {
  ready: boolean;
  missing: string[];
  definitions: CapabilityDefinition[];
};

/** Built-in capabilities seeded on every paired device. */
export const BUILTIN_CAPABILITY_IDS = ["browser.basic"] as const;

/** Demo installable capability for Phase B+C E2E. */
export const DEMO_CAPABILITY_ID = "demo.module";

/** PDF capability for Phase D npm module install. */
export const PDF_CAPABILITY_ID = "file.pdf";
