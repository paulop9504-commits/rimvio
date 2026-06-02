import { GLANGO_NEON } from "@/lib/brand/glango-neon-theme";

/** Glango master button — neon tactile system */
export const GLANGO_BUTTON = {
  blue: GLANGO_NEON.primaryBtn,
  bluePressed: GLANGO_NEON.primaryBtnPressed,
  white: GLANGO_NEON.text,
  ink: GLANGO_NEON.text,
  inkMuted: GLANGO_NEON.textMuted,
  radius: 14,
  radiusSm: 12,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  durationMs: 200,
  shadowRest:
    "0px 2px 8px rgba(147, 51, 234, 0.18), 0px 12px 28px rgba(0, 0, 0, 0.35)",
  shadowPressed:
    "0px 1px 4px rgba(147, 51, 234, 0.12), 0px 6px 14px rgba(0, 0, 0, 0.28)",
  glassBg: "rgba(20, 20, 28, 0.82)",
  glassBorder: "rgba(168, 85, 247, 0.22)",
} as const;
