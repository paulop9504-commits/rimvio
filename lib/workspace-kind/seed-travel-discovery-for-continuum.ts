/**
 * Continuum discovery fan-out — prepare every domain named in NL (Cursor-style).
 * Lodging · eatery · activity live Tool fill; never Reality-Commit.
 */

import { copy } from "@/lib/copy/human-ko";
import { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";
import {
  openLodgingContextWorkspace,
  openMapContextWorkspace,
} from "@/lib/context-workspace/open-map-workspace";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { concurrentDiscoveryResourceTypes } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { invokeRimvioToolAsync } from "@/lib/tool-registry";
import { syncTravelSdkFrameAfterLodgingSeed } from "@/lib/workspace-sdk/sync-travel-sdk-after-lodging-seed";
import { seedTravelLodgingForContinuum } from "@/lib/workspace-kind/run-workspace-intent-continuum";

function resolveDest(input: {
  readonly utterance: string;
  readonly contextEventId: string;
}): string {
  return (
    extractTravelDestination(input.utterance)?.trim() ||
    readContextWorkspace(input.contextEventId)?.constraintMemory
      ?.destinationKo?.trim() ||
    "여행지"
  );
}

async function seedEatery(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly dest: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<ContextWorkspaceState | null> {
  const tool = await invokeRimvioToolAsync("restaurant.lookup", {
    query: `${input.dest} 맛집`,
    utterance: input.utterance,
    contextEventId: input.contextEventId,
    lat: input.lat,
    lng: input.lng,
    domain: "eatery",
  });
  const raw = tool.candidates ?? [];
  const live = raw.filter((c) => {
    const id = c.id ?? "";
    if (id.startsWith("search:")) return false;
    if (c.source === "seed") return false;
    return true;
  });
  const candidates =
    live.length > 0
      ? live
      : raw.filter((c) => {
          const id = c.id ?? "";
          return !id.startsWith("search:") && (c.source === "seed" || id.startsWith("eatery:"));
        });

  if (candidates.length === 0) {
    return readContextWorkspace(input.contextEventId);
  }

  const workspace = openMapContextWorkspace({
    contextEventId: input.contextEventId,
    domain: "eatery",
    query: `${input.dest} 맛집`,
    summaryKo: copy.globe.workspacePreviewReady(candidates.length),
    candidates,
    source: "trip_prep",
    inventoryMode: "add",
  });
  appendWorkspacePreviewComposeTurn(input.contextEventId);
  return workspace;
}

async function seedActivity(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly dest: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<ContextWorkspaceState | null> {
  const tool = await invokeRimvioToolAsync("maps.search", {
    query: `${input.dest} 관광`,
    utterance: input.utterance,
    contextEventId: input.contextEventId,
    lat: input.lat,
    lng: input.lng,
    domain: "poi",
  });
  const candidates = (tool.candidates ?? []).filter(
    (c) => !(c.id ?? "").startsWith("search:"),
  );
  if (candidates.length === 0) {
    return readContextWorkspace(input.contextEventId);
  }
  const workspace = openMapContextWorkspace({
    contextEventId: input.contextEventId,
    domain: "poi",
    query: `${input.dest} 관광`,
    summaryKo: copy.globe.workspacePreviewReady(candidates.length),
    candidates,
    source: "trip_prep",
    inventoryMode: "add",
  });
  appendWorkspacePreviewComposeTurn(input.contextEventId);
  return workspace;
}

/**
 * Prepare every discovery domain named in the utterance (plus lodging default for trips).
 */
export async function seedTravelDiscoveryForContinuum(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<ContextWorkspaceState | null> {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) return null;

  const dest = resolveDest({ utterance, contextEventId });
  let types = concurrentDiscoveryResourceTypes(utterance);

  // Soft cues the concurrent detector may miss on short「호텔이랑 맛집」.
  if (hasLodgingDomainCue(utterance) && !types.includes("hotel")) {
    types = [...types, "hotel"];
  }
  if (hasEateryDomainCue(utterance) && !types.includes("restaurant")) {
    types = [...types, "restaurant"];
  }
  if (types.length === 0) {
    types = ["hotel"];
  }

  let last: ContextWorkspaceState | null = null;

  for (const resourceType of types) {
    if (resourceType === "hotel") {
      last = await seedTravelLodgingForContinuum({
        contextEventId,
        utterance,
        lat: input.lat,
        lng: input.lng,
      });
    } else if (resourceType === "restaurant") {
      last = await seedEatery({
        contextEventId,
        utterance,
        dest,
        lat: input.lat,
        lng: input.lng,
      });
    } else if (resourceType === "activity") {
      last = await seedActivity({
        contextEventId,
        utterance,
        dest,
        lat: input.lat,
        lng: input.lng,
      });
    }
  }

  const state = last ?? readContextWorkspace(contextEventId);
  if (state) {
    syncTravelSdkFrameAfterLodgingSeed({
      contextEventId,
      candidateCount: state.nodes.filter((n) => n.visible).length,
      headerTitleKo: dest,
    });
  }
  return state;
}
