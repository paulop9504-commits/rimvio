/**
 * Execution Space — hypothesis vs confirmed resolution.
 * Globe AI designs the stage; it must NOT confirm space the user has not stated.
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md § Execution Space
 */

export const EXECUTION_SPACE_RESOLUTIONS = [
  "confirmed",
  "hypothesis",
  "unresolved",
] as const;

export type ExecutionSpaceResolution =
  (typeof EXECUTION_SPACE_RESOLUTIONS)[number];

export const EXECUTION_SPACE_SLOT_ROLES = [
  "destination",
  "meetup_place",
  "provider_site",
  "stay_area",
  "activity_hub",
  "custom",
] as const;

export type ExecutionSpaceSlotRole =
  (typeof EXECUTION_SPACE_SLOT_ROLES)[number];

/** Candidate geography — hypothesis until user confirms. */
export type ExecutionSpaceCandidate = {
  readonly id: string;
  readonly label: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly countryCode?: string | null;
  readonly confidence?: number | null;
  readonly reasonKo?: string | null;
};

/**
 * Unresolved or multi-candidate spatial slot.
 * e.g. destination: unresolved · candidates Osaka · Tokyo · Fukuoka
 */
export type ExecutionSpaceSlot = {
  readonly slotId: string;
  readonly role: ExecutionSpaceSlotRole;
  readonly label: string;
  readonly resolution: ExecutionSpaceResolution;
  readonly selectedCandidateId?: string | null;
  readonly candidates: readonly ExecutionSpaceCandidate[];
};

export function isExecutionSpaceSlotResolved(
  slot: ExecutionSpaceSlot,
): boolean {
  return (
    slot.resolution === "confirmed" &&
    Boolean(slot.selectedCandidateId?.trim())
  );
}

export function readSelectedExecutionSpaceCandidate(
  slot: ExecutionSpaceSlot,
): ExecutionSpaceCandidate | null {
  const selectedId = slot.selectedCandidateId?.trim();
  if (!selectedId) {
    return null;
  }
  return slot.candidates.find((row) => row.id === selectedId) ?? null;
}

/** L1 guard — never mark confirmed without explicit user-stated selection. */
export function assertExecutionSpaceSlotConfirmation(input: {
  slot: ExecutionSpaceSlot;
  source: "user_stated" | "inferred" | "truth";
}): void {
  if (input.slot.resolution !== "confirmed") {
    return;
  }
  if (input.source !== "user_stated" && input.source !== "truth") {
    throw new Error(
      `[ExecutionSpace] slot ${input.slot.slotId} cannot be confirmed from ${input.source}`,
    );
  }
  if (!input.slot.selectedCandidateId?.trim()) {
    throw new Error(
      `[ExecutionSpace] confirmed slot ${input.slot.slotId} requires selectedCandidateId`,
    );
  }
}

export type ComposeExecutionSpaceSlotInput = {
  slotId: string;
  role: ExecutionSpaceSlotRole;
  label: string;
  resolution?: ExecutionSpaceResolution;
  selectedCandidateId?: string | null;
  candidates?: readonly ExecutionSpaceCandidate[];
};

export function composeExecutionSpaceSlot(
  input: ComposeExecutionSpaceSlotInput,
): ExecutionSpaceSlot {
  const resolution = input.resolution ?? "unresolved";
  const candidates = [...(input.candidates ?? [])];
  if (resolution === "confirmed") {
    assertExecutionSpaceSlotConfirmation({
      slot: {
        slotId: input.slotId,
        role: input.role,
        label: input.label,
        resolution,
        selectedCandidateId: input.selectedCandidateId ?? null,
        candidates,
      },
      source: "user_stated",
    });
  }
  return {
    slotId: input.slotId,
    role: input.role,
    label: input.label,
    resolution,
    selectedCandidateId: input.selectedCandidateId ?? null,
    candidates,
  };
}
