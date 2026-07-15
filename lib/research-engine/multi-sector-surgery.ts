/**
 * Multi-sector Research surgery — lodging · eatery · activity mini-ops then merge.
 * Cursor-like: operate per sector, then compose one turn.
 */

import type { RankedCandidate } from "@/engines/research/schema";
import { detectConcurrentDiscoveryDomains } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import type { LocalDiscoveryResourceType } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  resolveResearchLiveSurfaces,
  type ResearchLiveSurface,
} from "@/lib/research-engine/live-external-ssot";
import { resolveResearchToolSurface } from "@/lib/research-engine/tools/match-inventory-hit";
import {
  scoreResearchPersuasion,
  type PersuasionContext,
} from "@/lib/research-engine/score-persuasion";
import type { ResearchStrategyId } from "@/lib/research-engine/research-strategy";
import { researchStrategyLabelKo } from "@/lib/research-engine/research-strategy";
import {
  runResearchSurgicalLoop,
  type ResearchGapRetryStep,
} from "@/lib/research-engine/tools/run-research-surgical-loop";
import type {
  ResearchToolCall,
  ResearchToolRuntime,
} from "@/lib/research-engine/tools/types";
import { buildResearchEvidenceCards } from "@/lib/research-engine/tools/build-evidence-cards";

export type ResearchSectorId = ResearchLiveSurface;

export type ResearchSectorResult = {
  readonly sector: ResearchSectorId;
  readonly labelKo: string;
  readonly bestTitle: string;
  readonly bestCandidateId: string | null;
  readonly confidence: number;
  readonly headlineKo: string;
  readonly toolCount: number;
  readonly summaryKo: string;
};

function resourceToSector(
  resourceType: LocalDiscoveryResourceType,
): ResearchSectorId | null {
  switch (resourceType) {
    case "hotel":
      return "lodging";
    case "restaurant":
      return "eatery";
    case "activity":
      return "activity";
    case "amenity":
      return "amenity";
    default:
      return null;
  }
}

export function researchSectorLabelKo(sector: ResearchSectorId): string {
  switch (sector) {
    case "lodging":
      return "숙소";
    case "eatery":
      return "맛집";
    case "activity":
      return "놀거리";
    case "amenity":
      return "편의";
    default:
      return sector;
  }
}

/** Sector of a ranked candidate (domain / metadata.kind). */
export function sectorOfRankedCandidate(row: RankedCandidate): ResearchSectorId {
  const kind = row.candidate.metadata?.kind;
  if (typeof kind === "string") {
    const k = kind.toLowerCase();
    if (k === "lodging" || k === "hotel") return "lodging";
    if (k === "eatery" || k === "restaurant") return "eatery";
    if (k === "activity") return "activity";
    if (k === "amenity") return "amenity";
  }
  return resolveResearchToolSurface(row.candidate.domain);
}

/**
 * Sectors to operate on = utterance mentions ∪ candidate domains present.
 * Order follows utterance mention order when possible.
 */
export function resolveResearchSectors(input: {
  message: string;
  ranked: readonly RankedCandidate[];
}): ResearchSectorId[] {
  const fromUtterance = resolveResearchLiveSurfaces(input.message);
  const concurrent = detectConcurrentDiscoveryDomains(input.message)
    .map((h) => resourceToSector(h.resourceType))
    .filter((s): s is ResearchSectorId => s != null);

  const ordered: ResearchSectorId[] = [];
  const push = (s: ResearchSectorId) => {
    if (!ordered.includes(s)) ordered.push(s);
  };
  for (const s of concurrent.length > 0 ? concurrent : fromUtterance) {
    push(s);
  }
  for (const s of fromUtterance) {
    push(s);
  }

  const present = new Set(input.ranked.map(sectorOfRankedCandidate));
  // Prefer sectors that both asked and have candidates; keep asked-empty for reporting.
  const withPool = ordered.filter((s) => present.has(s));
  if (withPool.length >= 2) {
    return withPool;
  }
  if (ordered.length >= 2 && present.size >= 2) {
    return ordered.filter((s) => present.has(s));
  }
  // Fall back to whatever pools exist when multi-domain inventory is open.
  if (present.size >= 2) {
    const poolOrder: ResearchSectorId[] = [
      "lodging",
      "eatery",
      "activity",
      "amenity",
    ];
    return poolOrder.filter((s) => present.has(s));
  }
  return withPool.length > 0 ? withPool : ordered.slice(0, 1);
}

export function partitionRankedBySector(
  ranked: readonly RankedCandidate[],
): Map<ResearchSectorId, RankedCandidate[]> {
  const map = new Map<ResearchSectorId, RankedCandidate[]>();
  for (const row of ranked) {
    const sector = sectorOfRankedCandidate(row);
    const list = map.get(sector) ?? [];
    list.push(row);
    map.set(sector, list);
  }
  return map;
}

export function isMultiSectorResearch(input: {
  message: string;
  ranked: readonly RankedCandidate[];
}): boolean {
  return resolveResearchSectors(input).length >= 2;
}

export type RunMultiSectorSurgeryResult = {
  readonly ranked: readonly RankedCandidate[];
  readonly toolTrace: readonly ResearchToolCall[];
  readonly gapRetryTrace: readonly ResearchGapRetryStep[];
  readonly sectorResults: readonly ResearchSectorResult[];
  readonly confidence: number;
  readonly evidenceCardsLineKo: readonly string[];
};

/**
 * Mini surgical loop per sector → merge winners to top of ranked list.
 */
export async function runMultiSectorResearchSurgery(input: {
  ranked: readonly RankedCandidate[];
  persuasionContext: PersuasionContext;
  sectors: readonly ResearchSectorId[];
  strategy: ResearchStrategyId;
  runtime?: ResearchToolRuntime;
  maxRoundsPerSector?: number;
  onTool?: (call: ResearchToolCall) => void;
  onGapRetry?: (step: ResearchGapRetryStep) => void;
  onSector?: (sector: ResearchSectorId, summaryKo: string) => void;
}): Promise<RunMultiSectorSurgeryResult> {
  const bySector = partitionRankedBySector(input.ranked);
  const toolTrace: ResearchToolCall[] = [];
  const gapRetryTrace: ResearchGapRetryStep[] = [];
  const sectorResults: ResearchSectorResult[] = [];
  const winnerRows: RankedCandidate[] = [];
  const usedIds = new Set<string>();
  const evidenceLines: string[] = [];

  const maxRounds = Math.max(1, Math.min(4, input.maxRoundsPerSector ?? 3));

  // Sector-aware persuasion: lodging keeps budget; eatery/activity drop price gate noise.
  for (const sector of input.sectors) {
    const pool = bySector.get(sector) ?? [];
    if (pool.length === 0) {
      sectorResults.push({
        sector,
        labelKo: researchSectorLabelKo(sector),
        bestTitle: "(후보 없음)",
        bestCandidateId: null,
        confidence: 0,
        headlineKo: "",
        toolCount: 0,
        summaryKo: `${researchSectorLabelKo(sector)}: 후보 풀 없음`,
      });
      input.onSector?.(
        sector,
        `› 섹터 수술 «${researchSectorLabelKo(sector)}» — 풀 없음`,
      );
      continue;
    }

    input.onSector?.(
      sector,
      `› 섹터 수술 «${researchSectorLabelKo(sector)}» · ${researchStrategyLabelKo(input.strategy)}`,
    );

    const sectorPersuasion: PersuasionContext = {
      ...input.persuasionContext,
      maxNightlyPriceKrw:
        sector === "lodging"
          ? input.persuasionContext.maxNightlyPriceKrw
          : null,
    };

    const surgical = await runResearchSurgicalLoop({
      ranked: pool,
      persuasionContext: sectorPersuasion,
      maxRounds,
      runtime: input.runtime,
      strategy: input.strategy,
      resetTried: true,
      onTool: input.onTool,
      onGapRetry: input.onGapRetry,
    });

    toolTrace.push(...surgical.toolTrace);
    gapRetryTrace.push(
      ...surgical.gapRetryTrace.map((step) => ({
        ...step,
        summaryKo: `[${researchSectorLabelKo(sector)}] ${step.summaryKo}`,
      })),
    );

    const best = surgical.ranked.find((r) => !r.rejected) ?? null;
    const persuasion = scoreResearchPersuasion(
      surgical.ranked,
      sectorPersuasion,
    );
    const conf = Math.round(persuasion.score * 1000) / 1000;
    const title = best?.candidate.title ?? "(없음)";
    const okTools = surgical.toolTrace.filter((t) => t.status === "ok").length;

    for (const card of buildResearchEvidenceCards({
      toolTrace: surgical.toolTrace,
      ranked: surgical.ranked,
    })) {
      evidenceLines.push(
        `[${researchSectorLabelKo(sector)}] ${card.lineKo}`,
      );
    }

    sectorResults.push({
      sector,
      labelKo: researchSectorLabelKo(sector),
      bestTitle: title,
      bestCandidateId: best?.candidate.id ?? null,
      confidence: conf,
      headlineKo: persuasion.headlineKo,
      toolCount: okTools,
      summaryKo: `${researchSectorLabelKo(sector)}: ${title} · 납득 ${(conf * 100).toFixed(0)}%${
        persuasion.headlineKo ? ` · ${persuasion.headlineKo}` : ""
      }`,
    });

    // Prefer surgically updated ordering within sector.
    for (const row of surgical.ranked) {
      if (row.rejected) continue;
      if (usedIds.has(row.candidate.id)) continue;
      winnerRows.push(row);
      usedIds.add(row.candidate.id);
    }
  }

  // Append leftover candidates (other sectors / rejected) without dupes.
  const leftovers = input.ranked.filter(
    (r) => !usedIds.has(r.candidate.id),
  );
  const merged = [...winnerRows, ...leftovers];

  const scored = sectorResults.filter((s) => s.bestCandidateId);
  const confidence =
    scored.length === 0
      ? 0.1
      : scored.reduce((sum, s) => sum + s.confidence, 0) / scored.length;

  return {
    ranked: merged,
    toolTrace,
    gapRetryTrace,
    sectorResults,
    confidence: Math.round(confidence * 1000) / 1000,
    evidenceCardsLineKo: evidenceLines,
  };
}

export function formatMultiSectorResultsKo(
  sectors: readonly { readonly summaryKo: string }[],
): string {
  if (sectors.length === 0) return "";
  return [
    "섹터별 수술:",
    ...sectors.map((s) => `• ${s.summaryKo}`),
  ].join("\n");
}
