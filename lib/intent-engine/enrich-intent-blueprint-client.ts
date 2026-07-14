import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { compileIntentBlueprintViaLlm } from "@/lib/intent-engine/compile-intent-blueprint";
import { needsIntentSlotLlmFill } from "@/lib/intent-engine/fill-intent-slots-llm";
import {
  INTENT_BLUEPRINT_META_KEY,
} from "@/lib/intent-engine/intent-blueprint-metadata";
import type { IntentBlueprint } from "@/lib/intent-engine/types";

export type EnrichIntentBlueprintClientResult = {
  blueprint: IntentBlueprint;
  source: string;
  stamped: boolean;
};

/**
 * Client: regex miss → POST compile with LLM → stamp event metadata.
 * Travel Brain then reads intentBlueprintV1 on next build.
 */
export async function enrichContextIntentBlueprintClient(input: {
  contextEventId: string;
  text?: string;
  forceLlm?: boolean;
}): Promise<EnrichIntentBlueprintClientResult | null> {
  const eventId = input.contextEventId.trim();
  if (!eventId) {
    return null;
  }
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    return null;
  }

  const text =
    input.text?.trim() ||
    (typeof event.metadata?.sourceMessage === "string"
      ? event.metadata.sourceMessage.trim()
      : "") ||
    event.title?.trim() ||
    "";

  if (!text) {
    return null;
  }

  if (!input.forceLlm && !needsIntentSlotLlmFill({ text })) {
    return null;
  }

  let blueprint: IntentBlueprint;
  let source = "rules";

  try {
    const response = await fetch("/api/intent-engine/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        use_llm: true,
        force_llm: input.forceLlm === true,
      }),
    });
    if (response.ok) {
      const json = (await response.json()) as {
        blueprint?: IntentBlueprint;
        source?: string;
      };
      if (json.blueprint) {
        blueprint = json.blueprint;
        source = json.source ?? "llm";
      } else {
        const local = await compileIntentBlueprintViaLlm({
          text,
          forceLlm: input.forceLlm,
        });
        blueprint = local.blueprint;
        source = local.source;
      }
    } else {
      const local = await compileIntentBlueprintViaLlm({
        text,
        forceLlm: input.forceLlm,
      });
      blueprint = local.blueprint;
      source = local.source;
    }
  } catch {
    const local = await compileIntentBlueprintViaLlm({
      text,
      forceLlm: input.forceLlm,
    });
    blueprint = local.blueprint;
    source = local.source;
  }

  if (blueprint.intents.length === 0) {
    return { blueprint, source, stamped: false };
  }

  commitEventUpsert({
    id: eventId,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    confidence: event.confidence,
    description: event.description,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    metadata: {
      ...(event.metadata ?? {}),
      [INTENT_BLUEPRINT_META_KEY]: blueprint,
    },
  });

  return { blueprint, source, stamped: true };
}

export { INTENT_BLUEPRINT_META_KEY };
