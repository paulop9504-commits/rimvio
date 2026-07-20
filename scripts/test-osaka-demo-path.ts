#!/usr/bin/env npx tsx
/**
 * Osaka 30s demo golden path:
 * APA pin → nearby eatery (catalog) → 현지인 filter → 첫 번째 예약 → CEO Sign one-tap.
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  parseGraphCommands,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import {
  clearPreparedRealityOperations,
  commitRealityQueueClient,
  listPreparedRealityOperations,
  promotePendingPreparedOpsForCeoSign,
  preparedOperationsAsQueueItems,
} from "../lib/reality-queue";
import { executeBookingAfterHumanCommit } from "../lib/booking-runtime";
import { runPlaceSearch } from "../lib/search-engine";
import { OSAKA_APA_NAMBA } from "../lib/search-engine/osaka-demo-catalog";
import { invokeRimvioTool } from "../lib/tool-registry";
import { readActionPlanUiState } from "../lib/action-planner";
import {
  assertNlPipelineStageOrder,
  runNaturalLanguagePipeline,
} from "../lib/context-run/run-natural-language-pipeline";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

const CTX = "evt-osaka-demo";

{
  const cmds = parseGraphCommands("APA호텔 고정");
  assert.equal(cmds[0]?.op, "pin_node");
}

{
  const pin = tryRunGraphCommandOs({
    utterance: "APA호텔 고정",
    contextEventId: CTX,
    contextLabelKo: "오사카 여행",
    anchorLat: OSAKA_APA_NAMBA.lat,
    anchorLng: OSAKA_APA_NAMBA.lng,
  });
  assert.ok(pin);
  const lodging = pin!.graph.nodes.filter((n) => n.kind === "lodging" && n.pinned);
  assert.ok(lodging.length >= 2, "APA brand pins Namba + Umeda");
  assert.ok(
    lodging.some((n) => n.labelKo.includes("난바")),
    "includes APA 난바",
  );
  assert.ok(
    lodging.some((n) => n.labelKo.includes("우메다")),
    "includes APA 우메다",
  );
  assert.equal(pin!.graph.anchorLat, OSAKA_APA_NAMBA.lat);
}

{
  const hits = runPlaceSearch({
    query: "주변 맛집",
    domain: "eatery",
    anchorLat: OSAKA_APA_NAMBA.lat,
    anchorLng: OSAKA_APA_NAMBA.lng,
  });
  assert.ok(hits.length >= 3);
  assert.ok(hits.some((h) => h.localFavorite), "localFavorite signal present");
  assert.ok(
    hits.every((h) => h.lat > 34.6 && h.lat < 34.8),
    "Osaka coords not Daejeon orbit",
  );
}

{
  const search = tryRunGraphCommandOs({
    utterance: "주변 맛집 찾아줘",
    contextEventId: CTX,
  });
  assert.ok(search);
  assert.ok(search!.graph.nodes.some((n) => n.kind === "eatery"));
}

{
  const filtered = tryRunGraphCommandOs({
    utterance: "현지인",
    contextEventId: CTX,
  });
  assert.ok(filtered);
  assert.equal(filtered!.commands[0]?.op, "filter");
  const visibleEatery = filtered!.graph.nodes.filter(
    (n) => n.visible && n.kind === "eatery",
  );
  assert.ok(visibleEatery.length >= 1);
  assert.ok(
    visibleEatery.every((n) => n.localFavorite),
    "현지인 filter keeps localFavorite only",
  );
}

{
  const reservable = tryRunGraphCommandOs({
    utterance: "예약 가능한 곳만",
    contextEventId: CTX,
  });
  assert.ok(reservable);
  const visible = reservable!.graph.nodes.filter(
    (n) => n.visible && n.kind === "eatery",
  );
  assert.ok(visible.every((n) => n.reservable));
}

{
  const pick = invokeRimvioTool("ranking.pick", {
    candidates: [
      {
        id: "a",
        labelKo: "체인",
        rating: 4.9,
        reservable: true,
        localFavorite: false,
      },
      {
        id: "b",
        labelKo: "골목",
        rating: 4.5,
        reservable: true,
        localFavorite: true,
      },
    ],
  });
  assert.equal(pick.pickedLabelKo, "골목");
}

{
  const reserve = tryRunGraphCommandOs({
    utterance: "첫 번째 예약",
    contextEventId: CTX,
  });
  assert.ok(reserve);
  assert.equal(reserve!.commands[0]?.op, "reserve_prep");
  assert.ok(reserve!.reservedOpIds.length >= 1);

  const pending = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === CTX,
  );
  assert.ok(pending.length >= 1);
  assert.ok(pending.every((op) => op.status === "pending"));

  const items = preparedOperationsAsQueueItems();
  const promoted = promotePendingPreparedOpsForCeoSign(items);
  assert.ok(promoted >= 1);

  const ready = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === CTX && op.status === "ready",
  );
  assert.ok(ready.length >= 1);

  const book = executeBookingAfterHumanCommit({
    contextEventId: CTX,
    operations: ready,
    approvedByHuman: true,
  });
  assert.ok(book.ok);
  if (book.ok) {
    assert.ok(book.receipts[0]?.confirmationCode);
  }

  const blocked = executeBookingAfterHumanCommit({
    contextEventId: CTX,
    operations: ready,
    approvedByHuman: false,
  });
  assert.equal(blocked.ok, false);
}

async function testOneTapCommit(): Promise<void> {
  clearPreparedRealityOperations();
  const again = tryRunGraphCommandOs({
    utterance: "첫 번째 예약",
    contextEventId: CTX,
  });
  assert.ok(again?.reservedOpIds.length);

  const items = preparedOperationsAsQueueItems();
  assert.ok(items.some((i) => i.status === "pending"));
  const result = await commitRealityQueueClient({
    items,
    canCommit: false,
    promotePendingOnSign: true,
  });
  assert.ok(result.ok === true || result.reason === "blocked");
  const afterPromote = listPreparedRealityOperations().filter(
    (op) => op.contextEventId === CTX,
  );
  assert.ok(
    afterPromote.length === 0 ||
      afterPromote.every((op) => op.status === "ready"),
  );
}

void testOneTapCommit()
  .then(() => {
    // NL compare→reserve → Field queue → CEO Sign → booking receipt
    resetGraphCommandStoreForTests();
    clearPreparedRealityOperations();
    clearSessionGraphs();

    const nl = runNaturalLanguagePipeline({
      utterance: "APA 난바이랑 APA 우메다 비교해서 예약해",
      contextEventId: "evt-osaka-nl-e2e",
      anchorLat: OSAKA_APA_NAMBA.lat,
      anchorLng: OSAKA_APA_NAMBA.lng,
      contextLabelKo: "오사카 여행",
    });
    assert.ok(nl.result);
    assert.equal(nl.result!.via, "action_plan");
    if (nl.result!.via === "action_plan") {
      assert.equal(nl.result!.waitingCommit, true);
      assert.ok(nl.result!.reservedOpIds.length >= 1);
    }
    assert.ok(assertNlPipelineStageOrder(nl.trace.stagesVisited));
    assert.ok(nl.trace.stagesVisited.includes("reality_commit"));
    const ui = readActionPlanUiState();
    assert.ok(ui?.waitingCommit);
    assert.ok(ui?.requestFieldOpen);

    const pending = listPreparedRealityOperations().filter(
      (op) => op.contextEventId === "evt-osaka-nl-e2e",
    );
    assert.ok(pending.length >= 1);
    const promoted = promotePendingPreparedOpsForCeoSign(
      preparedOperationsAsQueueItems(),
    );
    assert.ok(promoted >= 1);
    const ready = listPreparedRealityOperations().filter(
      (op) =>
        op.contextEventId === "evt-osaka-nl-e2e" && op.status === "ready",
    );
    const book = executeBookingAfterHumanCommit({
      contextEventId: "evt-osaka-nl-e2e",
      operations: ready,
      approvedByHuman: true,
    });
    assert.ok(book.ok);
    if (book.ok) {
      assert.ok(book.receipts[0]?.confirmationCode);
    }

    // Pin via same pipeline trace + Reality Object stamp
    clearSessionGraphs();
    clearPreparedRealityOperations();
    const pin = runNaturalLanguagePipeline({
      utterance: "APA호텔 고정",
      contextEventId: "evt-osaka-pin",
      anchorLat: OSAKA_APA_NAMBA.lat,
      anchorLng: OSAKA_APA_NAMBA.lng,
    });
    assert.ok(pin.result);
    assert.equal(pin.result!.via, "graph_command");
    assert.ok(assertNlPipelineStageOrder(pin.trace.stagesVisited));
    assert.ok(pin.trace.stagesVisited.includes("graph_engine"));
    if (pin.result!.via === "graph_command") {
      const lodging = pin.result!.graph.nodes.filter(
        (n) => n.kind === "lodging" && n.pinned,
      );
      assert.ok(lodging.length >= 1);
      assert.ok(
        lodging.some((n) => typeof n.attrs.realityObjectId === "string"),
        "NL pin stamps Reality Object id",
      );
    }

    console.log("ok — osaka demo path");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
