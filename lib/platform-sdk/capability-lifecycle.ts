/**
 * Hub Capability lifecycle — Agent Discovery exposes PUBLISHED only.
 * @see ADR-061 · Discovery priority pipeline
 */

export const CAPABILITY_LIFECYCLE_STATUSES = [
  "DRAFT",
  "VALIDATING",
  "TESTING",
  "PUBLISHED",
  "SUSPENDED",
  "DEPRECATED",
] as const;

export type CapabilityLifecycleStatus = (typeof CAPABILITY_LIFECYCLE_STATUSES)[number];

/** Legacy index values (localStorage) — normalized on read. */
export type CapabilityIndexStatusLegacy = "pending-review" | "published";

export type CapabilityIndexStatus = CapabilityLifecycleStatus | CapabilityIndexStatusLegacy;

export function normalizeCapabilityLifecycleStatus(
  status: CapabilityIndexStatus,
): CapabilityLifecycleStatus {
  if (status === "published") return "PUBLISHED";
  if (status === "pending-review") return "VALIDATING";
  return status;
}

/** Agent Discovery + Globe invoke — PUBLISHED capabilities only. */
export function isAgentDiscoverableCapability(status: CapabilityIndexStatus): boolean {
  return normalizeCapabilityLifecycleStatus(status) === "PUBLISHED";
}

export function resolveIndexStatusFromPublishOptions(input: {
  readonly visibility: "private" | "hub" | "public";
  readonly allowAgentAccess: boolean;
}): CapabilityLifecycleStatus {
  if (input.visibility === "private") return "DRAFT";
  if (!input.allowAgentAccess) return "TESTING";
  return "PUBLISHED";
}

export function lifecycleLabelKo(status: CapabilityLifecycleStatus): string {
  switch (status) {
    case "DRAFT":
      return "초안";
    case "VALIDATING":
      return "검증 중";
    case "TESTING":
      return "테스트";
    case "PUBLISHED":
      return "게시됨";
    case "SUSPENDED":
      return "중단";
    case "DEPRECATED":
      return "폐기";
    default:
      return status;
  }
}
