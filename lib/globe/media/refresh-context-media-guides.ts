"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import {
  queryMediaGuidesForEvent,
  replaceMediaGuidesForExperience,
} from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

type MediaGuideRouteResponse = {
  ok?: boolean;
  guides?: MediaGuideNode[];
};

const MIN_YOUTUBE_GUIDES_BEFORE_SKIP = 2;

/** Refresh media guides from API — used before brain surface launch. */
export async function refreshContextMediaGuidesForEvent(
  event: EventCandidate,
): Promise<MediaGuideNode[]> {
  const cached = queryMediaGuidesForEvent(event.id);
  const cachedYoutube = cached.filter((guide) => guide.sourceKind === "youtube");
  if (cachedYoutube.length >= MIN_YOUTUBE_GUIDES_BEFORE_SKIP) {
    return cached;
  }

  if (typeof window === "undefined") {
    return cached;
  }

  try {
    const response = await fetch("/api/globe/media-guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
    if (!response.ok) {
      return cached;
    }
    const payload = (await response.json()) as MediaGuideRouteResponse;
    const guides = Array.isArray(payload.guides) ? payload.guides : [];
    replaceMediaGuidesForExperience({
      experienceEntityId: asRimvioEntityId("experience", event.id),
      guides,
    });
    return guides;
  } catch {
    return cached;
  }
}
