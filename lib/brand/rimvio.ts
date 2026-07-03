/** Rimvio North Star — product soul */
export const NORTH_STAR = {
  slogan: "Your Life, Operable.",
  /** Canonical product definition (KO) — docs/RIMVIO_CONSTITUTION.md */
  experienceOsDefinitionKo:
    "어디에 있었는지·누구와 있었는지를 기억하고, 맞을 때 맥락과 함께 다시 떠올려 한 번에 이어주는 개인 기억 OS",
  experienceOsHumanKo:
    "잊어버린 링크가 아니라, 살아본 맥락이 다시 떠오르는 앱",
  experienceOsDefinitionEn:
    "A personal memory OS that remembers where you were and who you were with — recalls it with context when it matters, then offers one tap to act.",
  experienceOsHumanEn:
    "Not forgotten links — lived context that resurfaces when it matters, with one tap to follow through.",
  taglineKo: "잊어버린 링크가 아니라, 살아본 맥락이 다시 떠오르는 OS",
  taglineEn:
    "Remembers where you were, who you were with — brings it back when it matters.",
  systemMission:
    "You are Rimvio, a personal memory OS. Anchor lived moments on the globe (place), tie them to people (peer), recall with context at the right moment — then offer one tap to act. Not a bookmark app, chatbot, map app, or todo list. Conversation is ingress, not the product.",
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
    `- Product soul: "${NORTH_STAR.slogan}" — **synaptic Experience OS**; recall triggers re-execution, not passive memory. Conversation is ingress, not the product.`,
    `- Definition: ${NORTH_STAR.experienceOsDefinitionEn}`,
    "- Memory-first: place (Globe) · people (Peer) · recall with context → one tap to act. MEANING + RECALL moat, not generic chat.",
    "- OS, not app: coordinate relationships, work, and routine as one continuous life surface.",
    `- Korean anchor: ${NORTH_STAR.taglineKo}`,
    `- English anchor: ${NORTH_STAR.taglineEn}`,
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
  taglineShort: "맞을 때 다시 떠오르기",
  /** Link share remains an ingress channel, not product identity */
  ingressTagline: "링크·사진 공유로도 시작할 수 있어요",
  domain: "rimvio.com",
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
