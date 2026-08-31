/**
 * Surface Stack + Session Context + Action Metadata smoke test.
 */

import assert from "node:assert/strict";
import {
  closeSurfaceStack,
  listActionMetadata,
  popSurface,
  pushSurface,
  readSessionContext,
  readSurfaceStack,
  recordActionMetadata,
  resetActionMetadata,
  resetSurfaceStackSession,
  setCartItems,
} from "@/lib/experience-app";

function main() {
  resetSurfaceStackSession();
  resetActionMetadata();

  assert.equal(readSurfaceStack().length, 0);
  pushSurface("map", { stores: [] });
  pushSurface("restaurant", { storeId: "store_42" }, "map");
  assert.equal(readSurfaceStack().length, 2);
  assert.equal(readTop()?.surface, "restaurant");

  popSurface();
  assert.equal(readSurfaceStack().length, 1);

  closeSurfaceStack();
  assert.equal(readSurfaceStack().length, 0);

  setCartItems([
    { itemId: "m1", name: "뿌링클", priceKrw: 23000, qty: 1 },
    { itemId: "m3", name: "치즈볼", priceKrw: 6000, qty: 1 },
  ]);
  const ctx = readSessionContext();
  assert.equal(ctx.cartItems.length, 2);

  recordActionMetadata({
    op: "order.create",
    actorId: "user_102",
    actorRole: "consumer",
    surface: "checkout",
    entityType: "order",
    entityId: "ord-test",
    status: "success",
  });
  assert.ok(listActionMetadata().some((m) => m.tool === "order.create"));

  console.log("test-experience-surface-stack: ok");
}

function readTop() {
  const stack = readSurfaceStack();
  return stack[stack.length - 1] ?? null;
}

main();
