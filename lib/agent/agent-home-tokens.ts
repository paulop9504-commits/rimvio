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

/** GPT-style chrome — white canvas, quiet sidebar, black send. */
export const AGENT_HOME_TOKENS: Record<AgentHomeThemeId, AgentHomeTokens> = {
  light: {
    root: "bg-white text-[#0d0d0d]",
    sidebar: "bg-[#f9f9f9]",
    sidebarBorder: "border-black/[0.06]",
    panel: "bg-white",
    panelBorder: "border-black/[0.06]",
    text: "text-[#0d0d0d]",
    textMuted: "text-[#5d5d5d]",
    textSubtle: "text-[#8f8f8f]",
    accent: "bg-[#0d0d0d] text-white",
    accentSoft: "bg-black/[0.06] text-[#0d0d0d]",
    card: "bg-white border-black/[0.08] shadow-none",
    cardHover: "hover:bg-[#f7f7f7]",
    input: "bg-white border-black/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
    progressTrack: "bg-black/[0.08]",
    badge: "bg-black/[0.05] text-[#5d5d5d]",
  },
  dark: {
    root: "bg-[#212121] text-[#ececec]",
    sidebar: "bg-[#171717]",
    sidebarBorder: "border-white/[0.08]",
    panel: "bg-[#212121]",
    panelBorder: "border-white/[0.08]",
    text: "text-[#ececec]",
    textMuted: "text-[#c4c4c4]",
    textSubtle: "text-[#8f8f8f]",
    accent: "bg-white text-[#0d0d0d]",
    accentSoft: "bg-white/[0.08] text-[#ececec]",
    card: "bg-[#2f2f2f] border-white/[0.08] shadow-none",
    cardHover: "hover:bg-[#3a3a3a]",
    input: "bg-[#2f2f2f] border-white/[0.1]",
    progressTrack: "bg-white/[0.1]",
    badge: "bg-white/[0.08] text-[#c4c4c4]",
  },
};
