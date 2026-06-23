import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

function readBareMentionToken(raw: string): string | null {
  const trimmed = normalizeAtMentionInput(raw);
  if (!trimmed.startsWith("@")) {
    return null;
  }
  const match = trimmed.match(/^@(\S+)\s*$/u);
  return match?.[1]?.trim() || null;
}

/** Composer shows @중고 role card when this is true. */
export function isMarketComposeInput(raw: string): boolean {
  const bareToken = readBareMentionToken(raw);
  if (bareToken) {
    return resolveMentionFeature(bareToken)?.featureId === "market";
  }
  const mention = parseActionMention(raw.trim());
  return mention?.feature.featureId === "market";
}

export function readMarketComposeQuery(raw: string): string {
  if (readBareMentionToken(raw)) {
    return "";
  }
  return parseActionMention(raw.trim())?.query.trim() ?? "";
}

/** `@중고` only — pick 내놓기/구하기 before ingest. */
export function isBareMarketComposeInput(raw: string): boolean {
  return isMarketComposeInput(raw) && readMarketComposeQuery(raw).length === 0;
}
