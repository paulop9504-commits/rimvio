#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  listPortalCategoriesForIntent,
  listPortalIntents,
  portalIntentToMarketRole,
} from "../lib/portal/portal-intent-registry";

assert.equal(listPortalIntents().length, 4);
assert.equal(listPortalCategoriesForIntent("offer").length, 6);
assert.equal(
  listPortalCategoriesForIntent("offer").find((row) => row.id === "used_goods")
    ?.marketProjection,
  true,
);
assert.equal(portalIntentToMarketRole("offer"), "listing");
assert.equal(portalIntentToMarketRole("seek"), "seeking");
assert.equal(portalIntentToMarketRole("together"), null);

console.log("test-portal-intent-registry: ok");
