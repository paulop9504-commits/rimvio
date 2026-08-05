/**
 * React hook — Map reads network absorb Projection SSOT (not domain overlay stores).
 */

"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { NetworkAbsorbFamily } from "@/lib/reality-provider/network-absorb-projection";
import {
  getNetworkAbsorbVisibleLineIds,
  setNetworkAbsorbProjection,
  subscribeNetworkAbsorbProjection,
} from "@/lib/reality-provider/network-absorb-projection-store";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
} from "@/lib/context-workspace/workspace-store";
import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";
import type { OsakaJrLineId } from "@/lib/geo/osaka-jr/line-catalog";
import type { JapanMetroLineId } from "@/lib/geo/japan-metro/line-catalog";
import type { JapanShinkansenLineId } from "@/lib/geo/japan-shinkansen/line-catalog";
import type { KoreaRailLineId } from "@/lib/geo/korea-rail/line-catalog";

export function useNetworkAbsorbVisibleLineIds(
  family: NetworkAbsorbFamily,
): readonly string[] {
  return useSyncExternalStore(
    subscribeNetworkAbsorbProjection,
    () => getNetworkAbsorbVisibleLineIds(family),
    () => getNetworkAbsorbVisibleLineIds(family),
  );
}

/**
 * When Workspace opens / updates, hydrate session Projection from durable SSOT.
 */
export function useHydrateNetworkAbsorbFromWorkspace(
  contextEventId: string | null | undefined,
): void {
  const id = contextEventId?.trim() ?? "";
  useEffect(() => {
    if (!id) return;
    const hydrate = () => {
      const ws = readContextWorkspace(id);
      if (ws?.networkAbsorb?.version === 1) {
        setNetworkAbsorbProjection(ws.networkAbsorb);
      }
    };
    hydrate();
    return subscribeContextWorkspaceUpdated((eventId) => {
      if (eventId === id) hydrate();
    });
  }, [id]);
}

export function useOsakaMetroAbsorbLineIds(): readonly OsakaMetroLineId[] {
  return useNetworkAbsorbVisibleLineIds(
    "osaka_metro",
  ) as readonly OsakaMetroLineId[];
}

export function useOsakaJrAbsorbLineIds(): readonly OsakaJrLineId[] {
  return useNetworkAbsorbVisibleLineIds("osaka_jr") as readonly OsakaJrLineId[];
}

export function useJapanMetroAbsorbLineIds(): readonly JapanMetroLineId[] {
  return useNetworkAbsorbVisibleLineIds(
    "japan_metro",
  ) as readonly JapanMetroLineId[];
}

export function useJapanShinkansenAbsorbLineIds(): readonly JapanShinkansenLineId[] {
  return useNetworkAbsorbVisibleLineIds(
    "shinkansen",
  ) as readonly JapanShinkansenLineId[];
}

export function useKoreaRailAbsorbLineIds(): readonly KoreaRailLineId[] {
  return useNetworkAbsorbVisibleLineIds(
    "korea_rail",
  ) as readonly KoreaRailLineId[];
}
