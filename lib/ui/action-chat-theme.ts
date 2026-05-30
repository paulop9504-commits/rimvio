/** Action-Centric Shell — control center, not chat app */
export const ACTION_SHELL = {
  bg: "#F9FAFB",
  surface: "rgba(255, 255, 255, 0.9)",
  surfaceSolid: "#FFFFFF",
  ink: "#111827",
  inkSecondary: "#374151",
  inkMuted: "#6B7280",
  inkSubtle: "#9CA3AF",
  border: "rgba(0, 0, 0, 0.06)",
  borderGlass: "rgba(255, 255, 255, 0.85)",
  brand: "#4A90E2",
  brandSoft: "#EEF4FC",
  bubbleUser: "#4A90E2",
  bubbleAi: "#F3F4F6",
  bubbleAiInk: "#374151",
  radiusCard: 20,
  radiusBubble: 16,
  shadowCard: "0 8px 32px rgba(0, 0, 0, 0.06)",
  fontStack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif',
  enterEase: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.32,
} as const;

/** @deprecated use ACTION_SHELL for shell surfaces */
export const ACTION_CHAT = {
  accent: ACTION_SHELL.brand,
  accentSoft: ACTION_SHELL.brandSoft,
  surface: ACTION_SHELL.surfaceSolid,
  muted: ACTION_SHELL.bubbleAi,
  ink: ACTION_SHELL.inkSecondary,
  inkMuted: ACTION_SHELL.inkMuted,
  bubbleUser: ACTION_SHELL.bubbleUser,
  bubbleAi: ACTION_SHELL.bubbleAi,
  shadow: ACTION_SHELL.shadowCard,
  gridTile: "#FAFAFC",
} as const;
