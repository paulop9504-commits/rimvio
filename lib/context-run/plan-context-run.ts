import type { BoundSituation, ContextRunIngress, ContextRunPlan } from "@/lib/context-run/ingress-types";
import { resolveMentionContractPlan } from "@/lib/context-run/plan-mention-contract";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import { copy } from "@/lib/copy/human-ko";
import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

function planPortalComposeIfEligible(
  bound: BoundSituation,
  text: string,
  ingress: Extract<ContextRunIngress, { kind: "text" }>,
): ContextRunPlan | null {
  const base = { graphId: bound.graphId, goalKo: bound.goalKo };
  const activeRun = readActiveRunState();
  const pending = activeRun
    ? readPortalComposeRunState(activeRun.graphId)
    : null;

  if (pending?.status === "waiting_slot") {
    return {
      kind: "portal_compose_run",
      portalIntentId: pending.intentId,
      portalCategoryId: pending.categoryId,
      resumePortalRun: true,
      ...base,
    };
  }

  if (ingress.layerMode !== "personal") {
    return null;
  }
  if (ingress.surface !== "composer" && ingress.surface !== "capture_sheet") {
    return null;
  }

  const detected = detectPortalIntentFromText(text);
  if (!detected) {
    return null;
  }

  return {
    kind: "portal_compose_run",
    portalIntentId: detected.intentId,
    portalCategoryId: detected.categoryId,
    ...base,
  };
}

/** Deterministic planner — derives next step from bound situation (no LLM). */
export function planContextRun(bound: BoundSituation): ContextRunPlan {
  const { ingress, graphId, goalKo } = bound;
  const base = { graphId, goalKo };

  if (ingress.kind === "photo") {
    if (ingress.layerMode === "discovery") {
      return { kind: "discovery_photo_hint", ...base };
    }
    if (ingress.mode === "walkthrough") {
      return {
        kind: "photo_walkthrough",
        photoInput: {
          files: ingress.files,
          contextEventId: ingress.contextEventId,
          hintTitle: ingress.hintTitle,
          forceAttachToTarget: ingress.forceAttachToTarget,
        },
        ...base,
      };
    }
    return {
      kind: "photo_ingest",
      photoInput: {
        files: ingress.files,
        contextEventId: ingress.contextEventId,
        hintTitle: ingress.hintTitle,
        forceAttachToTarget: ingress.forceAttachToTarget,
      },
      ...base,
    };
  }

  if (ingress.kind === "share") {
    return {
      kind: "share_ingest",
      shareText: ingress.text.trim(),
      ...base,
    };
  }

  if (ingress.kind === "gps_dwell_confirm") {
    return {
      kind: "gps_dwell_confirm_open",
      gpsDwellEventId: ingress.eventId,
      ...base,
    };
  }

  if (ingress.kind !== "text") {
    return { kind: "noop", ...base };
  }

  const text = ingress.text.trim();
  if (!text) {
    return { kind: "noop", ...base };
  }

  const portalPlan = planPortalComposeIfEligible(bound, text, ingress);
  if (portalPlan) {
    return portalPlan;
  }

  if (ingress.surface === "capture_sheet") {
    if (ingress.layerMode === "discovery") {
      return { kind: "external_context_ask", ...base };
    }
    return { kind: "experience_run", ...base };
  }

  if (ingress.layerMode === "discovery") {
    if (isBareMarketComposeInput(text) || isMarketComposeInput(text)) {
      return {
        kind: "discovery_browse",
        composerPhase: "discovery_market_hint",
        ...base,
      };
    }
    const action = runGlobeComposerAction(text);
    if (action?.kind === "url") {
      return {
        kind: "external_url",
        url: action.url,
        urlLabel: action.label,
        ...base,
      };
    }
    return { kind: "discovery_hint", ...base };
  }

  const action = runGlobeComposerAction(text);
  if (action?.kind === "url") {
    return {
      kind: "external_url",
      url: action.url,
      urlLabel: action.label,
      ...base,
    };
  }

  const mentionContract = resolveMentionContractPlan(text);
  if (mentionContract) {
    return { ...mentionContract, ...base };
  }

  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal" &&
    classifyExperienceRunIntent(text)
  ) {
    return { kind: "experience_run", ...base };
  }

  return {
    kind: "map_intent_supply",
    supplyInput: {
      message: text,
      contextEventId: ingress.contextEventId,
      lat: ingress.lat,
      lng: ingress.lng,
      layerMode: ingress.layerMode,
    },
    ...base,
  };
}

/** Fallback when map supply does not attach resources — plain context memo. */
export function planTextIngestFallback(bound: BoundSituation): ContextRunPlan {
  return {
    kind: "text_ingest",
    graphId: bound.graphId,
    goalKo: bound.goalKo,
  };
}

export function planPersonalContextAskFallback(bound: BoundSituation): ContextRunPlan {
  return {
    kind: "personal_context_ask",
    graphId: bound.graphId,
    goalKo: bound.goalKo,
  };
}

export function planMarketPortalFallback(
  bound: BoundSituation,
  composeText: string,
  phase: "market_compose" | "market_supply_pass" = "market_compose",
): ContextRunPlan {
  return {
    kind: "market_portal",
    graphId: bound.graphId,
    goalKo: bound.goalKo,
    composerPhase: phase,
    composeText,
  };
}

export function discoveryHintMessage(): string {
  return copy.globe.ingestDiscoveryNearbyHint;
}

export function discoveryPhotoHintMessage(): string {
  return copy.globe.ingestDiscoveryNoTrace;
}
