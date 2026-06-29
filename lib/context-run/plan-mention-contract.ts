import type { ContextRunPlan } from "@/lib/context-run/ingress-types";
import {
  buildMentionContextKey,
  resolveMentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import {
  parseActionMention,
  type ParsedActionMention,
} from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import { resolveContractActionFromMessage } from "@/lib/event-kernel/slot-filling/resolve-contract-action-from-message";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";

type MentionContractPlanFields = Pick<
  ContextRunPlan,
  | "kind"
  | "mentionFeatureId"
  | "mentionContextKey"
  | "mentionSourceRef"
  | "routingMessage"
  | "contractAction"
  | "needsConfirmOnly"
>;

function parseBareActionMention(raw: string): ParsedActionMention | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(/^@(\S+)$/u);
  if (!match) {
    return null;
  }
  const featureToken = match[1]?.trim() ?? "";
  const feature = resolveMentionFeature(featureToken);
  if (!feature) {
    return null;
  }
  return {
    featureToken,
    feature,
    query: "",
    rawInput: trimmed,
    routingMessage: "",
    contextKey: buildMentionContextKey(feature),
  };
}

export function parseMentionForContract(raw: string): ParsedActionMention | null {
  return parseActionMention(raw) ?? parseBareActionMention(raw);
}

/**
 * @ registry → prep spine: contract-backed mentions without inline URL dispatch.
 * URL-backed (@네비) stays on external_url via runGlobeComposerAction.
 */
export function resolveMentionContractPlan(
  text: string,
): MentionContractPlanFields | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const mention = parseMentionForContract(trimmed);
  if (!mention) {
    return null;
  }

  if (runGlobeComposerAction(trimmed)) {
    return null;
  }

  const resolved = resolveContractActionFromMessage(trimmed);
  const routingMessage = mention.routingMessage.trim();
  const needsConfirmOnly =
    !routingMessage && Boolean(mention.feature.confirmCopy?.trim());

  if (!resolved.action && !needsConfirmOnly) {
    return null;
  }

  return {
    kind: "mention_contract",
    mentionFeatureId: mention.feature.featureId,
    mentionContextKey: mention.contextKey,
    mentionSourceRef: mention.feature.sourceRef,
    routingMessage,
    contractAction: resolved.action,
    needsConfirmOnly,
  };
}
