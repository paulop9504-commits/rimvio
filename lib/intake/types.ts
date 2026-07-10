import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type IntakeContext = {
  readonly contextEventId: string;
  readonly message: string;
  readonly event: EventCandidate | null | undefined;
  readonly blueprint?: ContextBlueprint | null;
  readonly destinationConfirmed?: boolean;
};

export type SlotDefinition<TState, TGap extends string> = {
  readonly id: TGap;
  readonly required: boolean;
  readonly isFilled: (state: TState) => boolean;
  readonly validate?: (state: TState) => boolean;
};

export type DomainIntakeSnapshot<TState, TGap extends string> = {
  readonly domainId: string;
  readonly state: TState;
  readonly gaps: readonly TGap[];
  readonly complete: boolean;
};

export type IntakeOffer<TState = unknown, TGap extends string = string> = {
  readonly domainId: string;
  readonly priority: number;
  readonly snapshot: DomainIntakeSnapshot<TState, TGap>;
  readonly toastMessageKo: string;
};

export type DomainIntakeModule<TState, TGap extends string> = {
  readonly domainId: string;
  readonly priority: number;
  readonly toastMessageKo: string;
  readonly slotDefs: readonly SlotDefinition<TState, TGap>[];
  readState: (ctx: IntakeContext) => TState;
  shouldOpen: (ctx: IntakeContext) => boolean;
  buildSnapshot: (ctx: IntakeContext) => DomainIntakeSnapshot<TState, TGap>;
};
