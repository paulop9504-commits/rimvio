/**
 * Capability Core — thin facade types (Phase 1).
 * Hub published capabilities SSOT remains platform-sdk/capability-index.
 */

export type {
  CapabilityIndexEntry,
  CapabilityIndexPublishResult,
  CapabilityIndexStatus,
  CapabilityLifecycleStatus,
  CapabilitySearchHit,
} from "@/lib/platform-sdk/capability-index";

export type HubCapabilityNamespace =
  | "hub-published"
  | "consumer-catalog"
  | "runtime-stage"
  | "action-os"
  | "hub-dev-tools";

export type HubCapabilitySummary = {
  readonly capabilityId: string;
  readonly label: string;
  readonly description: string;
  readonly status: string;
  readonly approvalRequired: boolean;
  readonly source: "index" | "fixture";
};
