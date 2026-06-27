import type { LinkActionItem } from "@/types/database";

/** L0 containers — orchestrator gate result (no action-chat import). */
export type ContainerOrchestratorGateResult = {
  summary: string;
  actions: LinkActionItem[];
  source: "conversation";
  confidence: number;
  disclosure: "none";
  actionsRevealed: boolean;
  pendingConfirm: boolean;
  metadata: {
    intent: "ACTION";
    trust_level_adjustment: "NONE";
  };
};

/** Persist hook — minimal orchestrator result slice. */
export type OrchestratorResultPersistWire = {
  summary?: string;
  source?: string;
  actions: readonly unknown[];
};
