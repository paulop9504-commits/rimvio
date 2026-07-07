import { parseContextConditionPinPlaceId } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { GlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";

export function isContextConditionChildCluster(cluster: PinCluster): boolean {
  return cluster.eventId.includes(":ctxcond:");
}

function parentContextFromChildEventId(eventId: string): string | null {
  const index = eventId.indexOf(":ctxcond:");
  if (index <= 0) {
    return null;
  }
  return eventId.slice(0, index);
}

function matchesVisiblePlace(cluster: PinCluster, visiblePlaceIds: ReadonlySet<string>): boolean {
  const parsed = parseContextConditionPinPlaceId(cluster.eventId);
  if (!parsed) {
    return false;
  }
  return visiblePlaceIds.has(parsed.placeId);
}

/** Pin clusters — scout children stay folded until ontology focus. */
export function filterPinClustersForLayerPolicy(
  clusters: readonly PinCluster[],
  policy: GlobeProjectionLayerPolicy,
): PinCluster[] {
  const activeId = policy.activeContextEventId?.trim() ?? "";

  if (policy.mode === "overview") {
    return clusters.filter((cluster) => !isContextConditionChildCluster(cluster));
  }

  if (!activeId) {
    return clusters.filter((cluster) => !isContextConditionChildCluster(cluster));
  }

  const visible = new Set(
    policy.visiblePlaceIds.map((placeId) => placeId.trim()).filter(Boolean),
  );

  switch (policy.mode) {
    case "folded":
    case "context_only":
      return clusters.filter((cluster) => {
        if (isContextConditionChildCluster(cluster)) {
          return false;
        }
        return cluster.eventId.trim() === activeId;
      });
    case "focus":
      return clusters.filter((cluster) => {
        if (cluster.eventId.trim() === activeId) {
          return true;
        }
        if (!isContextConditionChildCluster(cluster)) {
          return false;
        }
        if (parentContextFromChildEventId(cluster.eventId) !== activeId) {
          return false;
        }
        if (visible.size === 0) {
          return false;
        }
        return matchesVisiblePlace(cluster, visible);
      });
    default:
      return clusters.filter((cluster) => !isContextConditionChildCluster(cluster));
  }
}
