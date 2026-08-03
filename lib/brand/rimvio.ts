/** Rimvio North Star — product soul */
export const NORTH_STAR = {
  slogan: "Your Life, Operable.",
  /** Canonical product definition (KO) — docs/RIMVIO_CONSTITUTION.md */
  experienceOsDefinitionKo:
    "Context를 Reality Graph로 연결하고, AI Agent가 Workspace에서 탐색·비교·예약·다음 행동을 준비하며, 맞을 때 당신이 Commit하는 AI Experience OS",
  experienceOsHumanKo:
    "검색 챗봇이 아니라 Context·Reality Graph 위에서 AI Agent가 Workspace로 다음 행동을 준비하는 Experience OS",
  experienceOsDefinitionEn:
    "An AI Experience OS that links Context into a Reality Graph — AI Agents explore, compare, and prepare next actions in Workspace; you Commit.",
  experienceOsHumanEn:
    "Not chatbot search — Context and Reality Graph, with AI Agents preparing the next move in Workspace.",
  taglineKo: "Context · Reality Graph · AI Agent · Workspace",
  taglineEn: "Context. Reality Graph. AI Agent. Workspace.",
  systemMission:
    "You are Rimvio, an AI Experience OS. Structure place · people · time · action as Reality Graph truth from Context; AI Agents search, compare, and prepare in Workspace without silent Commit. Context Resume re-opens prior work. Conversation is ingress, not the product. Humans own final authority.",
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
    `- Product soul: "${NORTH_STAR.slogan}" — **AI Experience OS**; Context · Reality Graph · AI Agent · Workspace; Commit is human.`,
    `- Definition: ${NORTH_STAR.experienceOsDefinitionEn}`,
    "- Context-first: place (Globe) · people (Peer) · Reality Graph → Workspace prep → one tap Commit. MEANING + RECALL moat, not generic chat.",
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
  taglineShort: "Context · Reality Graph · Workspace",
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
