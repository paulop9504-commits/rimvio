#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFieldDashboardSearchParams,
  parseFieldDashboardIngressFromSearchParams,
  parseFieldDashboardTab,
} from "../lib/nav/field-dashboard-ingress";

const root = process.cwd();

assert.equal(parseFieldDashboardTab("trades"), "trades");
assert.equal(parseFieldDashboardTab("discovery"), "discovery");
assert.equal(parseFieldDashboardTab("mine"), "mine");
assert.equal(parseFieldDashboardTab("nope"), undefined);

const sp = buildFieldDashboardSearchParams({
  tab: "trades",
  highlightTradeId: "hs-42",
  primaryEventId: "ec-1",
});
assert.equal(sp.get("openField"), "1");
assert.equal(sp.get("fieldTab"), "trades");
assert.equal(sp.get("highlightTrade"), "hs-42");
assert.equal(sp.get("fieldEvent"), "ec-1");

const parsed = parseFieldDashboardIngressFromSearchParams(sp);
assert.deepEqual(parsed, {
  tab: "trades",
  highlightTradeId: "hs-42",
  primaryEventId: "ec-1",
});

assert.equal(parseFieldDashboardIngressFromSearchParams(new URLSearchParams()), null);

const provider = readFileSync(
  join(root, "components/field/field-sheet-provider.tsx"),
  "utf8",
);
assert.ok(provider.includes("highlightTradeId"), "provider must wire highlightTradeId");
assert.ok(provider.includes("ingressGeneration"), "provider must bump ingress generation");

const trades = readFileSync(
  join(root, "components/field/market-active-trades-section.tsx"),
  "utf8",
);
assert.ok(trades.includes("data-market-trade-id"), "trade rows must expose handshake id");

const ingress = readFileSync(join(root, "lib/nav/field-dashboard-ingress.ts"), "utf8");
assert.ok(
  ingress.includes("openFieldDashboardFromBottomNav"),
  "bottom-nav ingress preset required",
);
assert.ok(ingress.includes("openFieldMineIngress"), "mine tab ingress preset required");
assert.ok(!ingress.includes("bypassDiscoveryGate"), "discovery gate removed from field ingress");

const body = readFileSync(
  join(root, "components/field/opportunity-dashboard-body.tsx"),
  "utf8",
);
assert.ok(body.includes("ingressGeneration"), "dashboard body must apply ingress tab");
assert.ok(body.includes("FieldExternalMinePanel"), "mine tab panel required");
assert.ok(body.includes("browseRows"), "browse rows wired");
assert.ok(body.includes("highlightScrollKey"), "trade highlight scroll key wired");

const appNav = readFileSync(join(root, "components/app-nav.tsx"), "utf8");
assert.ok(appNav.includes("openFieldDashboardFromBottomNav"), "app nav must use bottom-nav ingress");
assert.ok(appNav.includes("useFieldNavBadge"), "app nav must show field badge");
assert.ok(trades.includes("highlightScrollKey"), "trade section must accept highlight scroll key");

console.log("test-field-dashboard-ingress: ok");
