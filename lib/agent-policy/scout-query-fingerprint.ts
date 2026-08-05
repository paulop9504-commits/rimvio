/**
 * Scout query fingerprint — stale results must not survive constraint change.
 * P0 · Stale Result Invalidation.
 */

import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { extractNearPlaceLabelFromUtterance } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";
import { resolveAgentJobTargetFromUtterance } from "@/lib/agent-policy/agent-job";

export type ScoutFingerprintParts = {
  readonly target: string;
  readonly nearLabel: string;
  readonly lat: string;
  readonly lng: string;
  readonly stayType: string;
  readonly maxPrice: string;
  readonly mode: "replace" | "add" | "refine";
};

export function buildScoutFingerprintParts(input: {
  readonly utterance: string;
  readonly mode: "replace" | "add" | "refine";
  readonly lat?: number | null;
  readonly lng?: number | null;
}): ScoutFingerprintParts {
  const near = extractNearPlaceLabelFromUtterance(input.utterance) || "";
  const stay = parseLodgingStayTypeFromText(input.utterance) ?? "";
  const price = parseMaxNightlyPriceKrw(input.utterance);
  const lat =
    typeof input.lat === "number" && Number.isFinite(input.lat)
      ? input.lat.toFixed(4)
      : "";
  const lng =
    typeof input.lng === "number" && Number.isFinite(input.lng)
      ? input.lng.toFixed(4)
      : "";
  return {
    target: resolveAgentJobTargetFromUtterance(input.utterance),
    nearLabel: near.trim().toLowerCase(),
    lat,
    lng,
    stayType: String(stay),
    maxPrice: price != null ? String(price) : "",
    mode: input.mode,
  };
}

/** Stable opaque fingerprint string for Workspace SSOT. */
export function fingerprintScoutQuery(
  parts: ScoutFingerprintParts,
): string {
  return [
    parts.target,
    parts.nearLabel,
    parts.lat,
    parts.lng,
    parts.stayType,
    parts.maxPrice,
    parts.mode === "refine" ? "refine" : "scout",
  ].join("|");
}

export function isScoutFingerprintStale(input: {
  readonly previous: string | null | undefined;
  readonly next: string;
}): boolean {
  const prev = input.previous?.trim() ?? "";
  if (!prev) return false;
  return prev !== input.next.trim();
}
