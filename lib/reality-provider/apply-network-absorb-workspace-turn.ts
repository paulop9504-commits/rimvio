/**
 * Short NL → network absorb Patch (metro / JR / rail).
 * Cursor-like: map is the answer; replyKo is one status line + soft chips.
 */

import { tryApplyRealityAbsorbFromUtterance } from "@/lib/reality-provider/run-reality-absorb";

export type NetworkAbsorbSoftChip = {
  readonly labelKo: string;
  readonly utterance: string;
};

export type NetworkAbsorbWorkspaceTurnResult = {
  readonly handled: true;
  readonly replyKo: string;
  readonly needId: string | null;
  readonly softChips: readonly NetworkAbsorbSoftChip[];
};

function softChipsForNeed(
  needId: string | null,
  statusKo: string,
): readonly NetworkAbsorbSoftChip[] {
  if (needId === "metro_network") {
    const hide = /숨김/u.test(statusKo);
    if (hide) {
      return [
        { labelKo: "지하철 다시", utterance: "지하철 노선" },
        { labelKo: "숙소 찾기", utterance: "숙소 찾아줘" },
      ];
    }
    return [
      { labelKo: "미도스지선", utterance: "미도스지선" },
      { labelKo: "노선 숨기기", utterance: "지하철 숨겨" },
      { labelKo: "동선", utterance: "동선 최적화" },
    ];
  }
  if (needId === "rail_network" || needId === "shinkansen_network") {
    return [
      { labelKo: "노선 숨기기", utterance: "노선 숨겨" },
      { labelKo: "동선", utterance: "동선 최적화" },
    ];
  }
  return [{ labelKo: "동선", utterance: "동선 최적화" }];
}

/**
 * Returns null when utterance is not a network absorb Need.
 */
export function tryApplyNetworkAbsorbWorkspaceTurn(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
}): NetworkAbsorbWorkspaceTurnResult | null {
  const result = tryApplyRealityAbsorbFromUtterance({
    utterance: input.utterance,
    contextEventId: input.contextEventId,
  });
  if (!result?.handled) return null;
  return {
    handled: true,
    replyKo: result.statusKo,
    needId: result.needId,
    softChips: softChipsForNeed(result.needId, result.statusKo),
  };
}
