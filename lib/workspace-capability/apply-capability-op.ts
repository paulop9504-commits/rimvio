/**
 * Apply Capability Object ops — Open / Close / Resize / Move / Recipe.
 */

import { getWorkspaceCapability } from "@/lib/workspace-capability/registry";
import { getWorkspaceCapabilityRecipe } from "@/lib/workspace-capability/recipes";
import {
  clearWorkspaceCapabilityLayout,
  readWorkspaceCapabilityLayout,
  writeWorkspaceCapabilityLayout,
} from "@/lib/workspace-capability/layout-store";
import type {
  WorkspaceCapabilityId,
  WorkspaceCapabilityIntentId,
  WorkspaceCapabilityLayout,
  WorkspaceCapabilityLayoutItem,
  WorkspaceCapabilityOp,
  WorkspaceCapabilityRecipe,
} from "@/lib/workspace-capability/types";
import { WORKSPACE_CAPABILITY_IDS } from "@/lib/workspace-capability/types";

function nowIso(): string {
  return new Date().toISOString();
}

function recipeToItems(
  recipe: WorkspaceCapabilityRecipe,
): WorkspaceCapabilityLayoutItem[] {
  const openIds = new Set(recipe.open.map((o) => o.id));
  const fromRecipe = recipe.open.map((o, index) => {
    const def = getWorkspaceCapability(o.id);
    return {
      id: o.id,
      open: true,
      size: o.size ?? def.defaultSize,
      slot: o.slot ?? def.defaultSlot,
      order: o.order ?? index,
    } satisfies WorkspaceCapabilityLayoutItem;
  });
  const closed = WORKSPACE_CAPABILITY_IDS.filter((id) => !openIds.has(id)).map(
    (id, index) => {
      const def = getWorkspaceCapability(id);
      return {
        id,
        open: false,
        size: def.defaultSize,
        slot: def.defaultSlot,
        order: 1000 + index,
      } satisfies WorkspaceCapabilityLayoutItem;
    },
  );
  return [...fromRecipe, ...closed];
}

export function buildLayoutFromRecipe(input: {
  readonly contextEventId: string;
  readonly intentId: WorkspaceCapabilityIntentId;
  readonly focusedDay?: number | null;
}): WorkspaceCapabilityLayout {
  const recipe = getWorkspaceCapabilityRecipe(input.intentId);
  return {
    contextEventId: input.contextEventId.trim(),
    intentId: input.intentId,
    items: recipeToItems(recipe),
    focusedDay: input.focusedDay ?? 1,
    updatedAtIso: nowIso(),
  };
}

function upsertItem(
  items: readonly WorkspaceCapabilityLayoutItem[],
  next: WorkspaceCapabilityLayoutItem,
): WorkspaceCapabilityLayoutItem[] {
  const rest = items.filter((i) => i.id !== next.id);
  return [...rest, next];
}

function requireItem(
  layout: WorkspaceCapabilityLayout,
  id: WorkspaceCapabilityId,
): WorkspaceCapabilityLayoutItem {
  const hit = layout.items.find((i) => i.id === id);
  if (hit) return hit;
  const def = getWorkspaceCapability(id);
  return {
    id,
    open: false,
    size: def.defaultSize,
    slot: def.defaultSlot,
    order: 999,
  };
}

export function applyWorkspaceCapabilityOp(input: {
  readonly contextEventId: string;
  readonly op: WorkspaceCapabilityOp;
}): WorkspaceCapabilityLayout | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) return null;

  if (input.op.type === "clear") {
    clearWorkspaceCapabilityLayout(contextEventId);
    return null;
  }

  let layout =
    readWorkspaceCapabilityLayout(contextEventId) ??
    buildLayoutFromRecipe({
      contextEventId,
      intentId: "generic_map",
    });

  switch (input.op.type) {
    case "apply_recipe": {
      layout = buildLayoutFromRecipe({
        contextEventId,
        intentId: input.op.intentId,
        focusedDay: layout.focusedDay,
      });
      break;
    }
    case "open": {
      const prev = requireItem(layout, input.op.id);
      const def = getWorkspaceCapability(input.op.id);
      layout = {
        ...layout,
        items: upsertItem(layout.items, {
          ...prev,
          open: true,
          size: input.op.size ?? prev.size ?? def.defaultSize,
          slot: input.op.slot ?? prev.slot ?? def.defaultSlot,
        }),
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "close": {
      const prev = requireItem(layout, input.op.id);
      layout = {
        ...layout,
        items: upsertItem(layout.items, { ...prev, open: false }),
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "resize": {
      const prev = requireItem(layout, input.op.id);
      layout = {
        ...layout,
        items: upsertItem(layout.items, {
          ...prev,
          open: true,
          size: input.op.size,
        }),
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "move": {
      const prev = requireItem(layout, input.op.id);
      layout = {
        ...layout,
        items: upsertItem(layout.items, {
          ...prev,
          open: true,
          slot: input.op.slot,
          order: input.op.order ?? prev.order,
        }),
        updatedAtIso: nowIso(),
      };
      break;
    }
    case "set_focused_day": {
      layout = {
        ...layout,
        focusedDay: input.op.day,
        updatedAtIso: nowIso(),
      };
      break;
    }
    default: {
      const _exhaustive: never = input.op;
      void _exhaustive;
      break;
    }
  }

  writeWorkspaceCapabilityLayout(layout);
  return layout;
}

export function isCapabilityOpen(
  layout: WorkspaceCapabilityLayout | null | undefined,
  id: WorkspaceCapabilityId,
): boolean {
  return layout?.items.some((i) => i.id === id && i.open) === true;
}

export function listOpenCapabilities(
  layout: WorkspaceCapabilityLayout | null | undefined,
): readonly WorkspaceCapabilityLayoutItem[] {
  if (!layout) return [];
  return layout.items
    .filter((i) => i.open)
    .slice()
    .sort((a, b) => {
      if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
      return a.order - b.order;
    });
}

export function listOpenInSlot(
  layout: WorkspaceCapabilityLayout | null | undefined,
  slot: WorkspaceCapabilityLayoutItem["slot"],
): readonly WorkspaceCapabilityLayoutItem[] {
  return listOpenCapabilities(layout).filter((i) => i.slot === slot);
}
