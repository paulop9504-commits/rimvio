/**
 * React hook — Japan nationwide subway visible line ids (2D Workspace).
 */

"use client";

import { useSyncExternalStore } from "react";
import {
  getJapanMetroVisibleLineIds,
  subscribeJapanMetroOverlay,
} from "@/lib/geo/japan-metro/metro-overlay-store";
import type { JapanMetroLineId } from "@/lib/geo/japan-metro/line-catalog";

export function useJapanMetroVisibleLineIds(): readonly JapanMetroLineId[] {
  return useSyncExternalStore(
    subscribeJapanMetroOverlay,
    getJapanMetroVisibleLineIds,
    getJapanMetroVisibleLineIds,
  );
}
