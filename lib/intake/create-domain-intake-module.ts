import { buildIntakeSnapshot } from "@/lib/intake/build-intake-snapshot";
import type {
  DomainIntakeModule,
  DomainIntakeSnapshot,
  IntakeContext,
  SlotDefinition,
} from "@/lib/intake/types";

export function createDomainIntakeModule<TState, TGap extends string>(input: {
  domainId: string;
  priority: number;
  toastMessageKo: string;
  slotDefs: readonly SlotDefinition<TState, TGap>[];
  readState: (ctx: IntakeContext) => TState;
  shouldOpen: (ctx: IntakeContext) => boolean;
}): DomainIntakeModule<TState, TGap> {
  const buildSnapshot = (ctx: IntakeContext): DomainIntakeSnapshot<TState, TGap> =>
    buildIntakeSnapshot({
      domainId: input.domainId,
      state: input.readState(ctx),
      slotDefs: input.slotDefs,
    });

  return {
    domainId: input.domainId,
    priority: input.priority,
    toastMessageKo: input.toastMessageKo,
    slotDefs: input.slotDefs,
    readState: input.readState,
    shouldOpen: input.shouldOpen,
    buildSnapshot,
  };
}
