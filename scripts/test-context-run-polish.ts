#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dispatchExecutionFeedClear,
  dispatchExecutionFeedGoal,
  readExecutionFeedState,
} from "../lib/context-run/execution-feed-bridge";
import {
  cancelExecutionFeedDismiss,
  EXECUTION_FEED_DONE_TTL_MS,
  finishContextRun,
  scheduleExecutionFeedDismiss,
  shouldRetainExecutionFeed,
} from "../lib/context-run/execution-feed-lifecycle";
import { ensureRunState, readActiveRunState } from "../lib/context-run/run-state-store";

const root = join(import.meta.dirname, "..");

dispatchExecutionFeedClear();
ensureRunState({ graphId: "composer:active", goal: "아이폰 팔고 싶어" });
assert.equal(shouldRetainExecutionFeed(), true);

dispatchExecutionFeedGoal({ graphId: "composer:active", goalKo: "아이폰 팔고 싶어" });
scheduleExecutionFeedDismiss("supply_clear");
assert.equal(readExecutionFeedState().run?.goalKo, "아이폰 팔고 싶어");

finishContextRun();
assert.equal(readActiveRunState()?.status, "completed");
assert.equal(EXECUTION_FEED_DONE_TTL_MS, 8_000);

scheduleExecutionFeedDismiss("run_complete");
dispatchExecutionFeedGoal({ graphId: "composer:new", goalKo: "새 목표" });
assert.equal(readExecutionFeedState().run?.goalKo, "새 목표");
cancelExecutionFeedDismiss();

const supply = readFileSync(
  join(root, "lib/globe/intent-supply/run-globe-map-intent-supply.ts"),
  "utf8",
);
assert.ok(
  supply.includes("commitTextContextIngress"),
  "map supply must commit text via context-run adapter",
);

const eslint = readFileSync(join(root, "eslint.config.mjs"), "utf8");
assert.ok(
  eslint.includes("ingestGlobeContextFromText"),
  "eslint must block direct text ingest in globe UI",
);
assert.ok(
  eslint.includes("runGlobeMapIntentSupply"),
  "eslint must block direct map supply in globe UI",
);

const photoBtn = readFileSync(
  join(root, "components/globe/globe-context-photo-button.tsx"),
  "utf8",
);
assert.ok(
  photoBtn.includes("dispatchContextRun"),
  "context photo button must use dispatchContextRun",
);
assert.ok(
  !photoBtn.includes("ingestGlobeContextFromFiles"),
  "context photo button must not ingest files directly",
);

const home = readFileSync(join(root, "components/globe/globe-home-client.tsx"), "utf8");
assert.ok(home.includes("finishContextRun"), "quick-list / wizard must finish context run");
assert.ok(
  home.includes("dispatchGlobeHomePhotoWalkthrough"),
  "globe home photo drop/picker must use dispatchContextRun",
);
assert.ok(
  !home.includes("void beginPhotoIngestFlow(files)"),
  "globe home must not bypass dispatch for photo files",
);

dispatchExecutionFeedClear();

console.log("test-context-run-polish: ok");
