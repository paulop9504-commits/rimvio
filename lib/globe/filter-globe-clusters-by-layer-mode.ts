import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { isExternalPinCluster } from "@/lib/globe/merge-globe-pin-clusters";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectExternalPinClusters } from "@/lib/globe/project-external-globe-trace";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";

/** Personal layer — life traces only; @중고 trade anchors live in manage sheet. */
export function filterPersonalGlobeClusters(
  clusters: readonly PinCluster[],
): PinCluster[] {
  return clusters.filter(
    (cluster) =>
      !cluster.marketRole &&
      cluster.variant !== "bridge_ghost" &&
      !isExternalPinCluster(cluster),
  );
}

export function projectDiscoveryGlobeClusters(input: {
  externalTraces: readonly ExternalGlobeTrace[];
}): PinCluster[] {
  return projectExternalPinClusters(input.externalTraces);
}

export function resolveGlobeClustersForLayerMode(input: {
  mode: GlobeLayerMode;
  personalClusters: readonly PinCluster[];
  bridgeGhostClusters?: readonly PinCluster[];
  externalTraces?: readonly ExternalGlobeTrace[];
}): PinCluster[] {
  if (input.mode === "discovery") {
    return projectDiscoveryGlobeClusters({
      externalTraces: input.externalTraces ?? [],
    });
  }

  const personal = filterPersonalGlobeClusters(input.personalClusters);
  const ghosts = input.bridgeGhostClusters ?? [];
  if (ghosts.length === 0) {
    return [...personal];
  }
  return [...personal, ...ghosts];
}
