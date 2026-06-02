import { composeDockFeed } from "@/lib/dock-feed/compose-dock-feed";
import type { DockFeedContext, DockFeedResult } from "@/lib/dock-feed/types";
import { listContainerRoutesFromStore } from "@/lib/container-rework/list-container-routes";
import { findEventCandidate } from "@/lib/events/event-store";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  DockCard,
  DockFeedContext,
  DockFeedResult,
  DockRenderMode,
  PriorityVisualState,
  ContainerOrigin,
} from "@/lib/dock-feed/types";

export { composeDockFeed } from "@/lib/dock-feed/compose-dock-feed";

/** Full decision stack → Netflix-style Dock feed (read-only). */
export function listDockFeedFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  dockContext?: DockFeedContext;
} = {}): DockFeedResult {
  const routes = listContainerRoutesFromStore({
    opportunityContext: input.opportunityContext,
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    ui: {
      focusedEcId:
        input.dockContext?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });

  if (routes === "NO_ACTION") {
    return [];
  }

  return composeDockFeed(routes, findEventCandidate, {
    focusedEcId: input.dockContext?.focusedEcId,
    recentEcIds:
      input.dockContext?.recentEcIds ?? input.behaviorContext?.recentEcIds,
    scrollPosition: input.dockContext?.scrollPosition,
    dockVisible: input.dockContext?.dockVisible,
  });
}
