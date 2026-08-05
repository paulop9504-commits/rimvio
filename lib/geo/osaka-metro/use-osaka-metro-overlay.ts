/**
 * React hook — Osaka Metro overlay visible line ids (2D Workspace).
 */

"use client";

import { useSyncExternalStore } from "react";
import {
  getOsakaMetroVisibleLineIds,
  subscribeOsakaMetroOverlay,
} from "@/lib/geo/osaka-metro/metro-overlay-store";
import type { OsakaMetroLineId } from "@/lib/geo/osaka-metro/line-catalog";

export function useOsakaMetroVisibleLineIds(): readonly OsakaMetroLineId[] {
  return useSyncExternalStore(
    subscribeOsakaMetroOverlay,
    getOsakaMetroVisibleLineIds,
    getOsakaMetroVisibleLineIds,
  );
}
