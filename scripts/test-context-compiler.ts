/**
 * Context Compiler IR — ADR-023 regression.
 * Preference ← rollup · Reality State · Capsule Resume same IR.
 */

import assert from "node:assert/strict";
import {
  compileContextFromUtterance,
  deriveWorkspaceRelationshipEdges,
  mergePreferenceFromArchiveRollup,
  refreshCompilerIrForWorkspace,
} from "../lib/context-compiler";
import { buildContextPack } from "../lib/context-builder";
import {
  clearContextWorkspace,
  openLodgingContextWorkspace,
  readCapsuleCompilerIr,
  readContextWorkspace,
  resumeCapsuleWorkspace,
} from "../lib/context-workspace";
import {
  ensureSessionGraph,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command/session-graph-store";
import { resetLearningRollupForTests } from "../lib/archive/learning-rollup-store";

resetGraphCommandStoreForTests();
resetLearningRollupForTests();

{
  const ir = compileContextFromUtterance(
    "이번 주말 여자친구랑 서울 놀러가고 싶어",
  );
  assert.equal(ir.version, 1);
  assert.ok(ir.entities.some((e) => e.type === "person" && e.relation === "girlfriend"));
  assert.ok(ir.entities.some((e) => e.type === "location" || e.value.includes("서울")));
  assert.equal(ir.time.period, "weekend");
  assert.ok(ir.preference.romantic >= 0.8);
  assert.ok(ir.actions.includes("search_place") || ir.intent.family.length > 0);
  assert.ok(ir.intent.goalKo);
}

{
  resetLearningRollupForTests([
    {
      contextKey: "event.travel.link:eatery",
      actionKey: "book_restaurant",
      label: "맛집 예약",
      shown: 10,
      clicked: 6,
      executed: 5,
      dismissed: 1,
      rates: { clickRate: 0.6, executeRate: 0.5, dismissRate: 0.1 },
      scoreDelta: 0.55,
      updatedAt: new Date().toISOString(),
    },
  ]);
  const base = compileContextFromUtterance("서울 주말 일정").preference;
  const without = { ...base, food: 0.35 };
  const merged = mergePreferenceFromArchiveRollup(without);
  assert.ok(merged.food > without.food, "rollup should lift food preference");
  const rainy = compileContextFromUtterance("비 오면 실내 카페");
  assert.equal(rainy.reality.weather, "rain");
  assert.ok(rainy.reality.inventoryHints.some((h) => h.includes("rain")));
  resetLearningRollupForTests();
}

{
  const EVENT = "test-compiler-pack";
  clearContextWorkspace(EVENT);
  ensureSessionGraph({
    contextEventId: EVENT,
    anchorLat: 37.56,
    anchorLng: 126.97,
  });
  openLodgingContextWorkspace({
    contextEventId: EVENT,
    query: "서울 호텔",
    hits: [
      {
        id: "maps:h1",
        labelKo: "서울 호텔 A",
        domain: "lodging",
        lat: 37.56,
        lng: 126.97,
        rating: 4.5,
        walkMinutes: 5,
        priceBand: 2,
        reservable: true,
        localFavorite: false,
        source: "maps",
        amountLabel: "12만원",
      },
      {
        id: "maps:h2",
        labelKo: "서울 호텔 B",
        domain: "lodging",
        lat: 37.561,
        lng: 126.971,
        rating: 4.2,
        walkMinutes: 8,
        priceBand: 1,
        reservable: true,
        localFavorite: false,
        source: "maps",
        amountLabel: "9만원",
      },
    ],
  });
  const ws = readContextWorkspace(EVENT);
  assert.ok(ws);
  assert.ok((ws!.relationshipEdges?.length ?? 0) >= 1);
  assert.ok(ws!.compilerIr, "open workspace stamps compilerIr");
  assert.ok(
    ws!.compilerIr!.reality.inventoryHints.some((h) => h.startsWith("lodging:")),
    "reality inventory from workspace",
  );

  const pack = buildContextPack({
    utterance: "서울 가성비 호텔",
    graph: ensureSessionGraph({ contextEventId: EVENT }),
  });
  assert.ok(pack.compilerIr);
  assert.equal(pack.compilerIr.preference.budgetSensitive >= 0.4, true);
  assert.ok(pack.compilerIr.graph.edges.length >= 1);

  const near = deriveWorkspaceRelationshipEdges(
    ws!.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      visible: n.visible,
    })),
  );
  assert.ok(near.some((e) => e.kind === "nearby" || e.kind === "route"));

  const stored = readCapsuleCompilerIr(EVENT);
  assert.ok(stored);
  const romanticPrior = {
    ...stored!,
    preference: { ...stored!.preference, romantic: 0.92 },
    reality: { ...stored!.reality, weather: "rain" as string | null },
  };
  const resumed = resumeCapsuleWorkspace({
    contextEventId: EVENT,
    expand: false,
  });
  assert.ok(resumed?.compilerIr);
  assert.ok(
    resumed!.compilerIr.reality.inventoryHints.some((h) =>
      h.startsWith("lodging:"),
    ),
  );

  const refreshed = refreshCompilerIrForWorkspace({
    priorIr: romanticPrior,
    utterance: "서울 호텔",
    workspace: resumed!.state,
  });
  assert.ok(refreshed.preference.romantic >= 0.7, "prior preference preserved");
  assert.equal(refreshed.reality.weather, "rain", "prior weather preserved");

  clearContextWorkspace(EVENT);
}

console.log("ok — context-compiler");
