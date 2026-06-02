/** Master brand logo — hand / neural mark (685×783 source PNG). */
export const GLANGO_LOGO_SRC = "/brand/glango-logo-source.png";

/** UI mark — transparent plate for nav / feed / headers. */
export const GLANGO_LOGO_TRANSPARENT_SRC = "/brand/glango-logo-transparent.png";

/** White silhouette — transparent plate, for dark header chrome. */
export const GLANGO_LOGO_WHITE_SRC = "/brand/glango-logo-white.png";

/** Default in-app mark (transparent). Source kept for PWA icon baking. */
export const GLANGO_LOGO_MARK_SRC = GLANGO_LOGO_TRANSPARENT_SRC;

/** App canvas — soft dark gray (not pure black). */
export const GLANGO_CANVAS = "#1c1c1c";

/** Square app icon background — matches screen canvas. */
export const GLANGO_LOGO_ICON_BG = GLANGO_CANVAS;

/** Logo aspect ratio (width / height). */
export const GLANGO_LOGO_ASPECT = 685 / 783;

/** Side nav Lucide icons — 1.625rem ≈ 26px at 16px root. */
export const GLANGO_NAV_ICON_BOX_PX = 26;

/** Feed / brand mark vs nav icon cap height. */
export const GLANGO_NAV_LOGO_SCALE = 1.1;

/** Feed mark cap height — nav icon box × scale (685:783 width derived in mark). */
export const GLANGO_NAV_LOGO_HEIGHT_PX = Math.round(
  GLANGO_NAV_ICON_BOX_PX * GLANGO_NAV_LOGO_SCALE,
);
