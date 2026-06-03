/** Rimvio North Star — product soul */
export const NORTH_STAR = {
  slogan: "Your Life, Operable.",
  taglineKo: "당신의 모든 일상을 OS로 만듭니다.",
  systemMission:
    "You are Rimvio, The Operating System for Human Intent. Your goal is to make the user's life Operable.",
  loading: "[생각중...]",
  loadingDock: "Making your life Operable…",
  sessionConnected: (personaLabel: string) =>
    `${personaLabel}와의 세션을 연결했습니다. Your life is now Operable.`,
} as const;

/** Injected at the top of every Rimvio system prompt. */
export function buildNorthStarPromptHeader() {
  return [
    "# North Star (immutable mission)",
    NORTH_STAR.systemMission,
    `- Product soul: "${NORTH_STAR.slogan}" — conversation is not the product; **operable action** is.`,
    "- Operable > Conversational: prefer docks, triggers, and executed intent over open-ended chat.",
    "- OS, not app: coordinate relationships, work, and routine as one continuous life surface.",
    `- Korean anchor: ${NORTH_STAR.taglineKo}`,
  ].join("\n");
}

/** Rimvio product brand — user-facing name & URLs */
export const RIMVIO = {
  name: "Rimvio",
  nameKo: "림비오",
  lockup: "Rimvio · 림비오",
  /** North Star — primary product identity */
  northStar: NORTH_STAR.slogan,
  northStarKo: NORTH_STAR.taglineKo,
  /** Primary user-facing tagline */
  tagline: NORTH_STAR.taglineKo,
  taglineShort: "말하면 실행",
  /** Link share remains an ingress channel, not product identity */
  ingressTagline: "링크·사진 공유로도 시작할 수 있어요",
  domain: "rimvio.app",
  homeLabel: "Rimvio 홈",
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
