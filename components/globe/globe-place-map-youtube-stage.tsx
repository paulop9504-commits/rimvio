"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import {
  buildBrainSurfaceEmbedSrc,
  GlobeBrainSurfaceVideoChip,
} from "@/components/globe/globe-brain-surface-video-chip";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { dispatchGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import {
  dispatchPlaceMapYoutubeClose,
  subscribePlaceMapYoutubeClose,
  subscribePlaceMapYoutubeOpen,
  type PlaceMapYoutubePlayback,
} from "@/lib/globe/place-map-youtube-bridge";

export type GlobePlaceMapYoutubeStageProps = {
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
};

/** Renders place YouTube clips pin-anchored on the map when discovery asks to play. */
export function GlobePlaceMapYoutubeStage({
  globeRef,
}: GlobePlaceMapYoutubeStageProps) {
  const [playback, setPlayback] = useState<PlaceMapYoutubePlayback | null>(null);

  useEffect(() => {
    const unsubOpen = subscribePlaceMapYoutubeOpen((detail) => {
      setPlayback(detail);
      globeRef.current?.flyToPin(detail.lat, detail.lng, "street", {
        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
      });
    });
    const unsubClose = subscribePlaceMapYoutubeClose(() => {
      setPlayback(null);
    });
    return () => {
      unsubOpen();
      unsubClose();
    };
  }, [globeRef]);

  useEffect(() => {
    if (!playback) {
      dispatchGlobeMapMediaFocus(false, "place_youtube");
      return;
    }
    dispatchGlobeMapMediaFocus(true, "place_youtube");
    return () => {
      dispatchGlobeMapMediaFocus(false, "place_youtube");
    };
  }, [playback]);

  if (!playback) {
    return null;
  }

  const embedSrc = buildBrainSurfaceEmbedSrc(playback.embedUrl);
  if (!embedSrc) {
    return null;
  }

  return (
    <GlobeBrainSurfaceVideoChip
      embedSrc={embedSrc}
      embedKey={playback.videoId}
      title={playback.title?.trim() || playback.placeLabel?.trim() || "영상"}
      caption={playback.channelTitle}
      eyebrow={playback.placeLabel}
      lat={playback.lat}
      lng={playback.lng}
      thumbnailUrl={playback.thumbnailUrl}
      onClose={() => {
        dispatchPlaceMapYoutubeClose();
        setPlayback(null);
      }}
      placement="pin"
      globeRef={globeRef}
    />
  );
}
