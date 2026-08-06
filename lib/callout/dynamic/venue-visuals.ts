/**
 * Venue visuals for Callout / Place Panel — hero + gallery.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export type VenueVisuals = {
  readonly heroImageUrl: string | null;
  readonly galleryUrls: readonly string[];
  readonly kindHint: "lodging" | "eatery" | "poi" | "amenity" | "other";
};

function uniqUrls(urls: readonly (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const u = raw?.trim() ?? "";
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function resolveVenueVisualsFromNode(
  node: Pick<
    ContextWorkspaceNode,
    "kind" | "thumbnailUrl" | "galleryUrls"
  >,
): VenueVisuals {
  const gallery = uniqUrls([
    node.thumbnailUrl,
    ...(node.galleryUrls ?? []),
  ]).slice(0, 12);
  return {
    heroImageUrl: gallery[0] ?? null,
    galleryUrls: gallery,
    kindHint:
      node.kind === "lodging" ||
      node.kind === "eatery" ||
      node.kind === "poi" ||
      node.kind === "amenity"
        ? node.kind
        : "other",
  };
}
