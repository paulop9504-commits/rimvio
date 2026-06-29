import {
  readClientMasterOrchestratorContext,
  defaultMasterOrchestratorContext,
} from "@/lib/experience-context/read-client-master-orchestrator-context";
import { buildUnifiedExperienceContext } from "@/lib/experience-context/build-unified-experience-context";
import { commitTextContextIngress } from "@/lib/context-run/commit-text-context";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  buildIntentSupplySignalChips,
  resolveIntentLabelKo,
} from "@/lib/globe/intent-supply/build-intent-supply-signal-chips";
import {
  dispatchGlobeIntentSupplyAck,
  dispatchGlobeIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-intent-supply-bridge";
import type { GlobeMapIntentSupplyResult } from "@/lib/globe/intent-supply/globe-map-intent-types";
import { resolveGlobeMapIntent } from "@/lib/globe/intent-supply/resolve-globe-map-intent";
import { runGlobeLodgingDiscovery } from "@/lib/globe/lodging/run-globe-lodging-discovery";
import { runGlobeEateryDiscovery } from "@/lib/globe/eatery/run-globe-eatery-discovery";
import { copy } from "@/lib/copy/human-ko";

export type RunGlobeMapIntentSupplyInput = {
  message: string;
  contextEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  layerMode?: "personal" | "discovery";
};

function buildRecallSummary(
  unified: ReturnType<typeof buildUnifiedExperienceContext>,
): string {
  const slice = unified.personExperienceSlice[0];
  if (!slice) {
    const hit = unified.memoryHits[0];
    if (hit) {
      return hit.summary.slice(0, 120);
    }
    return copy.globe.intentSupplyRecallFallback;
  }
  const place = slice.places[0]?.label;
  const exp = slice.experiences[0]?.title;
  if (place && exp) {
    return copy.globe.intentSupplyRecallPersonPlace(slice.displayName, place, exp);
  }
  if (place) {
    return copy.globe.intentSupplyRecallPersonPlaceOnly(slice.displayName, place);
  }
  return copy.globe.intentSupplyRecallPersonOnly(slice.displayName);
}

/**
 * Globe map prompt SSOT — parse intent, bind unified context, supply map resources.
 */
export async function runGlobeMapIntentSupply(
  input: RunGlobeMapIntentSupplyInput,
): Promise<GlobeMapIntentSupplyResult | null> {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const intent = resolveGlobeMapIntent(message);

  if (intent.kind === "market_compose") {
    return { status: "pass", pass: "market" };
  }
  if (intent.kind === "navigation_action") {
    return { status: "pass", pass: "navigation" };
  }
  if (
    input.layerMode === "discovery" &&
    intent.kind !== "lodging_supply" &&
    intent.kind !== "place_food_supply"
  ) {
    return { status: "pass", pass: "discovery" };
  }

  const masterContext =
    typeof window !== "undefined"
      ? readClientMasterOrchestratorContext()
      : defaultMasterOrchestratorContext();

  const unified = buildUnifiedExperienceContext({ message, masterContext });
  const signalChips = buildIntentSupplySignalChips({ unified, intent });
  const intentLabelKo = resolveIntentLabelKo(intent);

  dispatchGlobeIntentSupplyPending({ intentLabelKo, signalChips });

  let eventId = input.contextEventId?.trim() ?? null;
  const needsNewContext =
    !eventId &&
    (intent.kind === "lodging_supply" ||
      intent.kind === "people_recall" ||
      intent.kind === "place_food_supply" ||
      intent.kind === "context_connect");
  if (needsNewContext) {
    const captured = await commitTextContextIngress(message);
    eventId = captured.result.event.id;
  }
  if (!eventId) {
    return null;
  }

  if (intent.kind === "lodging_supply") {
    const discovery = await runGlobeLodgingDiscovery({
      message,
      contextEventId: eventId,
      lat: input.lat,
      lng: input.lng,
    });
    if (!discovery) {
      return null;
    }
    const ack = {
      eventId: discovery.eventId,
      intentKind: intent.kind,
      intentLabelKo,
      summaryKo: discovery.summaryKo,
      signalChips,
      suppliedResourceCount: discovery.resourceIds.length,
    } satisfies Parameters<typeof dispatchGlobeIntentSupplyAck>[0];
    dispatchGlobeIntentSupplyAck(ack);
    return { status: "supplied", ack, lodgingEventId: discovery.eventId };
  }

  if (intent.kind === "people_recall") {
    const summaryKo = buildRecallSummary(unified);
    const ack = {
      eventId,
      intentKind: intent.kind,
      intentLabelKo,
      summaryKo,
      signalChips,
      suppliedResourceCount: unified.memoryHits.length + unified.personExperienceSlice.length,
    };
    dispatchGlobeIntentSupplyAck(ack);
    return { status: "supplied", ack };
  }

  if (intent.kind === "place_food_supply") {
    const discovery = await runGlobeEateryDiscovery({
      message,
      contextEventId: eventId,
      lat: input.lat,
      lng: input.lng,
      searching: true,
    });
    if (!discovery) {
      return null;
    }
    const ack = {
      eventId: discovery.eventId,
      intentKind: intent.kind,
      intentLabelKo,
      summaryKo: discovery.summaryKo,
      signalChips,
      suppliedResourceCount: discovery.resourceIds.length,
    } satisfies Parameters<typeof dispatchGlobeIntentSupplyAck>[0];
    dispatchGlobeIntentSupplyAck(ack);
    return { status: "supplied", ack, foodEventId: discovery.eventId };
  }

  const event = findLifeEventCandidate(eventId);
  const ack = {
    eventId,
    intentKind: intent.kind,
    intentLabelKo,
    summaryKo: copy.globe.intentSupplyContextSummary(event?.title?.trim() || message.slice(0, 40)),
    signalChips,
    suppliedResourceCount: 1,
  };
  dispatchGlobeIntentSupplyAck(ack);
  return { status: "supplied", ack };
}
