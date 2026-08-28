/**
 * Object Discovery (ADR-050 STEP 2–3) — Planner decides, then Discovery runs.
 * Callers must not invoke Places / LiteAPI / tools directly for Workspace search.
 */

import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";
import { domainLabelKo } from "@/lib/context-workspace/types";
import {
  resolveWorkspaceSearchDomain,
  workspaceDomainToToolDomain,
} from "@/lib/context-workspace/resolve-workspace-search-domain";
import { scoutQueryWithConstraintMemory } from "@/lib/agent-policy";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";
import {
  invokeRimvioToolAsync,
  type RimvioToolId,
} from "@/lib/tool-registry/invoke-rimvio-tool";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import {
  DEFAULT_NEAR_RADIUS_METERS,
  distanceGateNearScout,
  gateNearScoutAnchor,
  resolveRealityAnchorFromUtterance,
} from "@/lib/context-workspace/reality-anchor";
import {
  planCapabilityDiscovery,
  type CapabilityDiscoveryPlan,
} from "@/lib/platform-sdk/discover-capabilities";
import type { UserMarketContext } from "@/lib/platform-sdk/user-market-context";
import {
  compileNlIntentFrame,
  isCommerceCapabilityIntent,
} from "@/lib/context-run/compile-nl-intent";
import type { RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";

export type { CapabilityDiscoveryPlan };

export type ObjectDiscoveryPlan = {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly domain: ContextWorkspaceDomain;
  readonly toolDomain: "lodging" | "eatery" | "poi" | "amenity";
  readonly toolId: RimvioToolId;
  readonly query: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly placeName: string | null;
  readonly mode: "replace" | "add";
  /** Planner label for status work-log */
  readonly planLabelKo: string;
  /** Slice A — near scout blocked until Anchor resolves */
  readonly nearScoutBlockedKo?: string | null;
  /** Hub Capability Index hit — platform discovery before place search */
  readonly hubCapability?: CapabilityDiscoveryPlan | null;
};

export type ObjectDiscoveryResult = {
  readonly ok: boolean;
  readonly plan: ObjectDiscoveryPlan;
  readonly candidates: readonly SearchToolCandidate[];
  readonly summaryKo: string | null;
  readonly reasonKo: string | null;
};

function filterDiscoveryCandidates(
  candidates: readonly SearchToolCandidate[],
  opts?: { readonly allowLodgingStaySeed?: boolean },
): SearchToolCandidate[] {
  return [...(candidates ?? [])].filter((c) => {
    const id = c.id ?? "";
    if (id.startsWith("search:")) return false;
    // World-geo / catalog landmarks stay (poi:osaka:usj, geo:…).
    if (/^(?:eatery|lodging|poi|amenity):/i.test(id)) return true;
    if (id.startsWith("geo:")) return true;
    if (c.source === "seed") {
      // Capsule · hostel soft inventory (maps:jp:…) — not Riverview orbit seeds.
      if (
        opts?.allowLodgingStaySeed &&
        (id.startsWith("maps:") || id.startsWith("jp:") || /캡슐|capsule|호스텔|hostel|게스트/iu.test(c.labelKo ?? ""))
      ) {
        return true;
      }
      return false;
    }
    return true;
  });
}

/** Named Reality Anchor → operable candidate (never invent; world-geo SSOT). */
function realityAnchorCandidate(
  utterance: string,
): SearchToolCandidate | null {
  const anchor = resolveRealityAnchorFromUtterance(utterance);
  // Lodging/discovery inventory must never stamp city · prefecture · station as a "후보".
  if (!anchor || anchor.kind !== "poi") return null;
  if (!/usj|유니버설|유니버셜|universal|도톤|osaka\s*castle|오사카성/iu.test(
    `${anchor.geoId} ${anchor.labelKo} ${utterance}`,
  )) {
    return null;
  }
  const slug = anchor.geoId
    .replace(/^geo:(?:jp:)?/u, "")
    .replace(/:/g, "-");
  return {
    id: `poi:osaka:${slug}`,
    labelKo: anchor.labelKo,
    lat: anchor.lat,
    lng: anchor.lng,
    rating: 4.6,
    walkMinutes: null,
    priceBand: null,
    reservable: true,
    localFavorite: false,
    source: "maps",
    amountLabel: null,
  };
}

function isLandmarkLabel(c: SearchToolCandidate): boolean {
  return /usj|유니버설|유니버셜|universal/iu.test(`${c.id} ${c.labelKo}`);
}

/**
 * STEP 2 — Planner First: decide what/where/which tool before any provider call.
 */
export function planObjectDiscovery(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly mode: "replace" | "add";
  readonly userMarket?: Partial<UserMarketContext>;
  readonly intentFrame?: RimvioIntentFrame | null;
}): ObjectDiscoveryPlan | null {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) return null;

  const state = readContextWorkspace(contextEventId);
  if (!state) return null;

  const intentFrame = input.intentFrame ?? compileNlIntentFrame(utterance);
  const commerceIntent =
    intentFrame && isCommerceCapabilityIntent(intentFrame, utterance);

  const hubCapability = commerceIntent
    ? planCapabilityDiscovery({
        utterance,
        userMarket: input.userMarket,
        intentFrame,
      })
    : null;
  if (hubCapability) {
    const domain = resolveWorkspaceSearchDomain(utterance, state.domain);
    const toolDomain = workspaceDomainToToolDomain(domain);
    const toolId = resolveLookupToolId(toolDomain, utterance);
    return {
      contextEventId,
      utterance,
      domain,
      toolDomain,
      toolId,
      query: utterance,
      lat: null,
      lng: null,
      placeName: null,
      mode: input.mode,
      planLabelKo: hubCapability.planLabelKo,
      nearScoutBlockedKo: null,
      hubCapability,
    };
  }

  const domain = resolveWorkspaceSearchDomain(utterance, state.domain);
  const toolDomain = workspaceDomainToToolDomain(domain);
  const toolId = resolveLookupToolId(toolDomain, utterance);

  const nearGate = gateNearScoutAnchor({ utterance });
  if (nearGate.gated && !nearGate.ok) {
    return {
      contextEventId,
      utterance,
      domain,
      toolDomain,
      toolId,
      query: utterance,
      lat: null,
      lng: null,
      placeName: null,
      mode: input.mode,
      planLabelKo: `${domainLabelKo(domain)} · Anchor 미확정`,
      nearScoutBlockedKo: nearGate.statusKo,
    };
  }

  const seed =
    nearGate.gated && nearGate.ok
      ? {
          lat: nearGate.anchor.lat,
          lng: nearGate.anchor.lng,
        }
      : (state.nodes.find((n) => n.selected) ??
        state.nodes.find((n) => n.bookmarked && n.visible) ??
        state.nodes.find((n) => n.visible) ??
        null);

  const query =
    scoutQueryWithConstraintMemory({
      contextEventId,
      utterance: utterance || state.query || "",
    }) ||
    state.query ||
    `${domainLabelKo(domain)} 찾기`;

  const placeName =
    (nearGate.gated && nearGate.ok ? nearGate.anchor.labelKo : null) ||
    state.summaryKo?.replace(/\s*여행.*$/u, "").trim() ||
    state.query ||
    null;

  return {
    contextEventId,
    utterance,
    domain,
    toolDomain,
    toolId,
    query,
    lat: seed?.lat ?? null,
    lng: seed?.lng ?? null,
    placeName,
    mode: input.mode,
    planLabelKo: `${domainLabelKo(domain)} · ${toolId}`,
    nearScoutBlockedKo: null,
  };
}

/**
 * STEP 3 — Discovery only after a plan exists.
 */
export async function runObjectDiscovery(
  plan: ObjectDiscoveryPlan,
): Promise<ObjectDiscoveryResult> {
  if (plan.hubCapability) {
    const hub = plan.hubCapability;
    return {
      ok: true,
      plan,
      candidates: [],
      summaryKo: `${hub.platformName} · ${hub.marketCountry} · ${hub.capabilityId} 준비`,
      reasonKo: hub.matchReason,
    };
  }

  if (plan.nearScoutBlockedKo) {
    return {
      ok: false,
      plan,
      candidates: [],
      summaryKo: plan.nearScoutBlockedKo,
      reasonKo: plan.nearScoutBlockedKo,
    };
  }
  try {
    const invokeDomain =
      plan.toolDomain === "amenity" ? "poi" : plan.toolDomain;
    const tool = await invokeRimvioToolAsync(plan.toolId, {
      query: plan.query,
      domain: invokeDomain,
      lat: plan.lat ?? undefined,
      lng: plan.lng ?? undefined,
      utterance: plan.utterance,
      contextEventId: plan.contextEventId,
      placeName: plan.placeName ?? undefined,
    });

    let candidates = filterDiscoveryCandidates(tool.candidates ?? [], {
      allowLodgingStaySeed:
        plan.toolDomain === "lodging" &&
        (/캡슐|capsule|호스텔|hostel|게스트|료칸|ryokan/iu.test(plan.utterance) ||
          /캡슐|capsule|호스텔|hostel|게스트|료칸|ryokan/iu.test(plan.query)),
    });

    // Landmark SSOT — 「유니버셜 스튜디오 찾아」 must surface USJ even when
    // Maps/live/catalog miss or only return unrelated Namba POIs.
    const landmark = realityAnchorCandidate(plan.utterance);
    if (landmark) {
      const already = candidates.some(isLandmarkLabel);
      if (!already) {
        candidates = [landmark, ...candidates];
      } else {
        candidates = [
          ...candidates.filter(isLandmarkLabel),
          ...candidates.filter((c) => !isLandmarkLabel(c)),
        ];
      }
    }

    // Slice B — near scout Distance Gate (Anchor correctness already in plan).
    const nearGate = gateNearScoutAnchor({ utterance: plan.utterance });
    let distanceStatusKo: string | null = null;
    if (nearGate.gated && nearGate.ok) {
      const gated = distanceGateNearScout({
        anchor: {
          lat: nearGate.anchor.lat,
          lng: nearGate.anchor.lng,
          labelKo: nearGate.anchor.labelKo,
        },
        candidates,
        radiusMeters: DEFAULT_NEAR_RADIUS_METERS,
      });
      candidates = [...gated.kept];
      distanceStatusKo = gated.statusKo;
      if (candidates.length === 0) {
        return {
          ok: false,
          plan,
          candidates: [],
          summaryKo: distanceStatusKo,
          reasonKo: distanceStatusKo,
        };
      }
    }

    return {
      ok: true,
      plan,
      candidates,
      summaryKo:
        distanceStatusKo ||
        tool.summaryKo?.trim() ||
        (candidates[0] ? `${candidates[0].labelKo}을 찾았어요` : null),
      reasonKo: null,
    };
  } catch {
    const landmark = realityAnchorCandidate(plan.utterance);
    if (landmark) {
      return {
        ok: true,
        plan,
        candidates: [landmark],
        summaryKo: `${landmark.labelKo}을 찾았어요`,
        reasonKo: null,
      };
    }
    return {
      ok: false,
      plan,
      candidates: [],
      summaryKo: null,
      reasonKo: "지금은 다시 못 찾았어요 · 조건을 짧게 말해 보세요",
    };
  }
}
