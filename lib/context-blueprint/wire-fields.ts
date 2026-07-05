/**
 * Shared Blueprint field wires — no sub-contract imports (break cycles).
 */

export type ContextBlueprintPeriod = {
  readonly startIso?: string | null;
  readonly endIso?: string | null;
  readonly timezone?: string | null;
};

export type ContextBlueprintDestination = {
  readonly label: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly countryCode?: string | null;
};

export type ContextBlueprintParticipant = {
  readonly id: string;
  readonly label: string;
  readonly role?: "self" | "companion" | "host" | "provider" | "unknown";
};

export type ContextBlueprintKnownTruth = {
  readonly slotId: string;
  readonly value: unknown;
  readonly source: "truth" | "inferred" | "user_stated";
  readonly confidence?: number | null;
};

export type ContextBlueprintNextQuestion = {
  readonly slotId: string;
  readonly promptKo: string;
  readonly choices?: readonly { id: string; labelKo: string }[];
};

export type ContextBlueprintConstraints = {
  readonly destination: ContextBlueprintDestination | null;
  readonly period: ContextBlueprintPeriod | null;
  readonly participants: readonly ContextBlueprintParticipant[];
  readonly budgetBand?: string | null;
  readonly companionMode?: string | null;
};

/** WHO — Personal Context snapshot ref (TravelBrain · persona). Input to L1 compose. */
export type PersonalContextRef = {
  readonly snapshotId?: string | null;
  readonly travelBrainAtIso?: string | null;
  readonly displayName?: string | null;
};
