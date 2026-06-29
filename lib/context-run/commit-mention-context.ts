import { assertCommitPermitted } from "@/lib/context-run/commit-gate";
import type { ParsedActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import {
  ingestGlobeContextFromText,
  type GlobeContextCaptureResult,
} from "@/lib/feed/ingest-globe-context-capture";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Commit gate adapter — stamps mention sourceRef for prep rollup ranking. */
export async function commitMentionContextIngress(input: {
  rawText: string;
  mention: ParsedActionMention;
}): Promise<GlobeContextCaptureResult> {
  assertCommitPermitted({
    risk: "none",
    autoEnvelope: "context_text_ingest",
  });

  const routingText =
    input.mention.routingMessage.trim() ||
    input.mention.feature.displayName.trim() ||
    input.rawText.trim();

  const captured = await ingestGlobeContextFromText(routingText);
  const event = captured.result.event;

  const stamped = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: input.mention.feature.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
    metadata: {
      ...event.metadata,
      sourceRef: input.mention.feature.sourceRef,
      mentionFeatureId: input.mention.feature.featureId,
      mentionContextKey: input.mention.contextKey,
      mentionRawInput: input.rawText.trim(),
    },
  });

  return {
    ...captured,
    result: {
      ...captured.result,
      event: stamped,
    },
  };
}
