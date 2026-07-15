/**
 * Research Engine wire schema — shared SSOT types.
 * Runtime: `lib/research-engine/`
 * @see ./constitution.md
 */

export const RESEARCH_ENGINE_VERSION = 1 as const;

export const RESEARCH_STAGES = [
  "UNDERSTAND_INTENT",
  "EXPAND_SEARCH_QUERY",
  "BUILD_RESEARCH_PLAN",
  "FAST_SCAN",
  "CANDIDATE_RANKING",
  "DEEP_RESEARCH",
  "EVIDENCE_MERGE",
  "CONFLICT_DETECTION",
  "CONFIDENCE_SCORING",
  "DECISION_GENERATION",
] as const;

export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export type ResearchMediaType =
  | "article"
  | "listing"
  | "review"
  | "map"
  | "official"
  | "social"
  | "unknown";

export type FastScanCandidate = {
  readonly id: string;
  readonly title: string;
  readonly snippet: string;
  readonly domain: string;
  readonly publishDateIso?: string | null;
  readonly reviewCount?: number | null;
  readonly language?: string | null;
  /** 0..1 popularity proxy */
  readonly popularity?: number | null;
  readonly mediaType: ResearchMediaType;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
  /** Filled by Fast Scan */
  readonly relevanceScore?: number;
};

export type RankingAxisScores = {
  readonly relevance: number;
  readonly freshness: number;
  readonly authority: number;
  readonly popularity: number;
  readonly trust: number;
  readonly diversity: number;
  readonly userContext: number;
};

export type RankedCandidate = {
  readonly candidate: FastScanCandidate;
  readonly axes: RankingAxisScores;
  readonly totalScore: number;
  readonly rejected?: boolean;
  readonly rejectReason?: string | null;
};

export type DeepResearchExtract = {
  readonly candidateId: string;
  readonly facts: readonly string[];
  readonly opinions: readonly string[];
  readonly evidence: readonly string[];
  readonly numbers: readonly string[];
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly warnings: readonly string[];
  readonly weakExtract: boolean;
};

export type EvidenceFactBucket = {
  readonly claim: string;
  readonly sourceIds: readonly string[];
  readonly confidence: number;
};

export type EvidenceMerge = {
  readonly commonFacts: readonly EvidenceFactBucket[];
  readonly conflictingFacts: readonly {
    readonly claimA: string;
    readonly claimB: string;
    readonly sourceIdsA: readonly string[];
    readonly sourceIdsB: readonly string[];
  }[];
  readonly missingFacts: readonly string[];
  readonly lowConfidenceFacts: readonly EvidenceFactBucket[];
  /** 0..1 — agreement across independent sources; never opinion average */
  readonly consistencyScore: number;
};

export type ResearchDecision = {
  readonly best: {
    readonly title: string;
    readonly candidateId: string | null;
    readonly summaryKo: string;
  };
  readonly alternative: {
    readonly title: string;
    readonly candidateId: string | null;
    readonly summaryKo: string;
  } | null;
  readonly whyKo: string;
  readonly tradeoffsKo: readonly string[];
  readonly risksKo: readonly string[];
  readonly confidence: number;
  readonly evidenceWeak: boolean;
};

export type ResearchPlanStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly queries: readonly string[];
};

export type ResearchResult = {
  readonly version: typeof RESEARCH_ENGINE_VERSION;
  readonly intentSummaryKo: string;
  readonly researchPlan: readonly ResearchPlanStep[];
  readonly evidenceSummaryKo: string;
  readonly confidence: number;
  readonly decision: ResearchDecision;
  readonly sourcesUsed: readonly {
    readonly id: string;
    readonly title: string;
    readonly domain: string;
  }[];
  readonly nextActions: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly seedUtterance: string;
  }[];
  readonly stageTrace: readonly ResearchStage[];
  readonly evidence: EvidenceMerge;
  readonly ranked: readonly RankedCandidate[];
  readonly deepExtracts: readonly DeepResearchExtract[];
  readonly expandedQueries: readonly string[];
  /** Surgical tool loop — Cursor-like instrument trace. */
  readonly toolTrace?: readonly {
    readonly toolId: string;
    readonly candidateId: string;
    readonly status: "ok" | "skip" | "error";
    readonly summaryKo: string;
    readonly evidence?: {
      readonly called: string;
      readonly args: Readonly<Record<string, string | number | boolean | null>>;
      readonly got: Readonly<Record<string, string | number | boolean | null>> | null;
      readonly gotLine: string;
    } | null;
  }[];
  /** Called X → got Y evidence cards for compose transparency. */
  readonly evidenceCards?: readonly {
    readonly toolId: string;
    readonly status: "ok" | "skip" | "error";
    readonly called: string;
    readonly gotLine: string;
    readonly lineKo: string;
  }[];
  /** Gap-based retry: missing:reviewCount → places_details → axis rescore. */
  readonly gapRetryTrace?: readonly {
    readonly missing: string;
    readonly missingKey: string;
    readonly toolId: string;
    readonly status: "ok" | "skip" | "error";
    readonly closedFields: readonly string[];
    readonly persuasionBefore: number;
    readonly persuasionAfter: number;
    readonly summaryKo: string;
  }[];
  /** Strategy lens switches (budget / distance / review). */
  readonly strategyTrace?: readonly {
    readonly strategy: string;
    readonly reasonKo: string;
  }[];
  /** Multi-sector mini-surgery outcomes (lodging · eatery · activity). */
  readonly sectorResults?: readonly {
    readonly sector: string;
    readonly labelKo: string;
    readonly bestTitle: string;
    readonly bestCandidateId: string | null;
    readonly confidence: number;
    readonly headlineKo: string;
    readonly summaryKo: string;
  }[];
  /** Cursor-like apply/reject gate after 납득. */
  readonly approvalGate?: {
    readonly status: "waiting_approval";
    readonly promptKo: string;
    readonly offerApply: boolean;
    readonly chips: readonly {
      readonly id: string;
      readonly labelKo: string;
      readonly gapId: string;
      readonly value: string;
    }[];
  };
};

export type ResearchProgressKo = string;
