export type AgentHomeThemeId = "light" | "dark";

export const AGENT_HOME_THEME_STORAGE_KEY = "rimvio.agent-home.theme.v1";

export type AgentHomeModeId = "auto" | "web" | "pc" | "file" | "data";

export type AgentHomeTokens = {
  readonly root: string;
  readonly sidebar: string;
  readonly sidebarBorder: string;
  readonly panel: string;
  readonly panelBorder: string;
  readonly text: string;
  readonly textMuted: string;
  readonly textSubtle: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly card: string;
  readonly cardHover: string;
  readonly input: string;
  readonly progressTrack: string;
  readonly badge: string;
};

export const AGENT_HOME_TOKENS: Record<AgentHomeThemeId, AgentHomeTokens> = {
  light: {
    root: "bg-[#f8fafc] text-[#111827]",
    sidebar: "bg-white",
    sidebarBorder: "border-[#e5e7eb]",
    panel: "bg-white",
    panelBorder: "border-[#e5e7eb]",
    text: "text-[#111827]",
    textMuted: "text-[#4b5563]",
    textSubtle: "text-[#9ca3af]",
    accent: "bg-[#6366f1] text-white",
    accentSoft: "bg-[#6366f1]/10 text-[#4f46e5]",
    card: "bg-white border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    cardHover: "hover:border-[#d1d5db] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
    input: "bg-white border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
    progressTrack: "bg-[#e5e7eb]",
    badge: "bg-[#f3f4f6] text-[#6b7280]",
  },
  dark: {
    root: "bg-[#0c0e12] text-[#f2f4f6]",
    sidebar: "bg-[#111318]",
    sidebarBorder: "border-white/[0.06]",
    panel: "bg-[#151820]",
    panelBorder: "border-white/[0.06]",
    text: "text-[#f2f4f6]",
    textMuted: "text-[#b0b8c1]",
    textSubtle: "text-[#6b7684]",
    accent: "bg-[#4593fc] text-white",
    accentSoft: "bg-[#4593fc]/15 text-[#8ec0ff]",
    card: "bg-[#151820] border-white/[0.06] shadow-none",
    cardHover: "hover:bg-[#1a1f28]",
    input: "bg-[#1a1f28] border-white/[0.08]",
    progressTrack: "bg-white/[0.08]",
    badge: "bg-white/[0.06] text-[#b0b8c1]",
  },
};
