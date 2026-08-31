/**
 * Rimvio Platform permission model — SSOT for manifest + runtime gate.
 * docs/RIMVIO_PLATFORM_SDK_SPEC.md §8
 */

export const FORBIDDEN_PLATFORM_PERMISSIONS = [
  "credential.extract",
  "truth_log.append",
  "bypass_sandbox",
  "cross_tenant.data.read",
  "auto_reality_commit",
  "event_store_write",
  "direct_execution_enqueue",
] as const;

export type ForbiddenPlatformPermission = (typeof FORBIDDEN_PLATFORM_PERMISSIONS)[number];

export type PlatformPermissionClass =
  | "browser"
  | "account"
  | "context"
  | "data"
  | "network"
  | "storage"
  | "compose";

export type PlatformPermissionRisk = "low" | "medium" | "high" | "critical";

export type PlatformPermissionDefinition = {
  readonly id: string;
  readonly class: PlatformPermissionClass;
  readonly label: string;
  readonly description: string;
  readonly risk: PlatformPermissionRisk;
  readonly whyNeededHint: string;
};

/** Seed catalog — Hub Permissions step extends this set. */
export const PLATFORM_PERMISSION_CATALOG: readonly PlatformPermissionDefinition[] = [
  {
    id: "browser.read",
    class: "browser",
    label: "browser.read",
    description: "Read browser content and page state.",
    risk: "low",
    whyNeededHint: "Product search and page inspection",
  },
  {
    id: "browser.write",
    class: "browser",
    label: "browser.write",
    description: "Fill forms, click buttons, manipulate page content.",
    risk: "medium",
    whyNeededHint: "Cart and checkout automation",
  },
  {
    id: "location.read",
    class: "context",
    label: "location.read",
    description: "Read user location from Rimvio Context.",
    risk: "medium",
    whyNeededHint: "Nearby search and geo filters",
  },
  {
    id: "user.preferences.read",
    class: "context",
    label: "user.preferences.read",
    description: "Read preference graph slices.",
    risk: "low",
    whyNeededHint: "Personalized defaults",
  },
  {
    id: "data.listings.read",
    class: "data",
    label: "data.listings.read",
    description: "Read listings collection for this platform tenant.",
    risk: "low",
    whyNeededHint: "Marketplace browse",
  },
  {
    id: "data.listings.write",
    class: "data",
    label: "data.listings.write",
    description: "Create and update own listing rows.",
    risk: "medium",
    whyNeededHint: "Seller publish flow",
  },
  {
    id: "network.outbound",
    class: "network",
    label: "network.outbound",
    description: "Outbound HTTP to declared domains.",
    risk: "medium",
    whyNeededHint: "External vendor APIs",
  },
  {
    id: "storage.upload",
    class: "storage",
    label: "storage.upload",
    description: "Upload images and files to tenant-scoped storage.",
    risk: "low",
    whyNeededHint: "Product photos",
  },
  {
    id: "compose.platform.payments",
    class: "compose",
    label: "compose.platform.payments",
    description: "Invoke imported payment platform capabilities.",
    risk: "high",
    whyNeededHint: "Checkout with payment platform",
  },
  {
    id: "coupang.account",
    class: "account",
    label: "coupang.account",
    description: "Access scoped Coupang account session.",
    risk: "high",
    whyNeededHint: "Purchase on behalf of user",
  },
] as const;

export function isForbiddenPlatformPermission(id: string): boolean {
  return (FORBIDDEN_PLATFORM_PERMISSIONS as readonly string[]).includes(id);
}

export function classifyPlatformPermission(id: string): PlatformPermissionClass {
  const entry = PLATFORM_PERMISSION_CATALOG.find((p) => p.id === id);
  if (entry) return entry.class;
  if (id.startsWith("data.")) return "data";
  if (id.startsWith("network.")) return "network";
  if (id.startsWith("compose.")) return "compose";
  if (id.startsWith("storage.")) return "storage";
  if (id.includes("account")) return "account";
  if (id.startsWith("browser.")) return "browser";
  return "context";
}

export function computePlatformSecurityImpact(
  enabledPermissionIds: readonly string[],
): PlatformPermissionRisk {
  let max: PlatformPermissionRisk = "low";
  const rank: Record<PlatformPermissionRisk, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  for (const id of enabledPermissionIds) {
    const def = PLATFORM_PERMISSION_CATALOG.find((p) => p.id === id);
    const risk = def?.risk ?? (classifyPlatformPermission(id) === "account" ? "high" : "medium");
    if (rank[risk] > rank[max]) max = risk;
  }
  return max;
}
