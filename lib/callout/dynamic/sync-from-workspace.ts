/**
 * Sync Dynamic Callouts from Workspace mutation results.
 * Builds live DynamicCalloutSchema[]; windows open only when openWindows=true.
 */

import { buildDynamicCallout } from "@/lib/callout/dynamic/runtime";
import { buildDynamicCalloutInputFromWorkspace } from "@/lib/callout/dynamic/from-workspace";
import type { DynamicCalloutSchema } from "@/lib/callout/dynamic/types";
import {
  findCalloutWindowByEntity,
  openCalloutWindow,
} from "@/lib/callout/windows/store";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

export type SyncCalloutsFromWorkspaceResult = {
  readonly schemas: readonly DynamicCalloutSchema[];
  readonly opened: number;
  readonly refreshed: number;
  readonly calloutCount: number;
};

/**
 * After Workspace Patch / Spatial Discovery — regenerate Callout schemas.
 * Default: schemas only (no floating steal). Pass openWindows to raise OS windows.
 */
export function syncCalloutsFromWorkspace(input: {
  readonly contextEventId: string;
  readonly entityIds?: readonly string[] | null;
  readonly maxWindows?: number;
  readonly openWindows?: boolean;
}): SyncCalloutsFromWorkspaceResult {
  const contextEventId = input.contextEventId.trim();
  const state = readContextWorkspace(contextEventId);
  if (!state) {
    return { schemas: [], opened: 0, refreshed: 0, calloutCount: 0 };
  }

  const openWindows = input.openWindows === true;
  const max = input.maxWindows ?? 3;
  let ids = (input.entityIds ?? []).map((id) => id.trim()).filter(Boolean);

  if (ids.length === 0) {
    const selected = state.selectedIds[0];
    const visible = state.nodes.filter((n) => n.visible);
    if (selected) {
      ids = [
        selected,
        ...visible
          .filter((n) => n.id !== selected)
          .slice(0, max - 1)
          .map((n) => n.id),
      ];
    } else {
      ids = visible.slice(0, max).map((n) => n.id);
    }
  }

  ids = [...new Set(ids)].slice(0, max);
  const schemas: DynamicCalloutSchema[] = [];
  let opened = 0;
  let refreshed = 0;

  for (const entityId of ids) {
    const dynInput = buildDynamicCalloutInputFromWorkspace({
      state,
      entityId,
    });
    if (!dynInput) continue;
    const schema = buildDynamicCallout(dynInput);
    schemas.push(schema);

    if (!openWindows) continue;

    const existing = findCalloutWindowByEntity(entityId);
    if (existing) {
      refreshed += 1;
    } else {
      openCalloutWindow({ entityId, mode: "floating" });
      opened += 1;
    }
  }

  return {
    schemas,
    opened,
    refreshed,
    calloutCount: schemas.length,
  };
}
