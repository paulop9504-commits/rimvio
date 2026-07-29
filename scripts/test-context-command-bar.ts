#!/usr/bin/env npx tsx
/**
 * Context Command Bar — migrate / clone / save classify (ADR-028).
 */

import assert from "node:assert/strict";
import {
  classifyContextCommand,
  runContextCommand,
} from "../lib/context-command";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { findPersonalGlobePinByEventId } from "../lib/globe/personal-globe-pin-store";

async function main() {
  resetGraphCommandStoreForTests();
  clearSessionGraphs();

  {
    const m = classifyContextCommand("이 맥락 제주도로 옮겨줘");
    assert.ok(m);
    assert.equal(m!.kind, "migrate_anchor");
    assert.equal(m!.destinationLabelKo, "제주");
  }

  {
    const c = classifyContextCommand("둔산동 맛집 탐색 맥락 제주도에도 만들어줘");
    assert.ok(c);
    assert.equal(c!.kind, "clone_context");
    assert.equal(c!.destinationLabelKo, "제주");
  }

  {
    const s = classifyContextCommand("이 상태 저장해줘");
    assert.ok(s);
    assert.equal(s!.kind, "save_snapshot");
  }

  {
    const osaka = classifyContextCommand("이 맥락 오사카로 옮겨");
    assert.ok(osaka);
    assert.equal(osaka!.kind, "migrate_anchor");
    assert.equal(osaka!.destinationLabelKo, "오사카");
  }

  {
    assert.equal(classifyContextCommand("주변 맛집 찾아줘"), null);
  }

  {
    const event = ensureTripContextEvent({
      message: "둔산동 맛집",
      profile: "eatery_search",
    });
    const migrated = await runContextCommand({
      utterance: "이 맥락 제주도로 옮겨줘",
      contextEventId: event.id,
      contextTitleKo: event.title,
      anchorPlaceName: "둔산동",
    });
    assert.equal(migrated.ok, true);
    if (migrated.ok) {
      assert.equal(migrated.kind, "migrate_anchor");
      assert.equal(migrated.shouldRescout, true);
      assert.match(migrated.rescoutUtterance ?? "", /제주/);
      assert.ok(migrated.anchorLat != null && Number.isFinite(migrated.anchorLat));
      assert.ok(migrated.anchorLng != null && Number.isFinite(migrated.anchorLng));
      assert.ok(
        migrated.anchorLat! > 32 &&
          migrated.anchorLat! < 34.5 &&
          migrated.anchorLng! > 125 &&
          migrated.anchorLng! < 128,
        `expected Jeju-ish coords, got ${migrated.anchorLat},${migrated.anchorLng}`,
      );
      const pin = findPersonalGlobePinByEventId(event.id);
      assert.ok(pin);
      assert.equal(pin!.lat, migrated.anchorLat);
      assert.equal(pin!.lng, migrated.anchorLng);
    }
  }

  {
    const event = ensureTripContextEvent({
      message: "둔산동 맛집",
      profile: "eatery_search",
    });
    const cloned = await runContextCommand({
      utterance: "제주도에도 만들어줘",
      contextEventId: event.id,
      contextTitleKo: event.title,
    });
    assert.equal(cloned.ok, true);
    if (cloned.ok) {
      assert.equal(cloned.kind, "clone_context");
      assert.notEqual(cloned.contextEventId, event.id);
    }
  }

  console.log("ok — context-command-bar");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
