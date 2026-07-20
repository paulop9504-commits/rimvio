import { detectRealityObjectType } from "@/lib/reality-object/detect-reality-object-type";
import type { RealityPinCompatKind } from "@/lib/reality-object/types";
import {
  listContextProjectionPlaceIds,
  resolveObjectHaloStyle,
  resolveObjectHaloStyleFromPinKind,
  resolveProjectionTierForPlace,
  selectProjectionVisual,
} from "@/lib/visual-projection";
import { runSelectiveSegmentation } from "@/lib/visual-projection/run-selective-segmentation";
import type { CutoutPresentationMode } from "@/lib/visual-projection/run-selective-segmentation";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ObjectHaloStyle, ProjectionTier } from "@/lib/visual-projection/types";

export function resolveProjectedObjectVisual(input: {
  event?: EventCandidate | null;
  placeId?: string | null;
  title: string;
  pinKind: RealityPinCompatKind;
  imageUrls: readonly string[];
  preferredUrl?: string | null;
}): {
  thumbnailUrl: string | null;
  halo: ObjectHaloStyle;
  projectionTier: ProjectionTier;
  useSegmentation: boolean;
  cutoutMode: CutoutPresentationMode;
} {
  const objectType = detectRealityObjectType({
    title: input.title,
    pinKind: input.pinKind,
    placeId: input.placeId,
  });
  const urls = [
    ...(input.preferredUrl?.trim() ? [input.preferredUrl.trim()] : []),
    ...input.imageUrls.map((u) => u.trim()).filter(Boolean),
  ];
  const unique = [...new Set(urls)];
  const selection = selectProjectionVisual({
    objectType,
    candidates: unique.map((url) => ({ url })),
    caption: input.title,
  });
  const scored = selection?.url ?? null;
  const segmentation = scored
    ? runSelectiveSegmentation({
        objectType,
        imageUrl: scored,
        recognitionScore: selection!.score.total,
        subjectHint: selection!.subject,
        caption: input.title,
      })
    : null;
  const halo = resolveObjectHaloStyle(objectType);
  const contextPlaceIds = listContextProjectionPlaceIds(input.event);
  const projectionTier = resolveProjectionTierForPlace({
    placeId: input.placeId,
    contextPlaceIds,
    contextWorkspaceActive: contextPlaceIds.size > 0,
  });
  return {
    thumbnailUrl: segmentation?.displayUrl ?? scored,
    halo,
    projectionTier,
    useSegmentation: segmentation?.useSegmentation ?? false,
    cutoutMode: segmentation?.cutoutMode ?? "none",
  };
}

export function resolveProjectedPinHalo(
  pinKind: RealityPinCompatKind,
): ObjectHaloStyle {
  return resolveObjectHaloStyleFromPinKind(pinKind);
}
