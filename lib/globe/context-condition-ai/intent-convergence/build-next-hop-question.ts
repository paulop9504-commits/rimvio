/**
 * Intent Convergence Engine — next-hop (deepening) question.
 *
 * After a cluster search resolves, the *results* become the next trigger: offer
 * ONE compact row of deeper facets derived from the activated node cluster
 * (도파민 → USJ 결과 → "테마파크 · 포토스팟 · 야경"). Capped at a single hop upstream
 * so the experience stays tidy — no runaway drill-down, no wall of questions.
 */
import type { LocalDiscoveryQuestion } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Keep the deepening row to a single clean line. */
const NEXT_HOP_MAX_CHIPS = 3;

function withRegion(region: string, node: string): string {
  const term = node.trim();
  return term.includes(region) ? term : `${region} ${term}`.trim();
}

export function buildActivityNextHopQuestion(input: {
  region?: string | null;
  cluster: readonly string[];
  promptKo: string;
}): LocalDiscoveryQuestion | null {
  const region = input.region?.trim() || "";
  const nodes = input.cluster
    .map((node) => node.trim())
    .filter((node) => node.length > 0)
    .slice(0, NEXT_HOP_MAX_CHIPS);
  if (nodes.length === 0) {
    return null;
  }
  return {
    slot: "activityFocus",
    promptKo: input.promptKo,
    choices: nodes.map((node) => ({
      id: `hop-${node}`,
      label: node,
      slot: "activityFocus",
      value: withRegion(region, node),
      cluster: [node],
    })),
  };
}
