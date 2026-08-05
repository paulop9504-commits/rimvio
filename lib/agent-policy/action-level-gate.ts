/**
 * P1 · Action Level Gate — discover ≠ prepare ≠ commit (Article 0).
 */

export const AGENT_ACTION_LEVELS = [
  "observe",
  "discover",
  "refine",
  "prepare",
  "commit",
] as const;

export type AgentActionLevel = (typeof AGENT_ACTION_LEVELS)[number];

export type ActionLevelGateResult = {
  readonly level: AgentActionLevel;
  /** True when utterance asks to find/show — Prepare must not auto-run. */
  readonly discoverOnly: boolean;
  readonly allowPrepare: boolean;
  readonly allowCommit: boolean;
  readonly statusKo: string | null;
};

const DISCOVER_RE =
  /찾아|검색|보여|골라|추천|후보|discover|find|search|show/iu;
const PREPARE_RE =
  /예약\s*준비|준비해|prepare|결제\s*준비|북마크\s*준비/iu;
const COMMIT_RE =
  /커밋|commit|확정\s*해|예약\s*해\s*줘|결제해|당장\s*예약/iu;
const REFINE_RE =
  /더\s*싸|저렴|그중|이\s*중|필터|정렬|빼|삭제|만\s*보/iu;

/**
 * Classify max action autonomy for this turn.
 */
export function resolveAgentActionLevel(utterance: string): ActionLevelGateResult {
  const text = utterance.trim();
  if (!text) {
    return {
      level: "observe",
      discoverOnly: false,
      allowPrepare: false,
      allowCommit: false,
      statusKo: null,
    };
  }

  if (COMMIT_RE.test(text)) {
    return {
      level: "commit",
      discoverOnly: false,
      allowPrepare: true,
      allowCommit: false, // still human Reality Commit — gate only labels intent
      statusKo: null,
    };
  }

  if (PREPARE_RE.test(text) && !DISCOVER_RE.test(text)) {
    return {
      level: "prepare",
      discoverOnly: false,
      allowPrepare: true,
      allowCommit: false,
      statusKo: null,
    };
  }

  // 「찾아줘 · 예약 준비」in one breath → discover only (no silent prepare).
  if (DISCOVER_RE.test(text) && PREPARE_RE.test(text)) {
    return {
      level: "discover",
      discoverOnly: true,
      allowPrepare: false,
      allowCommit: false,
      statusKo: "검색만 진행할게요 · 예약 준비는 후보 고른 뒤에",
    };
  }

  if (DISCOVER_RE.test(text)) {
    return {
      level: "discover",
      discoverOnly: true,
      allowPrepare: false,
      allowCommit: false,
      statusKo: null,
    };
  }

  if (REFINE_RE.test(text)) {
    return {
      level: "refine",
      discoverOnly: false,
      allowPrepare: false,
      allowCommit: false,
      statusKo: null,
    };
  }

  if (PREPARE_RE.test(text)) {
    return {
      level: "prepare",
      discoverOnly: false,
      allowPrepare: true,
      allowCommit: false,
      statusKo: null,
    };
  }

  return {
    level: "observe",
    discoverOnly: false,
    allowPrepare: false,
    allowCommit: false,
    statusKo: null,
  };
}
