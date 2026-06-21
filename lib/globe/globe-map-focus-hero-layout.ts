/** Shared map focus hero — 16:10 rectangle (early Rimvio map replay). */
export const GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS =
  "w-full max-w-[min(100vw-1.5rem,16.5rem)] shrink-0 sm:max-w-[18rem]";

/** Fixed aspect shell — photo/video fill with crop (not letterboxed contain). */
export const GLOBE_MAP_FOCUS_HERO_SHELL_CLASS =
  "relative aspect-[16/10] w-full overflow-hidden bg-[#141416]";

export const GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS =
  "h-full w-full object-cover object-center";

export const GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS =
  `pointer-events-none ${GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS}`;

/** Pin-anchored card — sits above the map pin (early floating card). */
export const GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX = 14;
