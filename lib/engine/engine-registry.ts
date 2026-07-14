import { RIMVIO_FIRST_PARTY_ENGINE_PACKAGES } from "@/lib/engine/packages";
import type { RimvioEnginePackage } from "@/lib/engine/engine-package";
import type {
  RimvioEngineDefinition,
  RimvioEngineId,
  RimvioEnginePlan,
  RimvioEngineRunState,
  RimvioEngineTurnInput,
} from "@/lib/engine/engine-types";
import { readContextInstalledEngineIds } from "@/lib/engine/resolve-context-installed-engines";
import { resolveScheduledEngineIdFromEvent } from "@/lib/context-execution/resolve-scheduled-engine-from-plan";
import { resolvePlanStepHandoffOffer } from "@/lib/context-execution/build-plan-step-handoff";
import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

const RIMVIO_ENGINE_PACKAGES: readonly RimvioEnginePackage[] = [
  ...RIMVIO_FIRST_PARTY_ENGINE_PACKAGES,
].sort((left, right) => left.priority - right.priority);

const RIMVIO_ENGINE_DEFINITIONS: readonly RimvioEngineDefinition[] =
  RIMVIO_ENGINE_PACKAGES;

function activePackagesForContext(input: {
  event?: EventCandidate | null;
  blueprint?: ContextBlueprint | null;
}): readonly RimvioEnginePackage[] {
  const installed = new Set(
    readContextInstalledEngineIds({
      event: input.event,
      blueprint: input.blueprint,
    }),
  );
  return RIMVIO_ENGINE_PACKAGES.filter((pkg) => installed.has(pkg.id));
}

export function listRimvioEnginePackages(): readonly RimvioEnginePackage[] {
  return RIMVIO_ENGINE_PACKAGES;
}

export function getRimvioEnginePackageById(
  engineId: RimvioEngineId,
): RimvioEnginePackage | null {
  return RIMVIO_ENGINE_PACKAGES.find((row) => row.id === engineId) ?? null;
}

export function readRimvioEngineRunState(input: {
  engineId: RimvioEngineId;
  event: RimvioEngineTurnInput["event"];
}): RimvioEngineRunState {
  const engine = getRimvioEnginePackageById(input.engineId);
  if (!engine) {
    return "idle";
  }
  return engine.readState(input.event);
}

export function listRimvioEngines(): readonly RimvioEngineDefinition[] {
  return RIMVIO_ENGINE_DEFINITIONS;
}

export function getRimvioEngineById(
  engineId: RimvioEngineId,
): RimvioEngineDefinition | null {
  return getRimvioEnginePackageById(engineId);
}

/** All installed engines whose detector matches the message (priority order). */
export function detectRimvioEnginesForMessage(
  message: string,
  context?: {
    event?: EventCandidate | null;
    blueprint?: ContextBlueprint | null;
  },
): readonly RimvioEngineDefinition[] {
  const trimmed = message.trim();
  if (!trimmed) {
    return [];
  }
  return activePackagesForContext(context ?? {}).filter((engine) =>
    engine.detect(trimmed),
  );
}

function tryEnginePlan(
  engine: RimvioEnginePackage,
  input: RimvioEngineTurnInput & { blueprint?: ContextBlueprint | null },
  message: string,
): RimvioEnginePlan | null {
  if (!engine.detect(message)) {
    return null;
  }
  return engine.plan({ ...input, message });
}

/**
 * First matching installed engine plan.
 * Prefer Execution Plan scheduled Engine (active running step) when it detects
 * the utterance; otherwise priority order. Soft continue ("다음" 등) uses
 * handoff seed so Plan can schedule without a fresh domain phrase.
 */
export function planRimvioEngineTurn(
  input: RimvioEngineTurnInput & {
    blueprint?: ContextBlueprint | null;
    /** Explicit schedule override (tests / Operator). */
    scheduledEngineId?: RimvioEngineId | null;
  },
): RimvioEnginePlan | null {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const packages = activePackagesForContext({
    event: input.event,
    blueprint: input.blueprint,
  });
  const scheduledId =
    input.scheduledEngineId ?? resolveScheduledEngineIdFromEvent(input.event);

  if (scheduledId) {
    const scheduled = packages.find((pkg) => pkg.id === scheduledId);
    if (scheduled) {
      const direct = tryEnginePlan(scheduled, input, message);
      if (direct) {
        return direct;
      }

      const otherMatch = packages.some(
        (pkg) => pkg.id !== scheduledId && pkg.detect(message),
      );
      if (!otherMatch) {
        const planMeta = readContextExecutionPlanFromEvent(input.event ?? null);
        const handoff = planMeta ? resolvePlanStepHandoffOffer(planMeta) : null;
        const seed =
          handoff?.engineId === scheduledId
            ? handoff.seedUtterance.trim()
            : "";
        if (seed) {
          const viaSeed = tryEnginePlan(scheduled, input, seed);
          if (viaSeed) {
            return viaSeed;
          }
        }
      }
    }
  }

  for (const engine of packages) {
    if (scheduledId && engine.id === scheduledId) {
      continue;
    }
    const plan = tryEnginePlan(engine, input, message);
    if (plan) {
      return plan;
    }
  }

  return null;
}
