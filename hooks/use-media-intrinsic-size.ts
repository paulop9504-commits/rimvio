"use client";

import { useCallback, useState, type SyntheticEvent } from "react";

export type MediaIntrinsicSize = {
  width: number;
  height: number;
};

/** Natural width/height from a loaded image or video element. */
export function useMediaIntrinsicSize() {
  const [size, setSize] = useState<MediaIntrinsicSize | null>(null);

  const reset = useCallback(() => {
    setSize(null);
  }, []);

  const onImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const el = event.currentTarget;
    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
      setSize({ width: el.naturalWidth, height: el.naturalHeight });
    }
  }, []);

  const onVideoMetadata = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const el = event.currentTarget;
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      setSize({ width: el.videoWidth, height: el.videoHeight });
    }
  }, []);

  return {
    size,
    reset,
    onImageLoad,
    onVideoMetadata,
  };
}
