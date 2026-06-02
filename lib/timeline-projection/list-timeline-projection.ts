import { composeTimelineProjection } from "@/lib/timeline-projection/compose-timeline-projection";
import type { TimelineProjectionContext, TimelineProjectionResult } from "@/lib/timeline-projection/types";
import { listContainerRoutesFromStore } from "@/lib/container-rework/list-container-routes";
import { findEventCandidate } from "@/lib/events/event-store";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  TimelineItem,
  TimelineProjectionContext,
  TimelineProjectionResult,
  TimelineSection,
  TimelineSectionName,
  TimelineVisualState,
} from "@/lib/timeline-projection/types";

export { composeTimelineProjection } from "@/lib/timeline-projection/compose-timeline-projection";

/** Full decision stack → time-ordered timeline projection (read-only). */
export function listTimelineProjectionFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  timelineContext?: TimelineProjectionContext;
} = {}): TimelineProjectionResult {
  const now = input.timelineContext?.now ?? input.opportunityContext?.now ?? new Date();

  const routes = listContainerRoutesFromStore({
    opportunityContext: { ...input.opportunityContext, now },
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    ui: {
      focusedEcId:
        input.timelineContext?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });

  if (routes === "NO_ACTION") {
    return [];
  }

  return composeTimelineProjection(routes, findEventCandidate, {
    focusedEcId: input.timelineContext?.focusedEcId,
    recentEcIds:
      input.timelineContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    now,
  });
}
