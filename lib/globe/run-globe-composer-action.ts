import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { ACTION_INTENT_REGISTRY } from "@/lib/action-dispatcher/registry";
import { detectNaturalMarketComposeInput } from "@/lib/globe/market/detect-market-compose-input";

export type GlobeComposerUrlAction = {
  kind: "url";
  label: string;
  url: string;
  featureId: string;
};

export type GlobeComposerMarketComposeAction = {
  kind: "market-compose";
  featureId: "market";
  composeText: string;
};

export type GlobeComposerActionResult =
  | GlobeComposerUrlAction
  | GlobeComposerMarketComposeAction;

/** Run @action from globe ingest bar — deterministic, no LLM. */
export function runGlobeComposerAction(
  raw: string,
): GlobeComposerActionResult | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (detectNaturalMarketComposeInput(trimmed)) {
    return {
      kind: "market-compose",
      featureId: "market",
      composeText: trimmed,
    };
  }

  const mention = parseActionMention(trimmed);
  if (!mention) {
    return null;
  }

  if (mention.feature.featureId === "market") {
    const composeText =
      mention.query.trim() ||
      mention.rawInput.replace(/^@\S+\s*/u, "").trim();
    return {
      kind: "market-compose",
      featureId: "market",
      composeText: composeText || mention.rawInput.trim(),
    };
  }

  const actionId = mention.feature.action?.trim();
  if (!actionId) {
    return null;
  }

  const definition = ACTION_INTENT_REGISTRY[actionId];
  if (!definition) {
    return null;
  }

  const query = mention.query.trim();
  const paramKey = definition.params[0] ?? "dest";
  const url = definition.buildUrl({ [paramKey]: query, dest: query, destination: query });
  if (!url) {
    return null;
  }

  return {
    kind: "url",
    label: definition.label,
    url,
    featureId: mention.feature.featureId,
  };
}
