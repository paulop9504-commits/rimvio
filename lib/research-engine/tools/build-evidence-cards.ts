/**
 * Cursor-like evidence cards — Called X → got Y.
 * Compose-only transparency (no new Globe UI surface).
 */

import type { ResearchToolId } from "@/lib/research-engine/tools/types";
import type { ResearchToolCall } from "@/lib/research-engine/tools/types";
import type { RankedCandidate } from "@/engines/research/schema";

/** Wire SSOT id shown like Cursor tool names. */
export type ResearchEvidenceSsotId =
  | "places.reviews"
  | "liteapi.rate"
  | "distance(anchor)"
  | "youtube.preview"
  | "live.inventory";

export type ResearchToolEvidence = {
  readonly called: ResearchEvidenceSsotId;
  readonly args: Readonly<Record<string, string | number | boolean | null>>;
  readonly got: Readonly<Record<string, string | number | boolean | null>> | null;
  /** Compact payload for "got …" */
  readonly gotLine: string;
};

export type ResearchEvidenceCard = {
  readonly toolId: ResearchToolId | "live_ssot";
  readonly status: "ok" | "skip" | "error";
  readonly called: ResearchEvidenceSsotId;
  readonly args: Readonly<Record<string, string | number | boolean | null>>;
  readonly got: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly gotLine: string;
  /** Called places.reviews → got reviews=210 · ★4.3 */
  readonly lineKo: string;
};

export function formatCalledGotLine(input: {
  called: string;
  status: "ok" | "skip" | "error";
  gotLine: string;
}): string {
  if (input.status === "ok") {
    return `Called ${input.called} → got ${input.gotLine}`;
  }
  if (input.status === "skip") {
    return `Called ${input.called} → skip (${input.gotLine})`;
  }
  return `Called ${input.called} → error (${input.gotLine})`;
}

export function evidenceCardFromToolCall(
  call: ResearchToolCall,
): ResearchEvidenceCard | null {
  const evidence = call.evidence;
  if (!evidence) {
    return null;
  }
  return {
    toolId: call.toolId,
    status: call.status,
    called: evidence.called,
    args: evidence.args,
    got: evidence.got,
    gotLine: evidence.gotLine,
    lineKo: formatCalledGotLine({
      called: evidence.called,
      status: call.status,
      gotLine: evidence.gotLine,
    }),
  };
}

/** Live Fast Scan provenance when surgical tools haven't spoken yet. */
export function evidenceCardsFromLiveInventory(
  ranked: readonly RankedCandidate[],
  limit = 3,
): ResearchEvidenceCard[] {
  const cards: ResearchEvidenceCard[] = [];
  for (const row of ranked) {
    if (cards.length >= limit) break;
    if (row.rejected) continue;
    const meta = row.candidate.metadata;
    if (meta?.liveSsot !== true) continue;
    const parts: string[] = [row.candidate.title.slice(0, 28)];
    if (row.candidate.reviewCount != null) {
      parts.push(`reviews=${row.candidate.reviewCount}`);
    }
    if (row.candidate.popularity != null) {
      parts.push(`★${(row.candidate.popularity * 5).toFixed(1)}`);
    }
    const price =
      typeof meta.priceKrw === "number" ? meta.priceKrw : null;
    if (price != null) {
      parts.push(`priceKrw=${price}`);
    }
    const source =
      typeof meta.liveSource === "string" ? meta.liveSource : "places";
    cards.push({
      toolId: "live_ssot",
      status: "ok",
      called: "live.inventory",
      args: {
        title: row.candidate.title,
        source,
      },
      got: {
        reviews: row.candidate.reviewCount ?? null,
        rating:
          row.candidate.popularity != null
            ? Math.round(row.candidate.popularity * 50) / 10
            : null,
        priceKrw: price,
      },
      gotLine: parts.join(" · "),
      lineKo: formatCalledGotLine({
        called: "live.inventory",
        status: "ok",
        gotLine: `${source}: ${parts.join(" · ")}`,
      }),
    });
  }
  return cards;
}

export function buildResearchEvidenceCards(input: {
  toolTrace?: readonly ResearchToolCall[] | null;
  ranked?: readonly RankedCandidate[] | null;
}): ResearchEvidenceCard[] {
  const fromTools = (input.toolTrace ?? [])
    .map(evidenceCardFromToolCall)
    .filter((c): c is ResearchEvidenceCard => c != null);
  if (fromTools.length > 0) {
    return fromTools;
  }
  return evidenceCardsFromLiveInventory(input.ranked ?? []);
}

export function formatResearchEvidenceCardsKo(
  cards: readonly ResearchEvidenceCard[],
): string {
  if (cards.length === 0) return "";
  return ["증거 카드:", ...cards.map((c) => `• ${c.lineKo}`)].join("\n");
}

/** SSOT id for a tool. */
export function evidenceSsotForTool(
  toolId: ResearchToolId,
): ResearchEvidenceSsotId {
  switch (toolId) {
    case "places_details":
      return "places.reviews";
    case "rate_lookup":
      return "liteapi.rate";
    case "distance_check":
      return "distance(anchor)";
    case "yt_preview":
      return "youtube.preview";
    default:
      return "places.reviews";
  }
}
