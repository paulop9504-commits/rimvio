/**
 * Format promote-ready candidates as markdown / JSON for PR codegen.
 * Never writes seed files — humans (or a future CI job) commit.
 */
import { listReadySeedPromoteCandidates } from "@/lib/seed-learning/evaluate-promote-candidates";
import { listSeedLearningRollup } from "@/lib/seed-learning/seed-learning-store";
import type { SeedPromoteCandidate } from "@/lib/seed-learning/types";

export function dumpSeedPromoteCandidatesMarkdown(
  candidates?: readonly SeedPromoteCandidate[],
): string {
  const rows =
    candidates ?? listReadySeedPromoteCandidates(listSeedLearningRollup());
  if (rows.length === 0) {
    return "# Seed promote candidates\n\n_(none ready)_\n";
  }
  const lines = [
    "# Seed promote candidates",
    "",
    `| sector | token | score | miss | hit | paths |`,
    `| --- | --- | ---: | ---: | ---: | --- |`,
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.sectorId} | ${row.token} | ${row.score} | ${row.missCount} | ${row.hitCount} | ${row.promotePaths[0] ?? ""} |`,
    );
  }
  lines.push("", "## Proposed rows", "");
  for (const row of rows) {
    lines.push(`### ${row.sectorId} · ${row.token}`);
    lines.push("```json");
    lines.push(JSON.stringify(row.proposedRow, null, 2));
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

export function dumpSeedPromoteCandidatesJson(
  candidates?: readonly SeedPromoteCandidate[],
): string {
  const rows =
    candidates ?? listReadySeedPromoteCandidates(listSeedLearningRollup());
  return JSON.stringify(rows, null, 2);
}
