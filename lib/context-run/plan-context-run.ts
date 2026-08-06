import type { BoundSituation, ContextRunIngress, ContextRunPlan } from "@/lib/context-run/ingress-types";
import { classifyGlobeAiIntentFallback } from "@/lib/context-run/classify-globe-ai-intent";
import { resolveMentionContractPlan } from "@/lib/context-run/plan-mention-contract";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import { copy } from "@/lib/copy/human-ko";
import { resolveGlobeMapIntent } from "@/lib/globe/intent-supply/resolve-globe-map-intent";
import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { planPersonalRecallAskIfEligible } from "@/lib/context-run/plan-personal-recall-ask";
import { resolveSmallTalk } from "@/lib/globe/context-condition-ai/resolve-small-talk";
import {
  compileGlobeIngress,
  isGlobeIngressEligible,
} from "@/lib/globe-ingress";
import {
  parseGraphCommands,
  readSessionGraph,
} from "@/lib/graph-command";
import { isCompoundActionUtterance } from "@/lib/action-planner";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import { resolveIngressContextEventId } from "@/lib/context-run/should-spawn-new-context";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { isNewTripGlobeIngressUtterance } from "@/lib/context-run/is-new-trip-globe-ingress-utterance";
import {
  hasActiveWorkspaceForGlobePrompt,
  resolveActiveWorkspaceContextId,
} from "@/lib/context-run/resolve-active-workspace-context";
import { looksLikeStrictConversationalAsk } from "@/lib/context-run/try-apply-conversational-turn";
import { isAgentExecuteVerbUtterance } from "@/lib/context-run/is-agent-execute-verb";

function planPortalComposeResumeIfEligible(
  bound: BoundSituation,
): ContextRunPlan | null {
  const pending = readPortalComposeRunState();
  if (
    pending?.status !== "waiting_slot" &&
    pending?.status !== "drafting" &&
    pending?.status !== "conversing"
  ) {
    return null;
  }
  const text = bound.goalKo.trim();
  // Execute / trip create must break out of portal converse clarify loops.
  if (
    isAgentExecuteVerbUtterance(text) ||
    isNewTripGlobeIngressUtterance(text) ||
    isWorkspaceAgentWorkUtterance(text)
  ) {
    return null;
  }
  return {
    kind: "portal_compose_run",
    portalIntentId: pending.intentId,
    portalCategoryId: pending.categoryId,
    resumePortalRun: true,
    graphId: pending.graphId,
    goalKo: bound.goalKo,
  };
}

/**
 * Fresh portal (together / join…). Marketplace NL → continuum (ADR-032), not portal.
 */
function planPortalComposeFreshIfEligible(
  bound: BoundSituation,
  text: string,
  ingress: Extract<ContextRunIngress, { kind: "text" }>,
): ContextRunPlan | null {
  const base = { graphId: bound.graphId, goalKo: bound.goalKo };

  if (ingress.layerMode !== "personal") {
    return null;
  }
  if (ingress.surface !== "composer" && ingress.surface !== "capture_sheet") {
    return null;
  }

  // Used-goods / driver are Context kinds on the Workspace continuum.
  const workspaceKind = classifyWorkspaceKind(text);
  if (workspaceKind === "used_goods" || workspaceKind === "driver") {
    return null;
  }

  const detected = detectPortalIntentFromText(text);
  if (!detected) {
    return null;
  }
  // Defense: market category must not open portal as product SSOT.
  if (detected.categoryId === "used_goods") {
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

  const recallPlan = planPersonalRecallAskIfEligible(bound, text);
  if (recallPlan) {
    return recallPlan;
  }

  // Execute verb first — never trap 「계획 너가 세워줘」in portal/small_talk.
  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal" &&
    isAgentExecuteVerbUtterance(text)
  ) {
    const explicit = ingress.contextEventId?.trim() || null;
    const workspaceAgentContextEventId =
      resolveActiveWorkspaceContextId({
        explicitContextEventId: explicit,
      }) ??
      explicit ??
      undefined;
    return {
      kind: "workspace_agent",
      workspaceAgentContextEventId,
      composeAmbientChat: true,
      ...base,
    };
  }

  const portalResume = planPortalComposeResumeIfEligible(bound);
  if (portalResume) {
    return portalResume;
  }

  // Free-talk / knowledge BEFORE Workspace Agent — never Patch on「ㅎㅇ」.
  // Strict gate only (memos · marketplace · trips fall through).
  if (
    ingress.surface === "composer" &&
    looksLikeStrictConversationalAsk(text) &&
    !isNewTripGlobeIngressUtterance(text) &&
    !isAgentExecuteVerbUtterance(text)
  ) {
    const smallTalk = resolveSmallTalk({ text });
    return {
      kind: "small_talk",
      smallTalkReplyKo: smallTalk?.replyKo,
      composeAmbientChat: true,
      ...base,
    };
  }

  // Driver + Marketplace + Travel frame — before vague chat absorption into Agent.
  // Travel Continuum auto-opens Workspace (no 「작업장 열기」). New-trip + stay
  // with Day skeleton still prefers globe_ingress below.
  if (
    (ingress.surface === "composer" || ingress.surface === "capture_sheet") &&
    ingress.layerMode === "personal"
  ) {
    const workspaceKind = classifyWorkspaceKind(text);
    if (workspaceKind === "driver" || workspaceKind === "used_goods") {
      return { kind: "workspace_intent_continuum", ...base };
    }
    if (
      workspaceKind === "travel" &&
      !isNewTripGlobeIngressUtterance(text) &&
      !hasActiveWorkspaceForGlobePrompt({
        explicitContextEventId: ingress.contextEventId,
      })
    ) {
      return { kind: "workspace_intent_continuum", ...base };
    }
  }

  // New trip create — Globe Ingress → Continuum Day1..N (before Agent / compound).
  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal" &&
    isNewTripGlobeIngressUtterance(text)
  ) {
    const existingContextId = resolveIngressContextEventId({
      utterance: text,
      activeContextEventId: ingress.contextEventId,
      forceNewContext: ingress.forceNewContext === true,
    });
    return {
      kind: "globe_ingress",
      globeIngress: compileGlobeIngress({
        text,
        existingContextId,
      }),
      ...base,
    };
  }

  // Active Workspace → Agent Loop only for real work (Patch/Scout/Prepare).
  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal"
  ) {
    const explicit = ingress.contextEventId?.trim() || null;
    if (
      hasActiveWorkspaceForGlobePrompt({
        explicitContextEventId: explicit,
      }) &&
      isWorkspaceAgentWorkUtterance(text)
    ) {
      const workspaceAgentContextEventId =
        resolveActiveWorkspaceContextId({
          explicitContextEventId: explicit,
        }) ?? explicit ?? undefined;
      return {
        kind: "workspace_agent",
        workspaceAgentContextEventId,
        composeAmbientChat: true,
        ...base,
      };
    }
  }

  // Clear Workspace work without an open draft — Agent Loop may mint Continuum.
  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal" &&
    isWorkspaceAgentWorkUtterance(text)
  ) {
    const explicit = ingress.contextEventId?.trim() || null;
    return {
      kind: "workspace_agent",
      workspaceAgentContextEventId: explicit || undefined,
      composeAmbientChat: true,
      ...base,
    };
  }

  // Graph Command OS — NL → graph edit (before map_intent / discovery scout).
  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal"
  ) {
    const contextEventId =
      ingress.contextEventId?.trim() || bound.graphId;
    const session = readSessionGraph(contextEventId);
    const graphCommands = parseGraphCommands(text, session);
    if (
      (graphCommands.length > 0 || isCompoundActionUtterance(text)) &&
      !isNewTripGlobeIngressUtterance(text)
    ) {
      return {
        kind: "graph_command",
        graphCommands,
        graphCommandContextEventId: contextEventId,
        composeAmbientChat: true,
        ...base,
      };
    }
  }

  const portalPlan = planPortalComposeFreshIfEligible(bound, text, ingress);
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
    isGlobeIngressEligible(text)
  ) {
    const existingContextId = resolveIngressContextEventId({
      utterance: text,
      activeContextEventId: ingress.contextEventId,
      forceNewContext: ingress.forceNewContext === true,
    });
    return {
      kind: "globe_ingress",
      globeIngress: compileGlobeIngress({
        text,
        existingContextId,
      }),
      ...base,
    };
  }

  if (
    ingress.surface === "composer" &&
    ingress.layerMode === "personal" &&
    classifyExperienceRunIntent(text)
  ) {
    return { kind: "experience_run", ...base };
  }

  const mapIntent = resolveGlobeMapIntent(text);
  if (mapIntent.kind !== "unknown") {
    return {
      kind: "map_intent_supply",
      supplyInput: {
        message: text,
        contextEventId:
          mapIntent.kind === "context_connect" ? ingress.contextEventId : null,
        lat: ingress.lat,
        lng: ingress.lng,
        layerMode: ingress.layerMode,
      },
      ...base,
    };
  }

  if (ingress.surface === "composer" && ingress.layerMode === "personal") {
    const fallback = classifyGlobeAiIntentFallback(text);
    if (fallback.kind === "text_ingest") {
      return planTextIngestFallback(bound);
    }
    return planPersonalContextAskFallback(bound);
  }

  return planTextIngestFallback(bound);
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
