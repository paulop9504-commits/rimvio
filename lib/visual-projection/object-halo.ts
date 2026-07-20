import type { RealityObjectType } from "@/lib/reality-object/types";
import type {
  ObjectHaloFamily,
  ObjectHaloStyle,
} from "@/lib/visual-projection/types";

const STYLES: Record<ObjectHaloFamily, ObjectHaloStyle> = {
  food: {
    family: "food",
    discoveryAccent: "orange",
    haloColor: "rgba(255, 149, 0, 0.45)",
    aspectRatio: "1:1",
    glyph: "🍜",
  },
  lodging: {
    family: "lodging",
    discoveryAccent: "blue",
    haloColor: "rgba(49, 130, 246, 0.42)",
    aspectRatio: "16:9",
    glyph: "🏨",
  },
  landmark: {
    family: "landmark",
    discoveryAccent: "purple",
    haloColor: "rgba(191, 90, 242, 0.42)",
    aspectRatio: "4:3",
    glyph: "🏯",
  },
  shopping: {
    family: "shopping",
    discoveryAccent: "green",
    haloColor: "rgba(52, 199, 89, 0.4)",
    aspectRatio: "1:1",
    glyph: "🛍",
  },
  media: {
    family: "media",
    discoveryAccent: "purple",
    haloColor: "rgba(142, 142, 147, 0.35)",
    aspectRatio: "1:1",
    glyph: "🎥",
  },
  transit: {
    family: "transit",
    discoveryAccent: "blue",
    haloColor: "rgba(90, 200, 250, 0.4)",
    aspectRatio: "1:1",
    glyph: "🚃",
  },
  generic: {
    family: "generic",
    discoveryAccent: "green",
    haloColor: "rgba(142, 142, 147, 0.3)",
    aspectRatio: "1:1",
    glyph: "📍",
  },
};

const GLYPH_BY_TYPE: Partial<Record<RealityObjectType, string>> = {
  restaurant: "🍜",
  cafe: "☕",
  hotel: "🏨",
  accommodation: "🏨",
  landmark: "🏯",
  activity: "🎡",
  experience: "✨",
  shopping: "🛍",
  photo: "📷",
  video: "🎥",
  reel: "🎥",
  memory: "📷",
  flight: "✈️",
  train: "🚃",
  ticket: "🎫",
  parking: "🅿",
  rental_car: "🚗",
};

export function haloFamilyForObjectType(
  objectType: RealityObjectType | null | undefined,
): ObjectHaloFamily {
  switch (objectType) {
    case "restaurant":
    case "cafe":
      return "food";
    case "hotel":
    case "accommodation":
      return "lodging";
    case "landmark":
    case "activity":
    case "experience":
      return "landmark";
    case "shopping":
    case "product":
      return "shopping";
    case "photo":
    case "video":
    case "reel":
    case "post":
    case "memory":
      return "media";
    case "flight":
    case "train":
    case "ticket":
    case "rental_car":
    case "parking":
      return "transit";
    default:
      return "generic";
  }
}

export function resolveObjectHaloStyle(
  objectType: RealityObjectType | null | undefined,
): ObjectHaloStyle {
  const family = haloFamilyForObjectType(objectType);
  const base = STYLES[family];
  const glyph = (objectType && GLYPH_BY_TYPE[objectType]) || base.glyph;
  return { ...base, glyph };
}

/** Pin-compat kind → halo when RealityObjectType not yet known. */
export function resolveObjectHaloStyleFromPinKind(
  pinKind: "eatery" | "lodging" | "activity" | "amenity" | null | undefined,
): ObjectHaloStyle {
  if (pinKind === "eatery") {
    return resolveObjectHaloStyle("restaurant");
  }
  if (pinKind === "lodging") {
    return resolveObjectHaloStyle("hotel");
  }
  if (pinKind === "amenity") {
    return resolveObjectHaloStyle("shopping");
  }
  if (pinKind === "activity") {
    return resolveObjectHaloStyle("landmark");
  }
  return resolveObjectHaloStyle(null);
}
