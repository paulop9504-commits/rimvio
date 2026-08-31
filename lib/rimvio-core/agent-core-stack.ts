/**
 * Rimvio Core stack — maps product layers to repo wire (ADR-062).
 */

export const RIMVIO_CORE_STACK = {
  agentLoop: {
    label: "Agent Loop",
    owner: "Rimvio Core",
    wire: [
      "lib/workstream/rimvio-agent-spine.ts",
      "lib/context-run/workspace-agent-loop.ts",
      "lib/context-run/run-workspace-agent-plan.ts",
    ],
  },
  planner: {
    label: "Planner / Reasoner",
    owner: "Rimvio Core",
    wire: [
      "lib/context-run/compile-workspace-agent-plan.ts",
      "lib/context-run/object-discovery.ts",
      "lib/workstream/build-context-task-graph.ts",
    ],
  },
  state: {
    label: "Task State Manager",
    owner: "Rimvio Core",
    wire: [
      "lib/rimvio-core/task-state.ts",
      "lib/workstream/agent-execution-session.ts",
      "lib/workstream/build-agent-execution-state.ts",
    ],
  },
  policy: {
    label: "Permission / Policy",
    owner: "Rimvio Core",
    wire: [
      "lib/agent-policy/",
      "lib/platform-sdk/permissions.ts",
    ],
  },
  toolRegistry: {
    label: "Tool Registry (scoped)",
    owner: "Rimvio Core",
    wire: [
      "lib/tool-registry/",
      "lib/action-registry/",
    ],
  },
  capabilityRegistry: {
    label: "Capability Registry",
    owner: "Rimvio Core + Hub",
    wire: ["lib/platform-sdk/capability-index.ts"],
  },
  runtimeRouter: {
    label: "Runtime Router",
    owner: "Rimvio Core",
    wire: ["lib/rimvio-core/runtime-router.ts"],
  },
  runtimeProtocol: {
    label: "Runtime Protocol",
    owner: "Rimvio Standard · Dev implements",
    wire: [
      "lib/rimvio-core/runtime-protocol.ts",
      "lib/hub/dev/runtime-registry.ts",
    ],
  },
  hubStores: {
    label: "Hub Stores",
    owner: "Rimvio Hub · Dev publishes",
    wire: [
      "lib/platform-sdk/capability-index.ts",
      "lib/hub/dev/runtime-registry.ts",
      "lib/hub/dev/infrastructure-registry.ts",
      "lib/hub/dev/adapter-registry.ts",
    ],
  },
  checkpoint: {
    label: "Checkpoint / Recovery",
    owner: "Rimvio Core",
    wire: ["lib/rimvio-core/task-state.ts (checkpoints field)", "roadmap"],
  },
} as const;

export type RimvioCoreLayer = keyof typeof RIMVIO_CORE_STACK;
