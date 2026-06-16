import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

export type HubContextAlternate = {
  eventId: string;
  title: string;
  place: string;
};

export type HubCarouselSlide =
  | { kind: "resource"; row: ContextHubServiceRow }
  | { kind: "context"; alternate: HubContextAlternate };

export function buildHubCarouselSlides(input: {
  resources: readonly ContextHubServiceRow[];
  alternates: readonly HubContextAlternate[];
  activeEventId: string;
}): HubCarouselSlide[] {
  const slides: HubCarouselSlide[] = input.resources.map((row) => ({
    kind: "resource",
    row,
  }));

  for (const alternate of input.alternates) {
    if (alternate.eventId === input.activeEventId) {
      continue;
    }
    slides.push({ kind: "context", alternate });
  }

  return slides;
}
