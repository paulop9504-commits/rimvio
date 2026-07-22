/**
 * One-line WIP chips for Context AI prompt — Hub action log + live phase.
 * Chronological (newest first). No new surface / dashboard.
 */

import { formatHubActionTimelineLabel } from "@/lib/globe/resource/format-hub-action-timeline";
import type { HubAction } from "@/lib/globe/resource/hub-action-record";

export type ContextAssistantWorkChip = {
  id: string;
  labelKo: string;
  status: HubAction["status"];
};

const DEFAULT_MAX = 5;

export function buildContextAssistantWorkChips(input: {
  hubLog: readonly HubAction[];
  /** In-flight phase (찾는 중… etc.) — always first when set. */
  liveLabelKo?: string | null;
  max?: number;
}): ContextAssistantWorkChip[] {
  const max = Math.max(1, input.max ?? DEFAULT_MAX);
  const chips: ContextAssistantWorkChip[] = [];
  const live = input.liveLabelKo?.trim();
  if (live) {
    chips.push({
      id: "live",
      labelKo: live,
      status: "pending",
    });
  }

  const remaining = max - chips.length;
  if (remaining <= 0) {
    return chips;
  }

  const fromLog = [...input.hubLog]
    .map((action) => {
      const labelKo = formatHubActionTimelineLabel(action);
      if (!labelKo) {
        return null;
      }
      return {
        id: action.actionId,
        labelKo,
        status: action.status,
        createdAt: action.createdAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, remaining)
    .map(({ id, labelKo, status }) => ({ id, labelKo, status }));

  return [...chips, ...fromLog];
}
