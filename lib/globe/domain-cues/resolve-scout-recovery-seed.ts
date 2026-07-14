/**
 * Scout fail / reject retry — preserve last user intent (kind · price wording).
 * Never wipe hostel/price into a generic “주변 호텔”.
 */

import { readContextAgentComposeThread } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { readActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import {
  defaultEateryWidenSeed,
  widenPriorEateryUtterance,
} from "@/lib/globe/domain-cues/eatery-domain-cues";
import {
  defaultLodgingWidenSeed,
  parseLodgingKindFromText,
  widenPriorLodgingUtterance,
} from "@/lib/globe/domain-cues/lodging-domain-cues";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

function defaultSeedForEngine(engineId: RimvioEngineId): string {
  switch (engineId) {
    case "lodging_search":
      return defaultLodgingWidenSeed(null);
    case "eatery_search":
      return defaultEateryWidenSeed();
    case "activity_search":
      return "주변 놀거리 더 찾아줘";
    case "local_amenity_search":
      return "근처 편의시설 더 찾아줘";
    case "trip_experience_search":
      return "숙소 맛집 놀거리 같이 더 찾아줘";
    default:
      return "비슷한 후보 다시 찾아줘";
  }
}

function widenForEngine(prior: string, engineId: RimvioEngineId): string {
  switch (engineId) {
    case "lodging_search":
      return widenPriorLodgingUtterance(prior);
    case "eatery_search":
      return widenPriorEateryUtterance(prior);
    default: {
      const trimmed = prior.trim();
      if (!trimmed) {
        return defaultSeedForEngine(engineId);
      }
      if (/더\s*찾|다시\s*찾|더\s*넓/iu.test(trimmed)) {
        return trimmed;
      }
      const base =
        trimmed
          .replace(/\s*(?:찾아\s*줘|찾아줘|해\s*줘|해줘|좀)$/iu, "")
          .trim() || trimmed;
      return `${base} 더 찾아줘`;
    }
  }
}

function readLastUserComposeText(contextEventId: string): string | null {
  const rows = readContextAgentComposeThread(contextEventId);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row?.role === "user") {
      const text = row.text.trim();
      if (text) {
        return text;
      }
    }
  }
  return null;
}

function readLastScoutTrigger(contextEventId: string): string | null {
  const active = readActiveDiscoveryExecution(contextEventId);
  const fromActive = active?.triggerMessage?.trim();
  if (fromActive) {
    return fromActive;
  }
  const rows = readContextAgentComposeThread(contextEventId);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (
      row?.role === "assistant" &&
      row.kind === "scout_feed_gate" &&
      row.payload.triggerMessage?.trim()
    ) {
      return row.payload.triggerMessage.trim();
    }
  }
  return null;
}

/**
 * Explicit seed → active discovery trigger → last user compose → engine default.
 * Lodging default uses 「숙소」 not 「호텔」; hostel prior → guest-house widen.
 */
export function resolveScoutRecoverySeed(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  seedUtterance?: string | null;
}): string {
  const explicit = input.seedUtterance?.trim();
  if (explicit) {
    return widenForEngine(explicit, input.engineId);
  }

  const fromScout = readLastScoutTrigger(input.contextEventId);
  if (fromScout) {
    if (input.engineId === "lodging_search") {
      const kind = parseLodgingKindFromText(fromScout);
      if (kind === "hostel" || kind === "airbnb" || kind === "hotel") {
        return widenPriorLodgingUtterance(fromScout);
      }
    }
    return widenForEngine(fromScout, input.engineId);
  }

  const fromUser = readLastUserComposeText(input.contextEventId);
  if (fromUser) {
    return widenForEngine(fromUser, input.engineId);
  }

  if (input.engineId === "lodging_search") {
    return defaultLodgingWidenSeed(null);
  }
  return defaultSeedForEngine(input.engineId);
}
