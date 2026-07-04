import type { BrainSurfaceCandidateFamily } from "@/lib/situation-projection/brain-surface-types";

const FAMILY_STOCK: Record<BrainSurfaceCandidateFamily, string> = {
  media: "https://images.unsplash.com/photo-1478737270609-ffe7197d8a74?w=480&q=80",
  trace_place: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
  eatery: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=480&q=80",
  lodging: "https://images.unsplash.com/photo-1566073771259-6a8506099925?w=480&q=80",
  info: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
  event: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=480&q=80",
  memo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
};

export function resolveBrainSurfaceMarkerThumbnail(input: {
  family: BrainSurfaceCandidateFamily;
  thumbnailUrl?: string | null;
}): string | null {
  const explicit = input.thumbnailUrl?.trim();
  if (explicit) {
    return explicit;
  }
  return FAMILY_STOCK[input.family] ?? null;
}

export function resolveBrainSurfaceMarkerMediaKind(input: {
  family: BrainSurfaceCandidateFamily;
  embedUrl?: string | null;
}): "image" | "video" | null {
  if (input.family === "media" && input.embedUrl?.trim()) {
    return "video";
  }
  return "image";
}
