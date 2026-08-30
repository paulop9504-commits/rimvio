/**
 * Dev Agent definition of done — task complete ≠ code written.
 */

import type { DefinitionOfDoneChecklist, DevTaskKind } from "@/lib/hub/dev/dev-agent-os/types";

export const DEFINITION_OF_DONE_KEYS: readonly (keyof DefinitionOfDoneChecklist)[] = [
  "intentUnderstood",
  "platformIdentified",
  "loopIdentifiedOrCreated",
  "capabilityIdentifiedOrCreated",
  "implementationCompleted",
  "uiCompleted",
  "stateConnected",
  "integrationsConnected",
  "userFlowTested",
  "errorsChecked",
  "existingBehaviorPreserved",
  "deploymentCompleted",
  "resultVerified",
];

/** Minimum checks by task kind — deploy adds deployment + monitor. */
export function requiredDoneChecks(taskKind: DevTaskKind, deployRequested: boolean): readonly (keyof DefinitionOfDoneChecklist)[] {
  const base: (keyof DefinitionOfDoneChecklist)[] = [
    "intentUnderstood",
    "errorsChecked",
    "existingBehaviorPreserved",
    "resultVerified",
  ];

  switch (taskKind) {
    case "create":
      return [
        ...base,
        "platformIdentified",
        "loopIdentifiedOrCreated",
        "capabilityIdentifiedOrCreated",
        "implementationCompleted",
        "uiCompleted",
        "stateConnected",
        "integrationsConnected",
        "userFlowTested",
        ...(deployRequested ? (["deploymentCompleted"] as const) : []),
      ];
    case "modify":
    case "remove":
      return [
        ...base,
        "platformIdentified",
        "capabilityIdentifiedOrCreated",
        "implementationCompleted",
        "stateConnected",
        "userFlowTested",
        ...(deployRequested ? (["deploymentCompleted"] as const) : []),
      ];
    case "debug":
      return [...base, "userFlowTested", "resultVerified"];
    case "connect":
      return [...base, "integrationsConnected", "userFlowTested"];
    case "test":
      return [...base, "userFlowTested"];
    case "deploy":
      return [...base, "deploymentCompleted", "resultVerified"];
    case "plan":
      return ["intentUnderstood", "resultVerified"];
    default: {
      const _exhaustive: never = taskKind;
      return _exhaustive;
    }
  }
}

export function isDefinitionOfDoneComplete(
  checklist: DefinitionOfDoneChecklist,
  taskKind: DevTaskKind,
  deployRequested = false,
): boolean {
  return requiredDoneChecks(taskKind, deployRequested).every((key) => checklist[key]);
}

export function emptyDefinitionOfDone(): DefinitionOfDoneChecklist {
  return {
    intentUnderstood: false,
    platformIdentified: false,
    loopIdentifiedOrCreated: false,
    capabilityIdentifiedOrCreated: false,
    implementationCompleted: false,
    uiCompleted: false,
    stateConnected: false,
    integrationsConnected: false,
    userFlowTested: false,
    errorsChecked: false,
    existingBehaviorPreserved: false,
    deploymentCompleted: false,
    resultVerified: false,
  };
}

/** Primary rule as final gate question. */
export const DEV_AGENT_SUCCESS_QUESTION =
  "If the user performed this action right now, would Rimvio actually do what they expect?";
