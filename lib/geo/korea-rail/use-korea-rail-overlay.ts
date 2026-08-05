/**
 * React hook — Korea national rail overlay visible line ids (2D Workspace).
 */

"use client";

import { useSyncExternalStore } from "react";
import {
  getKoreaRailVisibleLineIds,
  subscribeKoreaRailOverlay,
} from "@/lib/geo/korea-rail/rail-overlay-store";
import type { KoreaRailLineId } from "@/lib/geo/korea-rail/line-catalog";

export function useKoreaRailVisibleLineIds(): readonly KoreaRailLineId[] {
  return useSyncExternalStore(
    subscribeKoreaRailOverlay,
    getKoreaRailVisibleLineIds,
    getKoreaRailVisibleLineIds,
  );
}
