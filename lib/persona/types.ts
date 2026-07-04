/** Persona learning — Declared / Inferred / Observed (projection only). */

export const PERSONA_INFERENCE_STORAGE_KEY = "rimvio.persona-inference.v1" as const;
export const PERSONA_PENDING_LEARN_STORAGE_KEY =
  "rimvio.persona-pending-learn.v1" as const;

export const PERSONA_INFERENCE_UPDATED = "rimvio-persona-inference-updated";
export const PERSONA_PENDING_LEARN_UPDATED = "rimvio-persona-pending-learn-updated";

export type PersonaAxisId =
  | "travel.pace"
  | "travel.time_vs_cost"
  | "travel.companion_mode"
  | "travel.content_intent"
  | "travel.food_bias"
  | "travel.mobility_style"
  | "travel.budget_band"
  | "travel.lodging_priority"
  | "travel.decision_confidence"
  | "travel.local_vs_landmark"
  | "decision.time_vs_cost"
  | "generic.preference";

export type PersonaSignalSource = "persona_quiz" | "priority_strip" | "manual";

export type PersonaSignal = {
  id: string;
  axisId: PersonaAxisId;
  value: string;
  labelKo: string;
  source: PersonaSignalSource;
  eventId?: string | null;
  atIso: string;
};

export type PersonaLearnChoice = {
  id: string;
  labelKo: string;
  value: string;
};

export type PersonaPendingLearn = {
  id: string;
  axisId: PersonaAxisId;
  titleKo: string;
  choices: readonly PersonaLearnChoice[];
  eventId?: string | null;
  /** protect stays until answered; help/learn may auto-collapse */
  kind: "help" | "learn" | "protect";
  autoExpand?: boolean;
  createdAtIso: string;
};
