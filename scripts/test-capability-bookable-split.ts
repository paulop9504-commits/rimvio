/**
 * Booking panel = lodging · flight · ticket only; eatery/poi → discoverPlaces.
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
} from "../lib/context-workspace";
import {
  buildLayoutFromRecipe,
  buildWorkspaceCapabilityViewModel,
  getWorkspaceCapabilityRecipe,
  isCapabilityBookableNode,
} from "../lib/workspace-capability";

const CTX = "test:capability-bookable-split";
clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
  skipUserChat: true,
});
assert.ok(state);

const recipe = getWorkspaceCapabilityRecipe("trip_plan");
assert.ok(recipe?.open);
const layout = buildLayoutFromRecipe({
  contextEventId: CTX,
  intentId: "trip_plan",
});
const view = buildWorkspaceCapabilityViewModel({ state: state!, layout });

assert.ok(
  view.bookings.every((b) => {
    const node = state!.nodes.find((n) => n.id === b.nodeId);
    return node != null && isCapabilityBookableNode(node);
  }),
  "booking chips must only be bookable roles",
);
assert.ok(
  view.bookings.every((b) => b.kind !== "eatery"),
  "no eatery in booking panel",
);
assert.ok(
  view.bookings.some((b) => b.bookableRoleKo === "숙소"),
  "lodging in booking",
);
assert.ok(
  view.discoverPlaces.every((d) => d.kind === "eatery" || d.kind === "poi" || d.kind === "amenity"),
);
assert.ok(
  view.discoverPlaces.some((d) => d.kind === "eatery" || d.kind === "poi"),
  "discover has search/info places",
);
assert.ok(
  recipe!.open.some((o) => o.id === "candidate_list"),
  "trip_plan opens candidate_list",
);

console.log(
  "ok capability-bookable-split",
  `bookings=${view.bookings.map((b) => b.bookableRoleKo).join(",")}`,
  `discover=${view.discoverPlaces.length}`,
);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
