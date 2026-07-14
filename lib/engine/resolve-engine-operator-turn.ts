import {
  getRimvioEngineById,
  planRimvioEngineTurn,
} from "@/lib/engine/engine-registry";
import type { RimvioEngineTurnInput } from "@/lib/engine/engine-types";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";

/**
 * Orchestrator entry — pick Engine → map to Operator fixed tool.
 * Deterministic; no LLM surface selection.
 */
export function resolveEngineOperatorTurn(
  input: RimvioEngineTurnInput & {
    readonly text: string;
    readonly blueprint?: import("@/lib/context-blueprint/types").ContextBlueprint | null;
  },
): OperatorTurnPlan | null {
  const enginePlan = planRimvioEngineTurn({
    message: input.text,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
    expressReady: input.expressReady,
    blueprint: input.blueprint,
  });
  if (!enginePlan) {
    return null;
  }

  const engine = getRimvioEngineById(enginePlan.engineId);
  if (!engine) {
    return null;
  }

  return engine.toOperatorPlan(enginePlan);
}
