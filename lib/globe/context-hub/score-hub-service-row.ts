import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { getActionTypeRankWeightForHubService } from "@/lib/event-kernel/action-contracts/rimvio-action-type-registry";

/** Hub row score — action type rankWeight is SSOT for MAIN ordering. */
export function scoreHubServiceRowBase(row: ContextHubServiceRow): number {
  if (!row.offered) {
    return 0;
  }

  const actionWeight = getActionTypeRankWeightForHubService(row.serviceId);
  if (!row.implemented) {
    return Math.min(actionWeight, 10);
  }
  if (row.connected && row.link?.actionUrl) {
    return actionWeight + 8;
  }
  if (row.handoffHref) {
    return actionWeight + 4;
  }
  if (row.connected) {
    return actionWeight - 10;
  }
  return actionWeight - 25;
}
