import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

/** YouTube guides must carry a verified embed URL — owner-blocked videos stay out of Rimvio surfaces. */
export function isPlayableYoutubeMediaGuide(guide: MediaGuideNode): boolean {
  if (guide.sourceKind !== "youtube") {
    return true;
  }
  return Boolean(guide.embedUrl?.trim());
}

export function filterPlayableMediaGuides<
  T extends MediaGuideNode,
>(guides: readonly T[]): T[] {
  return guides.filter(isPlayableYoutubeMediaGuide);
}
