/** Rimvio North Star — product soul (2026-08: Agent + Hub platform) */
export const NORTH_STAR = {
  /** Platform headline */
  slogan: "Connect every capability. Execute what matters.",
  sloganKo: "능력을 연결하고, 결과를 실행한다.",
  /** Agent-facing */
  agentSlogan: "Say it. We perform.",
  agentSloganKo: "해줘 — Rimvio가 실행한다.",
  /** Travel / memory vertical (legacy L1) */
  travelVerticalSlogan: "Your Life, Operable.",
  /** @deprecated use platformDefinitionKo — kept for gradual migration */
  experienceOsDefinitionKo:
    "Rimvio Agent가 Market과 Capability를 조립하고 Runtime에서 실행하며, 사용자가 Commit하는 초연결 AI 실행 플랫폼",
  experienceOsHumanKo:
    "챗봇이 아니라, 말한 결과를 실제로 수행하는 실행 플랫폼",
  experienceOsDefinitionEn:
    "A hyper-connected execution platform — Rimvio Agent assembles Markets and Capabilities; Runtime acts; humans Commit.",
  experienceOsHumanEn:
    "Not a chatbot — an execution platform that performs outcomes you state.",
  platformDefinitionKo:
    "Rimvio Agent가 Market과 Capability를 조립하고 Runtime에서 실행하며, 사용자가 Commit하는 초연결 AI 실행 플랫폼",
  platformDefinitionEn:
    "A hyper-connected execution platform — Rimvio Agent assembles Markets and Capabilities; Runtime acts; humans Commit.",
  platformHumanKo: "챗봇이 아니라, 말한 결과를 실제로 수행하는 실행 플랫폼",
  platformHumanEn:
    "Not a chatbot — an execution platform that performs outcomes you state.",
  substrateTaglineKo: "맥락이 연결되면, Rimvio가 다시 실행한다.",
  substrateTaglineEn: "When context connects, Rimvio re-executes.",
  taglineKo: "Rimvio Agent · Hub · Runtime",
  taglineEn: "Rimvio Agent · Hub · Runtime",
  systemMission:
    "You are Rimvio, a hyper-connected AI execution platform. Users state intent; Rimvio Agent plans, discovers Markets and Capabilities, executes via Runtime, verifies, and presents results for human Commit. Hub supplies capabilities and markets invisibly. Conversation is ingress and work log, not the product. Never silent Commit on payments, bookings, or trades. Humans own final authority.",
  loading: "[실행 준비 중…]",
  loadingDock: "Rimvio Agent가 준비 중…",
  sessionConnected: (personaLabel: string) =>
    `${personaLabel}와 연결했습니다. 원하는 결과를 말해 보세요.`,
} as const;

/** Injected at the top of every Rimvio system prompt. */
export function buildNorthStarPromptHeader() {
  return [
    "# North Star (immutable mission)",
    NORTH_STAR.systemMission,
    `- Platform: "${NORTH_STAR.slogan}" — Agent + Hub + Runtime; Commit is human.`,
    `- Agent: ${NORTH_STAR.agentSlogan}`,
    `- Definition: ${NORTH_STAR.platformDefinitionEn}`,
    "- Intent → Market discovery → Capability assembly → Runtime → Verify → Commit.",
    "- Hub L0–L3: Platform → Market → Capability → Listing/Reality.",
    "- Travel/memory vertical still uses Context OS substrate; Globe is projection not default home.",
    `- Korean anchor: ${NORTH_STAR.agentSloganKo}`,
    `- Substrate (Travel): ${NORTH_STAR.substrateTaglineKo}`,
  ].join("\n");
}

/** Rimvio product brand — user-facing name & URLs */
export const RIMVIO = {
  name: "Rimvio",
  nameKo: "림비오",
  lockup: "Rimvio · 림비오",
  northStar: NORTH_STAR.slogan,
  northStarKo: NORTH_STAR.sloganKo,
  agentTagline: NORTH_STAR.agentSloganKo,
  agentTaglineEn: NORTH_STAR.agentSlogan,
  tagline: NORTH_STAR.agentSloganKo,
  taglineShort: "Agent · Hub · Runtime",
  ingressTagline: "한 줄이면 시작할 수 있어요",
  domain: "rimvio.com",
  homeLabel: "Rimvio Agent",
} as const;

export function rimvioBeamUrl(slug: string) {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : `https://${RIMVIO.domain}`;

  return `${base}/s/${slug}`;
}

/** @deprecated use RIMVIO */
export const GLANGO = RIMVIO;
/** @deprecated use RIMVIO */
export const GLANG = RIMVIO;
/** @deprecated use rimvioBeamUrl */
export const glangoBeamUrl = rimvioBeamUrl;
/** @deprecated use rimvioBeamUrl */
export const glangBeamUrl = rimvioBeamUrl;
