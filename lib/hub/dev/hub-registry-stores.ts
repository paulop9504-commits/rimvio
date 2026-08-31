/**
 * Rimvio Hub — four registry stores on one standard (ADR-062).
 */

export type HubStoreKind = "capability" | "runtime" | "infrastructure" | "adapter";

export const HUB_STORE_LABELS: Record<HubStoreKind, string> = {
  capability: "Capability Store",
  runtime: "Runtime Store",
  infrastructure: "Infrastructure Store",
  adapter: "Adapter Store",
};

/** Rimvio Core — Dev cannot override these protocols. */
export const RIMVIO_CORE_RUNTIME_STANDARD = {
  version: "1.0",
  protocols: [
    "Permission Model",
    "Context Protocol",
    "Capability Protocol",
    "Runtime API",
    "Security Policy",
    "Verification",
  ],
} as const;
