import type { HubCapabilityNamespace } from "./types";

/** Documented capability namespaces — do NOT merge IDs across namespaces. */
export const CAPABILITY_NAMESPACE_MAP: Readonly<
  Record<
    HubCapabilityNamespace,
    { module: string; exampleIds: readonly string[]; consumer: string }
  >
> = {
  "hub-published": {
    module: "lib/platform-sdk/capability-index.ts",
    exampleIds: ["hotel.search", "market.search"],
    consumer: "Main Agent discovery · Dev Hub publish",
  },
  "consumer-catalog": {
    module: "lib/capability-registry/",
    exampleIds: ["NAVIGATE", "BOOK_HOTEL"],
    consumer: "Deeplink dispatch · execution plane",
  },
  "runtime-stage": {
    module: "lib/workstream/agent-capability-registry.ts",
    exampleIds: ["booking", "lodging"],
    consumer: "ADR-045 spine stages",
  },
  "action-os": {
    module: "lib/action-registry/",
    exampleIds: ["featureId contracts"],
    consumer: "Prep surface · @ registry",
  },
  "hub-dev-tools": {
    module: "lib/hub/dev/agent-capability-registry.ts",
    exampleIds: ["workspace.inspect"],
    consumer: "Hub agent planner tools",
  },
};
