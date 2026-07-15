/**
 * Research surgical tools — Cursor-like instruments.
 * Gap → pick tool → patch candidate → rescore.
 */

import type { FastScanCandidate, RankedCandidate } from "@/engines/research/schema";
import type { PersuasionAxisId, PersuasionContext } from "@/lib/research-engine/score-persuasion";
import type { ResearchToolEvidence } from "@/lib/research-engine/tools/build-evidence-cards";

export type ResearchToolId =
  | "places_details"
  | "rate_lookup"
  | "distance_check"
  | "yt_preview";

export type ResearchToolGap = {
  readonly axisId: PersuasionAxisId;
  readonly reasonKo: string;
};

/** Patch applied onto a FastScanCandidate after a tool succeeds. */
export type ResearchToolPatch = {
  readonly reviewCount?: number | null;
  readonly popularity?: number | null;
  readonly snippetAppend?: string | null;
  readonly metadata?: Readonly<
    Record<string, string | number | boolean | null>
  >;
};

export type ResearchToolCall = {
  readonly toolId: ResearchToolId;
  readonly candidateId: string;
  readonly status: "ok" | "skip" | "error";
  readonly summaryKo: string;
  readonly filledAxes: readonly PersuasionAxisId[];
  readonly patch: ResearchToolPatch | null;
  /** Cursor-like Called X → got Y payload. */
  readonly evidence?: ResearchToolEvidence | null;
};

export type ResearchToolContext = {
  readonly persuasion: PersuasionContext;
  /** Optional network / test injectors — omit for pure soft path. */
  readonly runtime?: ResearchToolRuntime;
};

export type ResearchToolRuntime = {
  readonly fetchPlacesDetails?: (input: {
    title: string;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
    anchorLat?: number | null;
    anchorLng?: number | null;
    /** Candidate domain — routes lodging / eatery / activity inventory. */
    domain?: string | null;
  }) => Promise<{
    rating?: number | null;
    reviewCount?: number | null;
    lat?: number | null;
    lng?: number | null;
    priceKrw?: number | null;
    address?: string | null;
  } | null>;
  /** LiteAPI path — omit keyword; live nightly/stay price. */
  readonly fetchRate?: (input: {
    title: string;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
  }) => Promise<{ priceKrw?: number | null } | null>;
  readonly fetchYtPreview?: (input: {
    title: string;
    lat?: number | null;
    lng?: number | null;
  }) => Promise<{
    confidence?: number | null;
    videoTitle?: string | null;
  } | null>;
};

export type ResearchTool = {
  readonly id: ResearchToolId;
  readonly labelKo: string;
  run(input: {
    candidate: FastScanCandidate;
    ranked: readonly RankedCandidate[];
    gaps: readonly ResearchToolGap[];
    context: ResearchToolContext;
  }): Promise<ResearchToolCall>;
};

export const RESEARCH_TOOL_IDS: readonly ResearchToolId[] = [
  "places_details",
  "rate_lookup",
  "distance_check",
  "yt_preview",
] as const;
