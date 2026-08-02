/**
 * Built-in Callout actions — hotel / restaurant recipes.
 * Extensible via registerAction(); Callout Core stays closed.
 */

import { registerAction } from "@/lib/callout/action-registry/register-action";

let installed = false;

/**
 * Install default Action Registry entries once.
 * hotel: compare · change · prepare_booking
 * restaurant: reserve · add_to_day · navigate
 */
export function ensureBuiltinCalloutActions(): void {
  if (installed) return;
  installed = true;

  // —— hotel ——
  registerAction({
    objectType: "hotel",
    action: "compare",
    labelKo: "비교",
    order: 10,
    handler: ({ objectId, handlers }) => {
      handlers.onCompare?.(objectId);
    },
  });

  registerAction({
    objectType: "hotel",
    action: "change",
    labelKo: "바꾸기",
    order: 20,
    handler: ({ objectId, handlers }) => {
      handlers.onChange?.(objectId);
    },
  });

  registerAction({
    objectType: "hotel",
    action: "prepare_booking",
    labelKo: "예약 준비",
    primary: true,
    order: 30,
    isEnabled: (object) =>
      object.facts.canPrepare || object.facts.selected || true,
    handler: ({ objectId, handlers }) => {
      handlers.onCreatePrepareDraft?.(objectId);
    },
  });

  // —— restaurant ——
  registerAction({
    objectType: "restaurant",
    action: "reserve",
    labelKo: "예약 준비",
    primary: true,
    order: 10,
    handler: ({ objectId, handlers }) => {
      handlers.onCreatePrepareDraft?.(objectId);
    },
  });

  registerAction({
    objectType: "restaurant",
    action: "add_to_day",
    labelKo: "일정에 추가",
    order: 20,
    handler: ({ objectId, handlers }) => {
      handlers.onAddToDay?.(objectId);
    },
  });

  registerAction({
    objectType: "restaurant",
    action: "navigate",
    labelKo: "길찾기",
    order: 30,
    handler: ({ objectId, handlers }) => {
      handlers.onNavigate?.(objectId);
    },
  });

  // —— place (poi / amenity) ——
  registerAction({
    objectType: "place",
    action: "navigate",
    labelKo: "길찾기",
    primary: true,
    order: 10,
    handler: ({ objectId, handlers }) => {
      handlers.onNavigate?.(objectId);
    },
  });

  registerAction({
    objectType: "place",
    action: "add_to_day",
    labelKo: "일정에 추가",
    order: 20,
    handler: ({ objectId, handlers }) => {
      handlers.onAddToDay?.(objectId);
    },
  });

  registerAction({
    objectType: "place",
    action: "compare",
    labelKo: "비교",
    order: 30,
    handler: ({ objectId, handlers }) => {
      handlers.onCompare?.(objectId);
    },
  });
}

/** Re-install builtins after test reset. */
export function reinstallBuiltinCalloutActionsForTests(): void {
  installed = false;
  ensureBuiltinCalloutActions();
}
