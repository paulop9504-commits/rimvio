#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTEXT_OPS_API_ROUTE,
  CONTEXT_OPS_ROUTE,
  DEV_INTELLIGENCE_ROUTE,
  FIELD_DASHBOARD_INGRESS,
  isContextOpsRoute,
  isDevOnlyApi,
  isDevOnlyRoute,
} from "../lib/dev/rimvio-surface-tiers";

const root = join(import.meta.dirname, "..");

assert.ok(isDevOnlyRoute("/metrics"));
assert.ok(isDevOnlyRoute("/dev/intelligence"));
assert.ok(!isDevOnlyRoute("/"));
assert.ok(isDevOnlyApi("/api/dev/context-snapshot"));
assert.ok(!isDevOnlyApi("/api/globe/market-price"));
assert.ok(isContextOpsRoute("/metrics"));
assert.equal(CONTEXT_OPS_ROUTE, "/metrics");
assert.equal(CONTEXT_OPS_API_ROUTE, "/api/dev/context-snapshot");
assert.equal(DEV_INTELLIGENCE_ROUTE, "/dev/intelligence");
assert.equal(FIELD_DASHBOARD_INGRESS, "openFieldDashboardFromBottomNav");

const metricsPage = readFileSync(join(root, "app/metrics/page.tsx"), "utf8");
const intelligencePage = readFileSync(
  join(root, "app/dev/intelligence/page.tsx"),
  "utf8",
);
const contextOpsDashboard = readFileSync(
  join(root, "components/context-ops/context-ops-dashboard.tsx"),
  "utf8",
);
const fieldIngress = readFileSync(
  join(root, "lib/nav/field-dashboard-ingress.ts"),
  "utf8",
);
const fieldSheet = readFileSync(
  join(root, "components/field/opportunity-dashboard-sheet.tsx"),
  "utf8",
);

assert.ok(
  metricsPage.includes("ContextOpsDashboard"),
  "metrics must mount Context Ops only",
);
assert.ok(
  !metricsPage.includes("PmfMetricsPanel"),
  "metrics must not mount PMF panel",
);
assert.ok(
  !metricsPage.includes("components/field"),
  "metrics must not import Field product components",
);
assert.ok(
  intelligencePage.includes("OpportunityScoresPanel"),
  "dev intelligence hosts opportunity engine",
);
assert.ok(
  intelligencePage.includes("GoalAlignmentPanel"),
  "dev intelligence hosts goal engine",
);
assert.ok(
  intelligencePage.includes("SelfLearningSummaryPanel"),
  "dev intelligence hosts self-learning summary",
);
assert.ok(
  !intelligencePage.includes("components/field"),
  "dev intelligence must not import Field product",
);
assert.ok(
  !contextOpsDashboard.includes("market-alignment-store"),
  "Context Ops must not read Field market-intent store",
);
assert.ok(
  !contextOpsDashboard.includes("opportunity-dashboard"),
  "Context Ops must not embed Field dashboard",
);
assert.ok(
  fieldIngress.includes("openFieldDashboardFromBottomNav"),
  "Field ingress SSOT",
);
assert.ok(
  !fieldSheet.includes("/metrics"),
  "Field product must not link to metrics",
);
assert.ok(
  !fieldSheet.includes("context-ops"),
  "Field product must not import Context Ops",
);
assert.ok(
  readFileSync(join(root, "components/field/opportunity-dashboard-body.tsx"), "utf8").includes(
    "useFieldPlaceDiscovery",
  ),
  "Field discovery must wire place-search hook",
);
assert.ok(
  readFileSync(join(root, "components/field/opportunity-dashboard-body.tsx"), "utf8").includes(
    "useFieldLodgingDiscovery",
  ),
  "Field discovery must wire lodging market-price hook",
);

console.log("test-surface-tiers: ok");
