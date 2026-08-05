/**
 * React hook — Japan Shinkansen overlay visible line ids (2D Workspace).
 */

"use client";

import { useSyncExternalStore } from "react";
import {
  getJapanShinkansenVisibleLineIds,
  subscribeJapanShinkansenOverlay,
} from "@/lib/geo/japan-shinkansen/shinkansen-overlay-store";
import type { JapanShinkansenLineId } from "@/lib/geo/japan-shinkansen/line-catalog";

export function useJapanShinkansenVisibleLineIds(): readonly JapanShinkansenLineId[] {
  return useSyncExternalStore(
    subscribeJapanShinkansenOverlay,
    getJapanShinkansenVisibleLineIds,
    getJapanShinkansenVisibleLineIds,
  );
}
