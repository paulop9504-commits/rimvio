"use client";

import { useEffect, useState } from "react";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { GLOBE_TEXTURE_ZOOM } from "@/lib/experience-graph/reproject-mercator-to-equirectangular";
import {
  buildGlobeEquirectTextureUrl,
  readGlobeEquirectCache,
} from "@/lib/globe/build-globe-equirect-texture";

export type GlobeEquirectTextureState = {
  textureUrl: string | null;
  loading: boolean;
  error: string | null;
};

/** Build a cached full-earth equirectangular texture for globe.gl `globeImageUrl`. */
export function useGlobeEquirectTexture(
  style: GlobeMapTileStyle,
): GlobeEquirectTextureState {
  const [textureUrl, setTextureUrl] = useState<string | null>(() =>
    readGlobeEquirectCache(style),
  );
  const [loading, setLoading] = useState(!textureUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (textureUrl) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void buildGlobeEquirectTextureUrl(style, GLOBE_TEXTURE_ZOOM)
      .then((url) => {
        if (cancelled) {
          return;
        }
        setTextureUrl(url);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "texture_build_failed");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [style, textureUrl]);

  return { textureUrl, loading, error };
}

/** Google Earth–style colored overview base (CARTO Voyager). */
export function useGlobeOverviewTexture(): GlobeEquirectTextureState {
  return useGlobeEquirectTexture("voyager");
}
