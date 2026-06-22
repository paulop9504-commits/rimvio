/** Shared map focus hero — width capped; height follows photo orientation. */
export const GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS =
  "w-full max-w-[min(100vw-1.5rem,16.5rem)] shrink-0 sm:max-w-[18rem]";

/** Portrait / landscape shell — aspect ratio set inline from intrinsic media size. */
export const GLOBE_MAP_FOCUS_HERO_SHELL_CLASS =
  "relative mx-auto w-full max-h-[min(52vh,24rem)] overflow-hidden bg-[#141416]";

/** Fallback while dimensions load (landscape). */
export const GLOBE_MAP_FOCUS_HERO_SHELL_FALLBACK_ASPECT = "16 / 10";

export const GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS =
  "h-full w-full object-contain object-center";

export const GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS =
  `pointer-events-none ${GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS}`;

export function resolveGlobeMapFocusHeroShellStyle(input: {
  width: number;
  height: number;
} | null): { aspectRatio: string } {
  if (!input || input.width <= 0 || input.height <= 0) {
    return { aspectRatio: GLOBE_MAP_FOCUS_HERO_SHELL_FALLBACK_ASPECT };
  }
  return { aspectRatio: `${input.width} / ${input.height}` };
}

/** Pin-anchored card — sits above the map pin (early floating card). */
export const GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX = 14;
