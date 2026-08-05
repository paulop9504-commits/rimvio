"use client";

import { useSyncExternalStore } from "react";
import {
  getOsakaJrVisibleLineIds,
  subscribeOsakaJrOverlay,
} from "@/lib/geo/osaka-jr/jr-overlay-store";
import type { OsakaJrLineId } from "@/lib/geo/osaka-jr/line-catalog";

export function useOsakaJrVisibleLineIds(): readonly OsakaJrLineId[] {
  return useSyncExternalStore(
    subscribeOsakaJrOverlay,
    getOsakaJrVisibleLineIds,
    getOsakaJrVisibleLineIds,
  );
}
