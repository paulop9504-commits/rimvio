/**
 * Smoke: Callout Action Registry — buttons from registry, not hard-coded UI.
 */
import assert from "node:assert/strict";
import {
  ensureBuiltinCalloutActions,
  listRegisteredActions,
  registerAction,
  resetCalloutActionRegistryForTests,
  reinstallBuiltinCalloutActionsForTests,
  resolveCalloutActionButtons,
  invokeRegisteredAction,
  rimvioObjectFromWorkspaceNode,
} from "@/lib/callout";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";

resetCalloutActionRegistryForTests();
reinstallBuiltinCalloutActionsForTests();

const hotelActions = listRegisteredActions("hotel").map((a) => a.action);
assert.deepEqual(hotelActions, ["compare", "change", "prepare_booking"]);

const restaurantActions = listRegisteredActions("restaurant").map(
  (a) => a.action,
);
assert.deepEqual(restaurantActions, ["reserve", "add_to_day", "navigate"]);

const node: ContextWorkspaceNode = {
  id: "hotel_123",
  kind: "lodging",
  placeId: "p1",
  title: "Namba Hotel",
  summaryKo: "난바",
  lat: 34.66,
  lng: 135.5,
  rating: 8.8,
  priceBand: 2,
  amountLabel: "120,000원",
  thumbnailUrl: null,
  tags: [],
  visible: true,
  selected: true,
  bookmarked: false,
  source: "test",
};

const preview: NodePreviewModel = {
  nodeId: node.id,
  kind: "lodging",
  title: node.title,
  kindLabelKo: "숙소",
  heroImage: null,
  galleryImages: [],
  imageCountHint: 0,
  rating: 8.8,
  ratingLabel: "★ 8.8",
  price: "120,000원",
  reviewSummary: "후기",
  whyChosen: "난바역 4분",
  amenities: [],
  nearby: [],
  selected: true,
  bookmarked: false,
  inCompare: false,
  canPrepare: true,
  capabilities: ["book_room"],
};

const object = rimvioObjectFromWorkspaceNode({
  node,
  preview,
  contextId: "ctx",
});

const buttons = resolveCalloutActionButtons(object);
assert.equal(buttons.length, 3);
assert.deepEqual(
  buttons.map((b) => b.action),
  ["compare", "change", "prepare_booking"],
);
assert.ok(object.actions.every((a) => a.action));
assert.ok(object.actions.some((a) => a.action === "prepare_booking" && a.primary));

let prepared = false;
void invokeRegisteredAction("prepare_booking", {
  objectId: object.id,
  objectType: "hotel",
  contextId: "ctx",
  object,
  handlers: {
    onCreatePrepareDraft: () => {
      prepared = true;
    },
  },
}).then((ok) => {
  assert.equal(ok, true);
  assert.equal(prepared, true);

  /** Extensibility: register without touching Callout UI */
  registerAction({
    objectType: "hotel",
    action: "share_link",
    labelKo: "공유",
    order: 40,
    handler: () => undefined,
  });
  assert.ok(
    listRegisteredActions("hotel").some((a) => a.action === "share_link"),
  );

  ensureBuiltinCalloutActions();
  console.log(
    "ok callout-action-registry",
    `hotel=${hotelActions.join(",")}`,
    `restaurant=${restaurantActions.join(",")}`,
  );
});
