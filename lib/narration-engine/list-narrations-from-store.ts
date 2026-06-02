import { composeNarrations } from "@/lib/narration-engine/compose-narrations";
import type { NarrationContext, NarrationResult } from "@/lib/narration-engine/types";
import { mergeDecisionEntries } from "@/lib/container-rework/types";
import { listContainerRoutesFromStore } from "@/lib/container-rework/list-container-routes";
import { listNotificationExecutions } from "@/lib/notification-shadow/list-notification-executions";
import { listEventBehaviors } from "@/lib/behavior-engine/list-event-behaviors";
import { listRankedEventOpportunities } from "@/lib/opportunity-engine/rank-event-opportunities";
import { findEventCandidate } from "@/lib/events/event-store";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  EventNarration,
  NarrationContext,
  NarrationReasonTag,
  NarrationResult,
} from "@/lib/narration-engine/types";

export { composeNarrations } from "@/lib/narration-engine/compose-narrations";

/** Full decision stack → human-readable explanations (read-only). */
export function listNarrationsFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  narrationContext?: NarrationContext;
} = {}): NarrationResult {
  const now =
    input.narrationContext?.now ??
    input.opportunityContext?.now ??
    input.notificationContext?.now ??
    new Date();

  const opportunityContext = { ...input.opportunityContext, now };
  const opportunities = listRankedEventOpportunities(opportunityContext);
  const behaviors = listEventBehaviors(opportunityContext, input.behaviorContext ?? {});
  const notifications = listNotificationExecutions(behaviors, {
    ...input.notificationContext,
    now,
  });

  if (behaviors === "NO_ACTION") {
    return [];
  }

  const entries = mergeDecisionEntries({
    opportunities,
    behaviors,
    notifications: notifications === "NO_ACTION" ? [] : notifications,
  });

  const routes = listContainerRoutesFromStore({
    opportunityContext,
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    ui: {
      focusedEcId:
        input.narrationContext?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });

  if (routes === "NO_ACTION") {
    return [];
  }

  return composeNarrations(entries, routes, findEventCandidate, {
    focusedEcId: input.narrationContext?.focusedEcId ?? input.behaviorContext?.focusedEcId,
    recentEcIds:
      input.narrationContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    now,
  });
}
