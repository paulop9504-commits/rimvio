/**
 * Workspace commit preview · WHY · route · MapKit JWT regression.
 */

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  applyWorkspaceTransition,
  buildWorkspaceCommitPreview,
  clearContextWorkspace,
  openLodgingContextWorkspace,
  optimizeWorkspaceNodeRoute,
  parseWorkspaceUtteranceTransition,
  readContextWorkspace,
} from "../lib/context-workspace";
import { signAppleMapKitJwt } from "../lib/context-workspace/map/sign-mapkit-jwt";

const EVENT = "test-ws-commit-why-route";
clearContextWorkspace(EVENT);

openLodgingContextWorkspace({
  contextEventId: EVENT,
  query: "제주 호텔",
  hits: [
    {
      id: "a",
      labelKo: "호텔 A",
      domain: "lodging",
      lat: 33.5,
      lng: 126.5,
      rating: 4.8,
      walkMinutes: 5,
      priceBand: 3,
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "b",
      labelKo: "호텔 B",
      domain: "lodging",
      lat: 33.51,
      lng: 126.52,
      rating: 4.2,
      walkMinutes: 8,
      priceBand: 2,
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "c",
      labelKo: "호텔 C",
      domain: "lodging",
      lat: 33.49,
      lng: 126.48,
      rating: 4.6,
      walkMinutes: 10,
      priceBand: 4,
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

const opened = readContextWorkspace(EVENT);
assert.ok(opened?.lastWhy);
assert.ok(opened!.lastWhy!.actionKo.includes("생성"));

const preview = buildWorkspaceCommitPreview(opened!);
assert.ok(preview.lines.length >= 1);
assert.ok(preview.commitCount >= 3);

assert.equal(parseWorkspaceUtteranceTransition("동선 최적화")?.op, "optimize_route");
applyWorkspaceTransition({ contextEventId: EVENT, op: "optimize_route" });
const routed = readContextWorkspace(EVENT);
assert.ok(routed?.lastChangeKo?.includes("동선"));
assert.equal(routed?.lastWhy?.actionKo, "동선 최적화");

const order = optimizeWorkspaceNodeRoute(routed!.nodes);
assert.equal(order.filter((n) => n.visible).length, 3);

applyWorkspaceTransition({
  contextEventId: EVENT,
  op: "simulate",
  simulateScenarioKo: "비 오면",
});
assert.ok(readContextWorkspace(EVENT)?.lastWhy?.actionKo.includes("시뮬"));

applyWorkspaceTransition({
  contextEventId: EVENT,
  op: "compare",
  nodeIds: routed!.nodes.slice(0, 2).map((n) => n.id),
});
assert.ok((readContextWorkspace(EVENT)?.compareIds.length ?? 0) >= 2);

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const jwt = signAppleMapKitJwt({
  teamId: "TEAM123",
  keyId: "KEY456",
  privateKeyPem: pem,
  nowSec: 1_700_000_000,
});
const parts = jwt.split(".");
assert.equal(parts.length, 3);

clearContextWorkspace(EVENT);
console.log("ok — workspace commit-why-route-mapkit");
