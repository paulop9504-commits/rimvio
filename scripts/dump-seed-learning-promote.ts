#!/usr/bin/env npx tsx
/**
 * Dump seed-promote candidates.
 * Personal (local memory) by default.
 * --shared : community aggregate
 */
import {
  dumpSeedPromoteCandidatesMarkdown,
  evaluateSeedPromoteCandidates,
  filterCommunityPromoteReady,
  listReadySeedPromoteCandidates,
  listSeedLearningRollup,
  listSeedLearningSectors,
} from "../lib/seed-learning";
import { listSeedLearningSharedRollup } from "../lib/seed-learning/server";

const shared = process.argv.includes("--shared");

async function main(): Promise<void> {
  console.log("## Seed learning sectors");
  for (const sector of listSeedLearningSectors()) {
    console.log(
      `- [${sector.priority}] ${sector.id} → ${sector.promotePaths[0]}`,
    );
  }
  console.log("");

  if (shared) {
    const { entries, backend } = await listSeedLearningSharedRollup();
    const ready = filterCommunityPromoteReady(
      evaluateSeedPromoteCandidates(entries),
    );
    console.log(`Shared backend: ${backend}`);
    console.log(`Rollup entries: ${entries.length}`);
    console.log(`Community ready: ${ready.length}`);
    console.log("");
    console.log(dumpSeedPromoteCandidatesMarkdown(ready));
    return;
  }

  const rollup = listSeedLearningRollup();
  const ready = listReadySeedPromoteCandidates(rollup);
  console.log(`Personal rollup: ${rollup.length}`);
  console.log(`Ready to promote: ${ready.length}`);
  console.log("");
  console.log(dumpSeedPromoteCandidatesMarkdown(ready));
}

void main();
