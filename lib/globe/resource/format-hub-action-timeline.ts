/**
 * User-facing Hub action timeline labels (L1).
 * @see docs/GLOBE_HUB_RESOURCE.md — Action Log
 */

import { copy } from "@/lib/copy/human-ko";
import type { HubAction } from "@/lib/globe/resource/hub-action-record";

export type HubActionTimelineRow = {
  actionId: string;
  labelKo: string;
  status: HubAction["status"];
  createdAt: string;
};

function hubKindLabel(sourceHubId: string | undefined): string {
  switch (sourceHubId) {
    case "lodging":
      return copy.globe.hubActionLog.hubLodging;
    case "flight":
      return copy.globe.hubActionLog.hubFlight;
    case "eatery":
      return copy.globe.hubActionLog.hubEatery;
    default:
      return copy.globe.hubActionLog.hubGeneric;
  }
}

export function formatHubActionTimelineLabel(action: HubAction): string | null {
  const hub = hubKindLabel(action.sourceHubId);
  switch (action.type) {
    case "search":
      return copy.globe.hubActionLog.search(hub);
    case "reserve":
      return copy.globe.hubActionLog.reserve(hub);
    case "purchase":
      return copy.globe.hubActionLog.purchase(hub);
    case "cancel":
      return copy.globe.hubActionLog.cancel(hub);
    default:
      return null;
  }
}

/** Recent success rows for Hub rail — reserve/purchase first, then search. */
export function buildHubActionTimelineRows(
  log: readonly HubAction[],
  max = 4,
): HubActionTimelineRow[] {
  const priority = (action: HubAction): number => {
    if (action.status !== "success") {
      return 10;
    }
    switch (action.type) {
      case "purchase":
        return 0;
      case "reserve":
        return 1;
      case "search":
        return 2;
      default:
        return 3;
    }
  };

  return [...log]
    .filter((action) => formatHubActionTimelineLabel(action) != null)
    .sort((a, b) => {
      const p = priority(a) - priority(b);
      if (p !== 0) {
        return p;
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, max)
    .map((action) => ({
      actionId: action.actionId,
      labelKo: formatHubActionTimelineLabel(action)!,
      status: action.status,
      createdAt: action.createdAt,
    }));
}
