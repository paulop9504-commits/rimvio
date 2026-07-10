import { INTAKE_REGISTRY } from "@/lib/intake/intake-registry";
import type { IntakeContext, IntakeOffer } from "@/lib/intake/types";

/** Pick highest-priority intake whose shouldOpen gate passes (trip before lodging). */
export function resolveIntakeOffer(ctx: IntakeContext): IntakeOffer | null {
  for (const module of INTAKE_REGISTRY) {
    if (!module.shouldOpen(ctx)) {
      continue;
    }
    const snapshot = module.buildSnapshot(ctx);
    if (snapshot.complete) {
      continue;
    }
    return {
      domainId: module.domainId,
      priority: module.priority,
      snapshot,
      toastMessageKo: module.toastMessageKo,
    };
  }
  return null;
}

export function buildIntakeContext(input: {
  contextEventId: string;
  message: string;
  event: IntakeContext["event"];
  blueprint?: IntakeContext["blueprint"];
  destinationConfirmed?: boolean;
}): IntakeContext {
  return {
    contextEventId: input.contextEventId.trim(),
    message: input.message.trim(),
    event: input.event,
    blueprint: input.blueprint,
    destinationConfirmed: input.destinationConfirmed,
  };
}
