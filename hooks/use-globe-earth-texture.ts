"use client";

import type { GlobeEquirectTextureState } from "@/hooks/use-globe-equirect-texture";
import { useGlobeEquirectTexture } from "@/hooks/use-globe-equirect-texture";

export type GlobeEarthTextureState = GlobeEquirectTextureState;

/** Build a full-earth equirectangular satellite texture once (cached). */
export function useGlobeEarthTexture(): GlobeEarthTextureState {
  return useGlobeEquirectTexture("satellite");
}
