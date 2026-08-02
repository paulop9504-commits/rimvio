/**
 * registerAction / list / invoke — Callout Action Registry SSOT.
 */

import type { RimvioObject, RimvioObjectType } from "@/lib/callout/types";
import type {
  CalloutActionButton,
  CalloutActionContext,
  RegisterCalloutActionInput,
  RegisteredCalloutAction,
} from "@/lib/callout/action-registry/types";

const registry: RegisteredCalloutAction[] = [];

function keyOf(objectType: string, action: string): string {
  return `${objectType}:${action}`;
}

/**
 * Register an action for an object type.
 * Callout never hard-codes buttons — it reads this registry.
 */
export function registerAction(
  input: RegisterCalloutActionInput,
): RegisteredCalloutAction {
  const id = keyOf(input.objectType, input.action);
  const entry: RegisteredCalloutAction = {
    ...input,
    id,
    order: input.order ?? 100,
    primary: input.primary ?? false,
  };
  const idx = registry.findIndex((e) => e.id === id);
  if (idx >= 0) {
    registry[idx] = entry;
  } else {
    registry.push(entry);
  }
  return entry;
}

export function listRegisteredActions(
  objectType: RimvioObjectType,
): readonly RegisteredCalloutAction[] {
  return registry
    .filter((e) => e.objectType === objectType || e.objectType === "*")
    .slice()
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function getRegisteredAction(
  objectType: RimvioObjectType,
  action: string,
): RegisteredCalloutAction | null {
  return (
    registry.find(
      (e) => e.objectType === objectType && e.action === action,
    ) ??
    registry.find((e) => e.objectType === "*" && e.action === action) ??
    null
  );
}

/** Build Callout buttons from registry for this object. */
export function resolveCalloutActionButtons(
  object: RimvioObject,
): readonly CalloutActionButton[] {
  return listRegisteredActions(object.type).map((entry) => ({
    id: entry.id,
    action: entry.action,
    labelKo: entry.labelKo,
    enabled: entry.isEnabled ? entry.isEnabled(object) : true,
    primary: Boolean(entry.primary),
    objectType: entry.objectType,
  }));
}

/** Run registry handler — Callout UI only dispatches action id. */
export async function invokeRegisteredAction(
  action: string,
  ctx: CalloutActionContext,
): Promise<boolean> {
  const entry = getRegisteredAction(ctx.objectType, action);
  if (!entry) return false;
  if (entry.isEnabled && !entry.isEnabled(ctx.object)) return false;
  await entry.handler(ctx);
  return true;
}

/** Test helper */
export function resetCalloutActionRegistryForTests(): void {
  registry.length = 0;
}

export function listAllRegisteredActionsForTests(): readonly RegisteredCalloutAction[] {
  return [...registry];
}
