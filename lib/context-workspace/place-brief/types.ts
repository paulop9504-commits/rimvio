/**
 * Place Brief — GPT-style lodging/eatery info blocks for Workspace place sheet.
 * FACT first; optional LLM only polishes grounded copy (no invented check-in times).
 */

export type PlaceBriefKnowBefore = {
  readonly labelKo: string;
  readonly valueKo: string;
};

export type PlaceBrief = {
  readonly placeId: string;
  readonly kind: "lodging" | "eatery" | "poi" | "other";
  readonly title: string;
  /** Rimvio differentiator — trip/route fit one-liner */
  readonly routeFitKo: string | null;
  /** Short intro (2–3 sentences max when LLM) */
  readonly introKo: string | null;
  /** Key features · ≤5 bullets */
  readonly featuresKo: readonly string[];
  /** Aggregated review tone — never fabricated quotes */
  readonly reviewSummaryKo: string | null;
  /** Atmosphere one-liner (optional) */
  readonly atmosphereKo: string | null;
  /** Check-in / parking style facts */
  readonly knowBefore: readonly PlaceBriefKnowBefore[];
  readonly source: "facts" | "facts+llm";
};

export type PlaceBriefFactPack = {
  readonly placeId: string;
  readonly kind: PlaceBrief["kind"];
  readonly title: string;
  readonly summaryKo: string | null;
  readonly amountLabel: string | null;
  readonly rating: number | null;
  readonly reviewCount: number | null;
  readonly amenities: readonly string[];
  readonly address: string | null;
  readonly partnerLabel: string | null;
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly destinationKo: string | null;
  readonly walkHintKo: string | null;
};
