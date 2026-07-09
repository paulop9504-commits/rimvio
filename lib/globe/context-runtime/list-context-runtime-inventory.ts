import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { queryMediaGuidesForEvent } from "@/lib/ontology/media-guide-store";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { activitySubtypeNoun } from "@/lib/globe/place/activity-subtype-presentation";
import type {
  ContextRuntimeInventory,
  ContextRuntimeItem,
  ContextRuntimeSection,
} from "@/lib/globe/context-runtime/types";

function pinSubtitle(input: {
  source?: string | null;
  kind?: string | null;
  activitySubtype?: LocalDiscoveryActivitySubtype | null;
  photoCount?: number;
  videoCount?: number;
}): string | null {
  const parts: string[] = [];
  const activityLabel = `${activitySubtypeNoun(input.activitySubtype ?? "general")} 탐색`;
  if (input.source === "context_condition_ai") {
    parts.push(
      input.kind === "lodging"
        ? "숙소 탐색"
        : input.kind === "activity"
          ? activityLabel
          : input.kind === "amenity"
            ? "편의 장소 탐색"
            : "맛집 탐색",
    );
  } else if (input.source === "accommodation_search") {
    parts.push("숙소 탐색");
  }
  if ((input.videoCount ?? 0) > 0) {
    parts.push("영상");
  } else if ((input.photoCount ?? 0) > 0) {
    parts.push("사진");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildPinnedItem(
  eventId: string,
  pinned: NonNullable<ReturnType<typeof readPinnedContextItem>>,
): ContextRuntimeItem {
  const runtimeKind =
    pinned.kind === "lodging"
      ? "pinned_lodging"
      : pinned.kind === "activity"
        ? "pinned_activity"
        : pinned.kind === "amenity"
          ? "pinned_amenity"
          : "pinned_eatery";
  const subtitle =
    pinned.kind === "lodging"
      ? "확정 숙소"
      : pinned.kind === "activity"
        ? "확정 놀거리"
        : pinned.kind === "amenity"
          ? "확정 편의 장소"
          : "확정 맛집";
  return {
    id: `pinned:${pinned.resourceId}`,
    kind: runtimeKind,
    label: pinned.label,
    subtitle,
    lat: pinned.lat ?? null,
    lng: pinned.lng ?? null,
    previewUrl: pinned.previewUrl ?? null,
    pinned: true,
    actions: ["fly", "unpin"],
  };
}

function buildGlobePinItem(
  eventId: string,
  pin: ReturnType<typeof listPersonalGlobePins>[number],
  pinnedPlaceId: string | null,
): ContextRuntimeItem | null {
  const isAnchor = pin.eventId === eventId;
  if (isAnchor) {
    return {
      id: `pin:${pin.pinId}`,
      kind: "globe_pin",
      label: pin.experienceTitle || pin.placeLabel,
      subtitle: "맥락 위치",
      lat: pin.lat,
      lng: pin.lng,
      previewUrl: null,
      pinEventId: pin.eventId,
      pinSource: pin.source ?? null,
      actions: ["fly"],
    };
  }

  if (pin.parentContextEventId !== eventId) {
    return null;
  }

  const placeId =
    pin.eventId.split(":acc:").pop()?.trim() ||
    pin.eventId.split(":ctxcond:").pop()?.split(":").pop()?.trim() ||
    null;
  if (pinnedPlaceId && placeId && pinnedPlaceId === placeId) {
    return null;
  }

  return {
    id: `pin:${pin.pinId}`,
    kind: "globe_pin",
    label: pin.experienceTitle || pin.placeLabel,
    subtitle: pinSubtitle({
      source: pin.source,
      kind: pin.contextConditionKind,
      activitySubtype: pin.contextConditionActivitySubtype,
      photoCount: pin.photoCount,
      videoCount: pin.videoCount,
    }),
    lat: pin.lat,
    lng: pin.lng,
    previewUrl: null,
    pinEventId: pin.eventId,
    pinSource: pin.source ?? null,
    actions: ["fly", "remove_pin"],
  };
}

function buildMediaItem(
  guide: ReturnType<typeof queryMediaGuidesForEvent>[number],
): ContextRuntimeItem {
  return {
    id: `media:${guide.guideNodeId}`,
    kind: "media_guide",
    label: guide.title?.trim() || "영상",
    subtitle: guide.sourceKind === "youtube" ? "YouTube" : "가이드",
    previewUrl: guide.thumbnailUrl ?? null,
    guideNodeId: guide.guideNodeId,
    actions: ["remove_media"],
  };
}

export function listContextRuntimeInventory(
  event: EventCandidate | null | undefined,
): ContextRuntimeInventory | null {
  const eventId = event?.id?.trim();
  if (!eventId || !event) {
    return null;
  }

  const pinned = readPinnedContextItem(event);
  const pinnedPlaceId = pinned?.placeId ?? null;

  const pinnedItems: ContextRuntimeItem[] = pinned
    ? [buildPinnedItem(eventId, pinned)]
    : [];

  const pinItems: ContextRuntimeItem[] = [];
  for (const pin of listPersonalGlobePins()) {
    const item = buildGlobePinItem(eventId, pin, pinnedPlaceId);
    if (item) {
      pinItems.push(item);
    }
  }

  const mediaItems = queryMediaGuidesForEvent(eventId, { max: 24 }).map(buildMediaItem);

  const sections: ContextRuntimeSection[] = [];
  if (pinnedItems.length > 0) {
    sections.push({ key: "pinned", items: pinnedItems });
  }
  if (pinItems.length > 0) {
    sections.push({ key: "pins", items: pinItems });
  }
  if (mediaItems.length > 0) {
    sections.push({ key: "media", items: mediaItems });
  }

  const totalCount = pinnedItems.length + pinItems.length + mediaItems.length;
  return { eventId, sections, totalCount };
}
