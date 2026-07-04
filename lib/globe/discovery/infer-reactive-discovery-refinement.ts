import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import {
  buildEateryReactiveDiscoveryRefinement,
  buildLodgingReactiveDiscoveryRefinement,
  type ReactiveDiscoveryRefinement,
  type ReactiveDiscoveryRouteRequest,
} from "@/lib/globe/discovery/live-discovery-reactive";

const SYSTEM_PROMPT = `
You refine a context-bound discovery feed for Rimvio Globe.

Hard rules:
- Stay inside the single active context only.
- Use only the provided candidates. Never invent new places, categories, or IDs.
- Prefer deterministic continuity: nearby, similar style, similar price band, same people/context hints.
- Do not turn this into a generic popularity recommendation.
- Return strict JSON only with this shape:
{"related_resource_ids":["..."],"signal_chips":["..."]}
- Max 3 related_resource_ids.
- Max 3 signal_chips.
- signal_chips must be short Korean UI chips, no punctuation-heavy sentences.
`.trim();

function validateSignalChip(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 20) {
    return null;
  }
  return trimmed;
}

function buildFallback(input: ReactiveDiscoveryRouteRequest): ReactiveDiscoveryRefinement {
  if (input.domain === "eatery") {
    return buildEateryReactiveDiscoveryRefinement({
      items: input.items.map((item) => ({
        resourceId: item.resourceId,
        shortLabel: item.shortLabel,
        priceLabel: item.priceLabel ?? null,
        distanceM: item.distanceM,
        score100: item.score100,
        detailReasonLine: item.detailReasonLine,
      })),
      projectedResourceId: input.projectedResourceId,
      matchedPersonName: input.matchedPersonName,
    });
  }
  return buildLodgingReactiveDiscoveryRefinement({
    items: input.items.map((item) => ({
      resourceId: item.resourceId,
      shortLabel: item.shortLabel,
      priceKrw: item.priceKrw ?? null,
      distanceM: item.distanceM,
      score100: item.score100,
      detailReasonLine: item.detailReasonLine,
    })),
    projectedResourceId: input.projectedResourceId,
    matchedPersonName: input.matchedPersonName,
  });
}

function buildUserPrompt(input: ReactiveDiscoveryRouteRequest, fallback: ReactiveDiscoveryRefinement): string {
  const projected = input.items.find((item) => item.resourceId === input.projectedResourceId);
  if (!projected) {
    return "";
  }
  const candidates = input.items
    .filter((item) => item.resourceId !== input.projectedResourceId)
    .map((item) =>
      [
        `- id: ${item.resourceId}`,
        `  title: ${item.title}`,
        `  short: ${item.shortLabel}`,
        `  score100: ${item.score100}`,
        `  distanceM: ${item.distanceM ?? "unknown"}`,
        `  priceLabel: ${item.priceLabel ?? "n/a"}`,
        `  priceKrw: ${item.priceKrw ?? "n/a"}`,
        `  reason: ${item.detailReasonLine}`,
      ].join("\n"),
    )
    .join("\n");

  return `
domain: ${input.domain}
context_event:
- id: ${input.contextEvent.id}
- title: ${input.contextEvent.title}
- place: ${input.contextEvent.place ?? "n/a"}
- matched_person: ${input.matchedPersonName ?? "n/a"}

projected_item:
- id: ${projected.resourceId}
- title: ${projected.title}
- short: ${projected.shortLabel}
- score100: ${projected.score100}
- distanceM: ${projected.distanceM ?? "unknown"}
- priceLabel: ${projected.priceLabel ?? "n/a"}
- priceKrw: ${projected.priceKrw ?? "n/a"}
- reason: ${projected.detailReasonLine}

deterministic_base_ids: ${fallback.relatedResourceIds.join(", ") || "none"}
deterministic_base_chips: ${fallback.signalChips.join(" | ") || "none"}

candidates:
${candidates}

Pick up to 3 candidate ids that best continue the projected item inside this context.
You may rerank or slightly expand beyond deterministic_base_ids, but remain conservative.
Return only JSON.
`.trim();
}

function parseRefinement(
  raw: string | null,
  input: ReactiveDiscoveryRouteRequest,
  fallback: ReactiveDiscoveryRefinement,
): ReactiveDiscoveryRefinement {
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as {
      related_resource_ids?: unknown;
      signal_chips?: unknown;
    };
    const validIds = new Set(
      input.items
        .map((item) => item.resourceId)
        .filter((resourceId) => resourceId !== input.projectedResourceId),
    );
    const relatedResourceIds = Array.isArray(parsed.related_resource_ids)
      ? parsed.related_resource_ids
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value && validIds.has(value))
          .slice(0, 3)
      : [];
    const signalChips = Array.isArray(parsed.signal_chips)
      ? parsed.signal_chips.map(validateSignalChip).filter((value): value is string => value != null).slice(0, 3)
      : [];
    if (relatedResourceIds.length === 0 && signalChips.length === 0) {
      return fallback;
    }
    return {
      relatedResourceIds:
        relatedResourceIds.length > 0 ? relatedResourceIds : fallback.relatedResourceIds,
      signalChips,
      source: "llm",
    };
  } catch {
    return fallback;
  }
}

export async function inferReactiveDiscoveryRefinement(
  input: ReactiveDiscoveryRouteRequest,
): Promise<ReactiveDiscoveryRefinement> {
  const fallback = buildFallback(input);
  if (input.items.length < 3) {
    return fallback;
  }
  const userText = buildUserPrompt(input, fallback);
  if (!userText) {
    return fallback;
  }
  try {
    const raw = await callLlmTextJson({
      systemPrompt: SYSTEM_PROMPT,
      userText,
      temperature: 0.2,
    });
    return parseRefinement(raw, input, fallback);
  } catch {
    return fallback;
  }
}
