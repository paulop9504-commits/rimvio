"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import {
  queryMediaGuidesForEvent,
  replaceMediaGuidesForExperience,
} from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { filterPlayableMediaGuides } from "@/lib/ontology/playable-youtube-media-guide";
import { syncMediaGuideRealityObjects } from "@/lib/reality-object/attach-media-reality-object";

type MediaGuideRouteResponse = {
  ok?: boolean;
  guides?: MediaGuideNode[];
};

const MIN_YOUTUBE_GUIDES_BEFORE_SKIP = 2;

/** Refresh media guides from API — used before brain surface launch. */
export async function refreshContextMediaGuidesForEvent(
  event: EventCandidate,
): Promise<MediaGuideNode[]> {
  const cached = filterPlayableMediaGuides(queryMediaGuidesForEvent(event.id));
  const cachedYoutube = cached.filter((guide) => guide.sourceKind === "youtube");
  if (cachedYoutube.length >= MIN_YOUTUBE_GUIDES_BEFORE_SKIP) {
    syncMediaGuideRealityObjects({
      experienceEntityId: asRimvioEntityId("experience", event.id),
      guides: cached,
    });
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
    const guides = filterPlayableMediaGuides(
      Array.isArray(payload.guides) ? payload.guides : [],
    );
    const experienceEntityId = asRimvioEntityId("experience", event.id);
    replaceMediaGuidesForExperience({
      experienceEntityId,
      guides,
    });
    syncMediaGuideRealityObjects({
      experienceEntityId,
      guides,
    });
    return guides;
  } catch {
    return cached;
  }
}
