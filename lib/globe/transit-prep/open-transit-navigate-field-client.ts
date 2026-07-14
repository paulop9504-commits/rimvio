"use client";

import { dispatchCapability } from "@/lib/capability-registry";
import {
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";

export type OpenTransitNavigateFieldResult = {
  readonly opened: boolean;
  readonly navigateUrl: string | null;
  readonly capabilityDispatched: boolean;
  readonly providerId: string;
};

/** Field path — external map deeplink + NAVIGATE capability handoff. */
export function openTransitNavigateFieldClient(input: {
  contextEventId: string;
  destination: string;
  providerId?: "kakao_navi" | "naver_map" | "google_maps";
}): OpenTransitNavigateFieldResult {
  const destination = input.destination.trim();
  if (!destination) {
    return {
      opened: false,
      navigateUrl: null,
      capabilityDispatched: false,
      providerId: input.providerId ?? "kakao_navi",
    };
  }

  const providerId = input.providerId ?? "kakao_navi";
  const navigateUrl =
    providerId === "naver_map"
      ? buildNaverMapSearchWebHref(destination)
      : buildKakaoMapSearchWebHref(destination);

  const capability = dispatchCapability({
    capabilityId: "NAVIGATE",
    inputs: { destination },
    providerId,
    metadata: {
      surfaceId: input.contextEventId,
      eventId: input.contextEventId,
    },
  });

  if (typeof window !== "undefined") {
    window.open(navigateUrl, "_blank", "noopener,noreferrer");
  }

  return {
    opened: true,
    navigateUrl,
    capabilityDispatched: capability.ok,
    providerId,
  };
}
