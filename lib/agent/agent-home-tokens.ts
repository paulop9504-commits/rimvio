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
    root: "bg-[#f5f6f8] text-[#191f28]",
    sidebar: "bg-[#eceef1]",
    sidebarBorder: "border-black/[0.06]",
    panel: "bg-white",
    panelBorder: "border-black/[0.06]",
    text: "text-[#191f28]",
    textMuted: "text-[#4e5968]",
    textSubtle: "text-[#8b95a1]",
    accent: "bg-[#3182f6] text-white",
    accentSoft: "bg-[#3182f6]/10 text-[#1b64da]",
    card: "bg-white border-black/[0.06] shadow-sm",
    cardHover: "hover:bg-[#fafbfc]",
    input: "bg-white border-black/[0.08] shadow-sm",
    progressTrack: "bg-black/[0.06]",
    badge: "bg-black/[0.05] text-[#4e5968]",
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
