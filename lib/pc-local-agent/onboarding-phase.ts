export const PC_ONBOARDING_PHASES = [
  "INSTALL",
  "AGENT_STARTING",
  "AGENT_ONLINE",
  "PAIRING_REQUIRED",
  "PAIRING",
  "CONNECTED",
] as const;

export type PcOnboardingPhase = (typeof PC_ONBOARDING_PHASES)[number];

export type LocalAgentHealth = {
  ok: boolean;
  paired: boolean;
  phase?: "starting" | "online" | "pairing_required" | "connected";
  displayCode?: string | null;
};

export function derivePcOnboardingPhase(input: {
  setupDownloaded: boolean;
  health: LocalAgentHealth | null;
  pairingRequested: boolean;
  pairingBusy: boolean;
  connectedThisSession: boolean;
  /** Phone / other device: a NEW cloud device appeared after this flow started. */
  newCloudDeviceAfterStart: boolean;
  /** Local agent is up but not paired — never treat an older PC as this session. */
  localUnpaired: boolean;
}): PcOnboardingPhase {
  if (input.connectedThisSession) {
    return "CONNECTED";
  }
  if (input.pairingBusy) {
    return "PAIRING";
  }
  if (input.health?.paired) {
    return "CONNECTED";
  }
  if (!input.localUnpaired && input.newCloudDeviceAfterStart) {
    return "CONNECTED";
  }
  if (input.health?.ok) {
    if (input.pairingRequested) {
      return "PAIRING";
    }
    if (input.health.phase === "starting") {
      return "AGENT_ONLINE";
    }
    return "PAIRING_REQUIRED";
  }
  if (input.setupDownloaded) {
    return "AGENT_STARTING";
  }
  return "INSTALL";
}

export function onboardingChecklist(phase: PcOnboardingPhase): {
  id: "prepare" | "install" | "find" | "account" | "done";
  done: boolean;
  current: boolean;
}[] {
  return [
    { id: "prepare", done: true, current: false },
    {
      id: "install",
      done: phase !== "INSTALL",
      current: phase === "INSTALL",
    },
    {
      id: "find",
      done:
        phase === "AGENT_ONLINE" ||
        phase === "PAIRING_REQUIRED" ||
        phase === "PAIRING" ||
        phase === "CONNECTED",
      current: phase === "AGENT_STARTING",
    },
    {
      id: "account",
      done: phase === "CONNECTED",
      current:
        phase === "AGENT_ONLINE" ||
        phase === "PAIRING_REQUIRED" ||
        phase === "PAIRING",
    },
    {
      id: "done",
      done: phase === "CONNECTED",
      current: false,
    },
  ];
}
