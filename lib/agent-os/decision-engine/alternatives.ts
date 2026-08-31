/**
 * Alternative planning after failure — do not repeat the same path.
 */

import type { ActionCandidate, DecisionAlternative } from "@/lib/agent-os/decision-engine/types";
import { knownGatewayTool } from "@/lib/agent-os/decision-engine/capability-catalog";

export function generateAlternatives(input: {
  readonly failedToolId: string | null;
  readonly candidates: readonly ActionCandidate[];
  readonly failureType?: string | null;
}): readonly DecisionAlternative[] {
  const alts: DecisionAlternative[] = [];
  for (const c of input.candidates) {
    if (c.alreadyPresent) continue;
    if (c.toolId === input.failedToolId && c.actionId === input.failedToolId) continue;
    if (!knownGatewayTool(c.toolId)) continue;
    alts.push({
      id: c.actionId,
      toolId: c.toolId,
      labelKo: c.labelKo,
      score: c.total,
      reasonKo:
        c.missingDeps.length > 0
          ? `먼저 ${c.missingDeps[0]} 가 필요합니다`
          : `${c.labelKo}로 이어서 진행`,
    });
  }

  if (input.failureType === "capability" || input.failureType === "logic") {
    const adapter = input.candidates.find((c) => c.toolId === "resource.apply");
    if (adapter && !alts.some((a) => a.toolId === "resource.apply")) {
      alts.push({
        id: "payment.adapter",
        toolId: "resource.apply",
        labelKo: "중간 adapter 추가",
        score: (adapter.total ?? 0) + 1,
        reasonKo: "기존 구조를 덜 바꾸려면 adapter가 낫습니다",
      });
    }
  }

  return alts.sort((a, b) => b.score - a.score).slice(0, 3);
}
