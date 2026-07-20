/**
 * Exploration mode — convergent (σ↓) vs diffuse (σ↑) scout policy.
 * @see docs/RIMVIO_EXPLORATION_POLICY.md
 */

import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export const EXPLORATION_MODES = ["convergent", "diffuse"] as const;

export type ExplorationMode = (typeof EXPLORATION_MODES)[number];

/** NL cues for tail / hidden-gem / sweep exploration — deterministic only. */
const DIFFUSE_NL =
  /(?:숨은|골목|새로운|새\s*로운|덜\s*유명|니치|힙한|힙\s*플|싹\s*찾|전부\s*찾|다\s*찾|넓게\s*찾|모조리|as\s*many|all\s*around|hidden|off[\s-]?the[\s-]?beaten|secret|local\s*gem|underground)/iu;

export type ResolveExplorationModeInput = {
  message?: string | null;
  spec?: Pick<LocalDiscoveryActionSpec, "vibe"> | null;
  /** Explicit landmark / theme-park query — keep convergent pin discipline. */
  explicitLandmark?: boolean;
  /** User chip override — wins over NL/spec inference. */
  override?: ExplorationMode | null;
};

/** Infer exploration mode for this scout turn — no LLM. */
export function resolveExplorationMode(
  input: ResolveExplorationModeInput,
): ExplorationMode {
  if (input.override === "convergent" || input.override === "diffuse") {
    return input.override;
  }
  const message = input.message?.trim() ?? "";
  if (message && isAlternatePlaceSearch(message)) {
    return "diffuse";
  }
  if (message && DIFFUSE_NL.test(message)) {
    return "diffuse";
  }
  const vibe = input.spec?.vibe;
  if (vibe === "local" || vibe === "hot") {
    return "diffuse";
  }
  if (vibe === "popular" || vibe === "quiet") {
    return "convergent";
  }
  if (input.explicitLandmark) {
    return "convergent";
  }
  return "convergent";
}

export function isExplorationMode(value: string): value is ExplorationMode {
  return value === "convergent" || value === "diffuse";
}
