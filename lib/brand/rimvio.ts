/** Rimvio North Star — product soul */
export const NORTH_STAR = {
  slogan: "Your Life, Operable.",
  /** Canonical product definition (KO) — docs/RIMVIO_CONSTITUTION.md */
  experienceOsDefinitionKo:
    "살아본 맥락을 온톨로지로 붙잡고, 에이전트가 비교·예약·다음 행동을 준비하며, 맞을 때 당신이 Commit하는 개인 Experience OS",
  experienceOsHumanKo:
    "잊어버린 링크가 아니라, 온톨로지에 남은 맥락 위에서 에이전트가 다음을 준비하는 앱",
  experienceOsDefinitionEn:
    "An agentic Experience OS grounded in lived ontology — context structured, actions prepared, you Commit.",
  experienceOsHumanEn:
    "Not forgotten links — lived ontology plus agents that prepare the next move; you approve Reality.",
  taglineKo: "온톨로지가 맥락을 붙잡고, 에이전트가 준비한다",
  taglineEn:
    "Ontology holds context. Agents prepare. You Commit.",
  systemMission:
    "You are Rimvio, an agentic Experience OS on lived ontology. Structure place · people · time · action as graph truth; agents search, compare, and prepare (browse/tools) without silent Commit. Recall triggers re-execution. Conversation is ingress, not the product. Humans own final authority.",
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
    `- Product soul: "${NORTH_STAR.slogan}" — **agentic + ontology Experience OS**; agents prepare, ontology remembers, Commit is human.`,
    `- Definition: ${NORTH_STAR.experienceOsDefinitionEn}`,
    "- Memory-first ontology: place (Globe) · people (Peer) · Diff graph → agent prep → one tap Commit. MEANING + RECALL moat, not generic chat.",
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
  taglineShort: "온톨로지 · 에이전트 · Commit",
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
