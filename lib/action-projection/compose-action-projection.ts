import { computeContextualEventActions } from "@/lib/action-projection/compute-contextual-event-actions";
import type { ActionProjectionResult } from "@/lib/action-projection/types";
import { listTimelineProjectionFromStore } from "@/lib/timeline-projection/list-timeline-projection";

/**
 * Action Projection — derived from Timeline Projection only (no direct Event Store reads).
 */
export function composeActionProjection(input?: {
  now?: Date;
}): ActionProjectionResult {
  const now = input?.now ?? new Date();
  const timeline = listTimelineProjectionFromStore({
    timelineContext: { now },
  });

  const entries = timeline.flatMap((section) =>
    section.items.flatMap((item) => {
      if (!item.startAt) {
        return [];
      }
      const actions = computeContextualEventActions({
        ecId: item.ecId,
        title: item.title,
        startAt: item.startAt,
        now,
      });
      if (actions.length === 0) {
        return [];
      }
      return [
        {
          ecId: item.ecId,
          title: item.title,
          startAt: item.startAt,
          actions,
        },
      ];
    })
  );

  return {
    computedAt: now.toISOString(),
    entries,
  };
}
