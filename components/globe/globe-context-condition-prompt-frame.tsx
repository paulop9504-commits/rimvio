"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { Blend, X } from "lucide-react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeAssistantComposeThread } from "@/components/globe/globe-assistant-compose-thread";
import { dispatchRealityJump } from "@/lib/globe/reality-jump";
import { GlobeContextAgentConditionQuestions } from "@/components/globe/globe-context-agent-condition-questions";
import { GlobePalantirOperatorBrief } from "@/components/globe/globe-palantir-operator-brief";
import { GlobePalantirOperatorCommitRail } from "@/components/globe/globe-palantir-operator-commit-rail";
import { GlobePalantirOntologyHistoryHint } from "@/components/globe/globe-palantir-ontology-history-hint";
import { GlobeContextAgentOntologyGraph } from "@/components/globe/globe-context-agent-ontology-graph";
import { GlobeContextAgentProcessStrip } from "@/components/globe/globe-context-agent-process-strip";
import { GlobeContextAssistantWorkChips } from "@/components/globe/globe-context-assistant-work-chips";
import { GlobeContextAgentRefineChips } from "@/components/globe/globe-context-agent-refine-chips";
import { GlobeContextExplorationModeChips } from "@/components/globe/globe-context-exploration-mode-chips";
import { GlobeContextActionInjectionCard } from "@/components/globe/globe-context-action-injection-card";
import { GlobeContextConditionPinBar, type GlobeContextConditionPinBarHandle, type IntakeSlotsSubmitInput, type AskChipPickInput } from "@/components/globe/globe-context-condition-pin-bar";
import { GlobeDiscoveryLensBar } from "@/components/globe/globe-discovery-lens-bar";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { activateDiscoveryExecutionSnapshot } from "@/lib/globe/discovery-execution/discovery-execution-archive";
import { copy } from "@/lib/copy/human-ko";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { isScoutMapRevealUtterance } from "@/lib/globe/context-condition-ai/is-scout-map-reveal-utterance";
import { isPcPurchaseContinuityUtterance } from "@/lib/pc-local-agent/purchase-intent";
import { startPcPurchaseAgentRun } from "@/lib/pc-local-agent/run-purchase-agent";
import { revealContextConditionScout } from "@/lib/globe/context-condition-ai/reveal-context-condition-scout";
import {
  readContextConditionLastBatch,
  readContextConditionPinnedPlaceIds,
  pinContextConditionRecommendation,
  isContextConditionLastBatchMisanchored,
  clearContextConditionLastBatch,
  clearContextConditionPending,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import { runScoutQualityCoachAfterScout } from "@/lib/globe/discovery-quality";
import { resolveDiscoveryEngineId } from "@/lib/engine/resolve-discovery-engine-id";
import { commitOneShotLodgingMainOfferClient } from "@/lib/globe/lodging-prep";
import {
  commitOneShotTripExperienceMainClient,
  isTripExperienceScoutBatchId,
} from "@/lib/globe/trip-experience";
import { dispatchIntelligentDiscoveryFeedOpen } from "@/lib/globe/intelligent-pin";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";
import { useIntelligentDiscoveryFeedFocus } from "@/lib/globe/intelligent-pin/use-intelligent-discovery-feed-focus";
import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
import {
  readExplorationModeOverride,
  resolveExplorationMode,
  subscribeExplorationModeOverride,
  type ExplorationMode,
} from "@/lib/globe/discovery-policy";
import { writeScoutSelectedAnchor } from "@/lib/globe/contracts";
import type {
  ContextConditionRecommendation,
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  readContextAgentRuntimeState,
  readContextAgentSessionState,
  subscribeContextAgentRuntime,
  subscribeContextAgentSession,
  subscribeContextAgentInterpretation,
  readContextAgentInterpretationForEvent,
  clearContextAgentInterpretation,
  setContextAgentSessionPhase,
  isGlobeContextAgentBound,
  type ContextAgentRuntimeState,
  type ContextAgentSessionState,
  publishContextAgentGlobeMarkerFocus,
} from "@/lib/globe/context-agent";
import { snapGlobeToContextConditionScout } from "@/lib/globe/context-agent/snap-globe-to-context-agent-anchor";
import {
  dispatchGlobePlaceOntologyFocus,
  recommendationKindToReelKind,
} from "@/lib/globe/place-ontology/globe-place-ontology-focus-bridge";
import {
  confirmContextActionInjection,
  dismissContextActionInjection,
  markContextActionInjectionExecuted,
  publishContextActionInjection,
  readContextActionInjection,
  subscribeContextActionInjection,
  clearContextActionInjection,
} from "@/lib/globe/context-action-injection";
import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";
import { prefetchContextAgentSurroundings } from "@/lib/globe/context-agent";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { openIdentityVaultSettings } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import {
  appendContextAgentComposeTurn,
  appendLodgingRoomCardsComposeTurn,
  buildContextAssistantWorkChips,
  clearContextAgentComposeThread,
  CONTEXT_AGENT_ASK_FIRST,
  markScoutFeedGateOpened,
  patchScoutFeedGateAfterCorrection,
  readContextAgentComposeThread,
  resolveContextAgentPipelinePhase,
  resolveGlobeComposePipelineLabel,
  subscribeContextAgentComposeThread,
  type ContextAgentComposeTurn,
} from "@/lib/globe/assistant";
import {
  HUB_ACTION_LOG_EVENT,
  readHubActionLog,
} from "@/lib/globe/resource/hub-action-record-store";
import {
  enrichContextIntentBlueprintClient,
  isTripReviseUtterance,
  needsIntentSlotLlmFill,
  startIntentExecutionTimelineWalk,
} from "@/lib/intent-engine";
import {
  isResearchUtterance,
  runContextResearchEngineClient,
} from "@/lib/research-engine";
import { applyScoutDomainCorrection } from "@/lib/globe/context-condition-ai/apply-scout-domain-correction";
import {
  resolveCicadaAgentPhase,
  resolveCicadaAgentPhaseLabel,
} from "@/lib/globe/context-agent/resolve-cicada-agent-phase";
import { subscribeContextAgentGlobeMarkerFocus } from "@/lib/globe/context-agent/context-agent-globe-marker-focus";
import { buildContextAgentMarkerActionHint } from "@/lib/globe/context-agent/context-agent-globe-marker-focus";
import { resolveCicadaAssistantSurfaceMode } from "@/lib/globe/context-agent/resolve-cicada-assistant-surface-mode";
import {
  applyPalantirOperatorAfterScout,
  applyPalantirOperatorPlaceOverride,
  clearGeoOntologyGraph,
  clearPalantirWorkspaceSnapshot,
  highlightGeoOntologyPlace,
  publishContextOnlyGlobeProjection,
  publishFocusGlobeProjection,
  readGeoOntologyFacetState,
  readGeoOntologyGraph,
  readPalantirWorkspaceSnapshot,
  isPalantirOntologyDevSurfaceEnabled,
  executePalantirCommit,
  resolvePalantirCommitAction,
  restorePalantirOntologyHead,
  subscribeGeoOntologyFacetState,
  subscribeGeoOntologyGraph,
  subscribePalantirWorkspaceSnapshot,
  type GeoOntologyGraph,
  type PalantirWorkspaceSnapshot,
} from "@/lib/globe/spatial-semantic";
import {
  readDiscoveryLensSession,
  subscribeDiscoveryLensSession,
  type DiscoveryLensId,
  type DiscoveryLensSession,
} from "@/lib/globe/discovery-lens";
import {
  isGlobeComposeInputFocused,
  subscribeGlobeComposeInputFocus,
} from "@/lib/globe/compose-input-focus";
import {
  CONTEXT_ASSISTANT_OPACITY_MAX,
  CONTEXT_ASSISTANT_OPACITY_MIN,
  useContextAssistantShellOpacity,
} from "@/hooks/use-context-assistant-shell-opacity";
import { cn } from "@/lib/utils";
import {
  RIMVIO_ASSISTANT_FEED_BACKDROP_Z_INDEX,
  RIMVIO_ASSISTANT_FRAME_Z_INDEX,
  rimvioAssistantFrameShellClass,
  rimvioAssistantTitleClass,
} from "@/lib/design/globe-assistant-surface";

export type GlobeContextConditionPromptFrameProps = {
  open: boolean;
  event: EventCandidate | null;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  /** TravelTrip Blueprint for broad parallel onboarding (optional). */
  operatorBlueprint?: ContextBlueprint | null;
  destinationConfirmed?: boolean;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onClose: () => void;
  className?: string;
};

/** Context-bound execution layer - talk thread + globe apply (Cursor-style). */
export const GlobeContextConditionPromptFrame = memo(function GlobeContextConditionPromptFrame({
  open,
  event,
  anchorPlaceId,
  anchorPlaceName,
  anchorLat,
  anchorLng,
  anchorPriceKrw = null,
  userLat = null,
  userLng = null,
  operatorBlueprint = null,
  destinationConfirmed = false,
  globeRef,
  onClose,
  className,
}: GlobeContextConditionPromptFrameProps) {
  const [runtime, setRuntime] = useState<ContextAgentRuntimeState>(() =>
    readContextAgentRuntimeState(),
  );
  const [agentSession, setAgentSession] = useState<ContextAgentSessionState>(() =>
    readContextAgentSessionState(),
  );
  const [actionInjection, setActionInjection] =
    useState<ContextActionInjection | null>(() => readContextActionInjection());
  const [questions, setQuestions] = useState<readonly LocalDiscoveryQuestion[]>([]);
  const [recommendations, setRecommendations] = useState<
    readonly ContextConditionRecommendation[]
  >([]);
  const questionHandlerRef = useRef<
    (choice: LocalDiscoveryQuestionChoice) => void
  >(() => {});
  const lensHandlerRef = useRef<(lensId: DiscoveryLensId) => void>(() => {});
  const intakeSubmitRef = useRef<
    ((input: IntakeSlotsSubmitInput) => Promise<void>) | null
  >(null);
  const askChipPickRef = useRef<
    ((input: AskChipPickInput) => Promise<void>) | null
  >(null);
  const registerQuestionHandler = useCallback(
    (handler: (choice: LocalDiscoveryQuestionChoice) => void) => {
      questionHandlerRef.current = handler;
    },
    [],
  );
  const registerLensHandler = useCallback(
    (handler: (lensId: DiscoveryLensId) => void) => {
      lensHandlerRef.current = handler;
    },
    [],
  );
  const registerIntakeSubmitHandler = useCallback(
    (handler: (input: IntakeSlotsSubmitInput) => Promise<void>) => {
      intakeSubmitRef.current = handler;
    },
    [],
  );
  const registerAskChipPickHandler = useCallback(
    (handler: (input: AskChipPickInput) => Promise<void>) => {
      askChipPickRef.current = handler;
    },
    [],
  );
  const [lensSession, setLensSession] = useState<DiscoveryLensSession | null>(
    () => (event ? readDiscoveryLensSession(event.id) : null),
  );
  const pinBarRef = useRef<GlobeContextConditionPinBarHandle>(null);
  const prefetchStartedRef = useRef(false);
  const intentTimelineWalkRef = useRef<{ stop: () => void } | null>(null);
  const [refineBusy, setRefineBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [pickBusyPlaceId, setPickBusyPlaceId] = useState<string | null>(null);
  const [scoutFeedGateBusy, setScoutFeedGateBusy] = useState(false);
  const discoveryFeedFocus = useIntelligentDiscoveryFeedFocus(event?.id);
  const { opacity: shellOpacity, setOpacity: setShellOpacity } =
    useContextAssistantShellOpacity();
  const [hubActionLogRevision, setHubActionLogRevision] = useState(0);
  const [pinnedRevision, setPinnedRevision] = useState(0);
  const [explorationRevision, setExplorationRevision] = useState(0);
  const [activeSpec, setActiveSpec] = useState<
    import("@/lib/globe/context-condition-ai/local-discovery-action-types").LocalDiscoveryActionSpec | null
  >(null);
  const [ontologyGraph, setOntologyGraph] = useState<GeoOntologyGraph | null>(null);
  const [ontologyFacetRevision, setOntologyFacetRevision] = useState(0);
  const [palantirWorkspaceRevision, setPalantirWorkspaceRevision] = useState(0);
  const [ontologyHistoryResumeLabel, setOntologyHistoryResumeLabel] = useState<
    string | null
  >(null);
  const [ontologyExpanded, setOntologyExpanded] = useState(false);
  const [composeThread, setComposeThread] = useState<readonly ContextAgentComposeTurn[]>([]);
  const [typewriterTurnId, setTypewriterTurnId] = useState<string | null>(null);
  const lastFlownPlaceRef = useRef<string | null>(null);
  const lastInterpretationRef = useRef<string | null>(null);
  const ontologyDevSurface = isPalantirOntologyDevSurfaceEnabled();

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    return subscribeDiscoveryLensSession((session) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      if (session && session.contextEventId !== event.id) {
        return;
      }
      startTransition(() => {
        setLensSession(session);
      });
    });
  }, [event, open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const onHubActionLog = (raw: Event) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      const detail = (raw as CustomEvent<{ contextEventId?: string }>).detail;
      if (
        detail?.contextEventId &&
        detail.contextEventId !== event.id
      ) {
        return;
      }
      setHubActionLogRevision((value) => value + 1);
    };
    window.addEventListener(HUB_ACTION_LOG_EVENT, onHubActionLog);
    return () => {
      window.removeEventListener(HUB_ACTION_LOG_EVENT, onHubActionLog);
    };
  }, [event, open]);

  // Open once per event — do not re-run when geocode fills lat/lng (that
  // re-cleared the thread and republished projections mid-open).
  const openEventId = open && event ? event.id : null;
  useEffect(() => {
    if (!openEventId || !event || event.id !== openEventId) {
      return;
    }
    prefetchStartedRef.current = false;
    setQuestions([]);
    lastInterpretationRef.current = null;
    setTypewriterTurnId(null);
    lastFlownPlaceRef.current = null;

    const restored = restorePalantirOntologyHead(event.id);
    setOntologyHistoryResumeLabel(restored?.labelKo ?? null);
    if (restored) {
      setOntologyGraph(readGeoOntologyGraph(event.id));
      setPalantirWorkspaceRevision((value) => value + 1);
      setOntologyFacetRevision((value) => value + 1);
    }

    const rawBatch = readContextConditionLastBatch(event.id);
    const batch =
      rawBatch &&
      isContextConditionLastBatchMisanchored(rawBatch, anchorLat, anchorLng)
        ? (clearContextConditionLastBatch(event.id), null)
        : rawBatch;

    if (batch?.recommendations && batch.recommendations.length > 0) {
      publishFocusGlobeProjection({
        contextEventId: event.id,
        visiblePlaceIds: batch.recommendations
          .map((row) => row.placeId?.trim() ?? "")
          .filter(Boolean),
      });
    } else if (!restored) {
      publishContextOnlyGlobeProjection(event.id);
    }

    if (!CONTEXT_AGENT_ASK_FIRST && (batch?.recommendations?.length ?? 0) > 0) {
      if (!restored) {
        clearContextAgentComposeThread(event.id);
        setComposeThread([]);
      } else {
        setComposeThread(readContextAgentComposeThread(event.id));
      }
      setRecommendations(
        (batch?.recommendations ?? []).map((row, index) => ({
          kind: row.kind,
          title: row.title,
          reasonKo: row.reasonKo,
          rank: index + 1,
          placeId: row.placeId ?? `${row.kind}-${index}`,
          lat: row.lat ?? anchorLat,
          lng: row.lng ?? anchorLng,
        })),
      );
      setActiveSpec(batch?.spec ?? null);
      setContextAgentSessionPhase("awaiting_human");
      if (batch && !restored) {
        const triggerMessage =
          [...readContextAgentComposeThread(event.id)]
            .reverse()
            .find((turn) => turn.role === "user")?.text ?? "";
        applyPalantirOperatorAfterScout({
          contextEventId: event.id,
          anchorPlaceName,
          triggerMessage,
          outcome: {
            batchId: batch.batchId,
            radiusM: batch.radiusM ?? 500,
            recommendations: (batch.recommendations ?? []).map((row, index) => ({
              kind: row.kind,
              title: row.title,
              reasonKo: row.reasonKo,
              rank: index + 1,
              placeId: row.placeId ?? `${row.kind}-${index}`,
              lat: row.lat ?? anchorLat,
              lng: row.lng ?? anchorLng,
            })),
            spec: batch.spec ?? {
              version: 1,
              resourceTypes: ["restaurant"],
              transport: "walk",
              budget: "medium",
              vibe: "popular",
              lodgingKind: "any",
              radiusM: batch.radiusM ?? 500,
            },
          },
        });
        setPalantirWorkspaceRevision((value) => value + 1);
      }
      return;
    }

    if (!restored) {
      clearContextAgentComposeThread(event.id);
      setComposeThread([]);
      setRecommendations([]);
      setActiveSpec(null);
    }

    if (CONTEXT_AGENT_ASK_FIRST) {
      clearContextAgentInterpretation(event.id);
      clearContextConditionPending(event.id);
      if (!restored) {
        clearContextConditionLastBatch(event.id);
        clearGeoOntologyGraph(event.id);
        clearPalantirWorkspaceSnapshot(event.id);
        setOntologyGraph(null);
        setRecommendations([]);
        setPalantirWorkspaceRevision((value) => value + 1);
      }
      // Always leave briefing → idle so the header is not stuck on 「말하는 중…」
      setContextAgentSessionPhase("idle");
    }
    // Intentionally omit anchorLat/Lng/Name — geocode must not re-open the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openEventId gates restore
  }, [openEventId]);

  useEffect(() => {
    return subscribeContextAgentRuntime((next) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      startTransition(() => {
        setRuntime(next);
      });
    });
  }, []);

  useEffect(() => {
    return subscribeContextAgentSession((next) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      startTransition(() => {
        setAgentSession(next);
      });
    });
  }, []);

  useEffect(() => {
    if (!open || !event || !ontologyDevSurface) {
      return;
    }
    const syncGraph = () => {
      setOntologyGraph(readGeoOntologyGraph(event.id));
    };
    syncGraph();
    return subscribeGeoOntologyGraph((eventId) => {
      if (eventId === event.id) {
        syncGraph();
      }
    });
  }, [event, open, ontologyDevSurface]);

  useEffect(() => {
    return subscribePalantirWorkspaceSnapshot((eventId) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      if (event?.id === eventId) {
        setPalantirWorkspaceRevision((value) => value + 1);
      }
    });
  }, [event?.id]);

  useEffect(() => {
    if (!open || !event || !ontologyDevSurface) {
      return;
    }
    return subscribeGeoOntologyFacetState((eventId) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      if (eventId === event.id) {
        setOntologyFacetRevision((value) => value + 1);
      }
    });
  }, [event, open, ontologyDevSurface]);

  const openPlaceOntologyResources = useCallback(
    (row: ContextConditionRecommendation) => {
      if (!event) {
        return;
      }
      const batch = readContextConditionLastBatch(event.id);
      const scoutId = batch?.batchId?.trim();
      if (scoutId && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
        writeScoutSelectedAnchor(event.id, {
          scoutId,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
          title: row.title,
        });
      }
      dispatchGlobePlaceOntologyFocus({
        contextEventId: event.id,
        placeId: row.placeId,
        kind: recommendationKindToReelKind(row.kind),
        lat: row.lat,
        lng: row.lng,
        title: row.title,
        surface: "detail",
      });
    },
    [event],
  );

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    return subscribeContextAgentGlobeMarkerFocus((detail) => {
      if (detail.contextEventId !== event.id) {
        return;
      }
      highlightGeoOntologyPlace({
        contextEventId: event.id,
        placeId: detail.placeId,
      });
      publishFocusGlobeProjection({
        contextEventId: event.id,
        visiblePlaceIds:
          recommendations.length > 0
            ? recommendations.map((row) => row.placeId)
            : [detail.placeId],
      });
      const override = applyPalantirOperatorPlaceOverride({
        contextEventId: event.id,
        placeId: detail.placeId,
        recommendations,
      });
      setOntologyHistoryResumeLabel(null);
      lastFlownPlaceRef.current = null;
      appendContextAgentComposeTurn(event.id, {
        role: "assistant",
        kind: "text",
        text: override?.briefKo || detail.insightKo,
      });
      if (!override?.briefKo && detail.actionHintKo?.trim()) {
        appendContextAgentComposeTurn(event.id, {
          role: "assistant",
          kind: "text",
          text: detail.actionHintKo.trim(),
        });
      }
      setComposeThread(readContextAgentComposeThread(event.id));
      globeRef?.current?.snapToPin(detail.lat, detail.lng, "street", {
        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
      });
      const focused = recommendations.find((row) => row.placeId === detail.placeId);
      if (focused) {
        openPlaceOntologyResources(focused);
      } else {
        dispatchGlobePlaceOntologyFocus({
          contextEventId: event.id,
          placeId: detail.placeId,
          kind: recommendationKindToReelKind(detail.kind),
          lat: detail.lat,
          lng: detail.lng,
          title: detail.title,
          surface: "detail",
        });
      }
    });
  }, [event, globeRef, open, openPlaceOntologyResources, recommendations]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const syncInterpretation = () => {
      const next = readContextAgentInterpretationForEvent(event.id);
      const line = next?.understandingKo.trim() ?? "";
      if (!line || lastInterpretationRef.current === line) {
        return;
      }
      lastInterpretationRef.current = line;
      appendContextAgentComposeTurn(event.id, {
        role: "assistant",
        kind: "text",
        text: line,
      });
      if (!isGlobeComposeInputFocused()) {
        setComposeThread(readContextAgentComposeThread(event.id));
      }
    };
    syncInterpretation();
    return subscribeContextAgentInterpretation(syncInterpretation);
  }, [event, open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const syncThread = () => {
      // IME owns the main thread while focused — coalesce until blur.
      if (isGlobeComposeInputFocused()) {
        return;
      }
      setComposeThread(readContextAgentComposeThread(event.id));
    };
    syncThread();
    const unsubThread = subscribeContextAgentComposeThread((eventId) => {
      if (eventId === event.id) {
        syncThread();
      }
    });
    const unsubFocus = subscribeGlobeComposeInputFocus((focused) => {
      if (!focused) {
        setComposeThread(readContextAgentComposeThread(event.id));
        setRuntime(readContextAgentRuntimeState());
        setAgentSession(readContextAgentSessionState());
      }
    });
    return () => {
      unsubThread();
      unsubFocus();
    };
  }, [event, open]);

  useEffect(() => {
    return subscribeContextActionInjection((next) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      setActionInjection(next);
    });
  }, []);

  const pinnedByKind = useMemo(() => {
    void pinnedRevision;
    const freshEvent = event ? findLifeEventCandidate(event.id) ?? event : null;
    return readContextConditionPinnedPlaceIds(freshEvent);
  }, [event, pinnedRevision]);

  const handlePickRecommendation = useCallback(
    async (item: ContextConditionRecommendation) => {
      if (!event) {
        return;
      }
      setPickBusyPlaceId(item.placeId);
      try {
        pinContextConditionRecommendation({
          eventId: event.id,
          recommendation: item,
        });
        setPinnedRevision((value) => value + 1);
        setContextAgentSessionPhase("pinned");
        const pinLine = copy.globe.contextQuickPinToast(item.title);
        appendContextAgentComposeTurn(event.id, {
          role: "assistant",
          kind: "globe_apply",
          text: pinLine,
        });
        if (item.kind === "lodging") {
          const freshEvent = findLifeEventCandidate(event.id) ?? event;
          const step = resolveLodgingRoomCardStep(freshEvent, item.placeId);
          if (step) {
            appendLodgingRoomCardsComposeTurn(event.id, {
              placeId: item.placeId,
              resourceId: step.resourceId,
              title: item.title,
            });
          }
        }
        setComposeThread(readContextAgentComposeThread(event.id));
        toast.success(pinLine);
      } catch {
        toast.message(copy.globe.contextConditionPinEmpty);
      } finally {
        setPickBusyPlaceId(null);
      }
    },
    [event],
  );

  const lastUserComposeLine = useMemo(
    () =>
      [...composeThread].reverse().find((turn) => turn.role === "user")?.text ?? "",
    [composeThread],
  );

  const handlePalantirOperatorUpdate = useCallback(() => {
    setOntologyHistoryResumeLabel(null);
    lastFlownPlaceRef.current = null;
  }, []);

  const handlePinned = useCallback((outcome: ContextConditionAnchorPinOutcome) => {
    setRecommendations(outcome.recommendations);
    setActiveSpec(outcome.spec);
    setContextAgentSessionPhase("awaiting_human");
    setOntologyHistoryResumeLabel(null);
    lastFlownPlaceRef.current = null;

    if (!event) {
      return;
    }

    const triggerMessage =
      [...readContextAgentComposeThread(event.id)]
        .reverse()
        .find((turn) => turn.role === "user")?.text ?? "";

    const engineId = resolveDiscoveryEngineId({
      message: triggerMessage,
      event: findLifeEventCandidate(event.id) ?? event,
      spec: outcome.spec,
      recommendationKinds: outcome.recommendations.map((row) => row.kind),
      userLat,
      userLng,
    });
    if (engineId) {
      runScoutQualityCoachAfterScout({
        contextEventId: event.id,
        engineId,
        outcome,
        triggerMessage,
      });
    }

    const oneShotMain = isTripExperienceScoutBatchId(outcome.batchId)
      ? commitOneShotTripExperienceMainClient({
          contextEventId: event.id,
          triggerMessage,
          outcome,
          event: findLifeEventCandidate(event.id) ?? event,
          userLat,
          userLng,
        })
      : commitOneShotLodgingMainOfferClient({
          contextEventId: event.id,
          triggerMessage,
          outcome,
          event: findLifeEventCandidate(event.id) ?? event,
          userLat,
          userLng,
        });
    if (oneShotMain.committed) {
      setPinnedRevision((value) => value + 1);
      const expressOpened =
        "expressOpened" in oneShotMain ? oneShotMain.expressOpened : false;
      setContextAgentSessionPhase(expressOpened ? "awaiting_human" : "pinned");
      setComposeThread(readContextAgentComposeThread(event.id));
      if (expressOpened) {
        toast.message(copy.hubCheckout.expressTitle);
      } else if (isTripExperienceScoutBatchId(outcome.batchId)) {
        toast.success(copy.globe.tripExperienceMainReady);
      } else {
        toast.success(copy.globe.lodgingOneShotMainReady);
      }
    }

    const snapshot = applyPalantirOperatorAfterScout({
      contextEventId: event.id,
      anchorPlaceName,
      triggerMessage,
      outcome,
    });

    if (snapshot?.briefKo) {
      appendContextAgentComposeTurn(event.id, {
        role: "assistant",
        kind: "text",
        text: snapshot.briefKo,
      });
      setComposeThread(readContextAgentComposeThread(event.id));
    }

    if (globeRef) {
      // Map place kinds paint Workspace, not Globe — strip from scout flyTo.
      const nonMap = outcome.recommendations.filter(
        (row) =>
          row.kind !== "lodging" &&
          row.kind !== "eatery" &&
          row.kind !== "activity" &&
          row.kind !== "amenity",
      );
      if (nonMap.length > 0) {
        snapGlobeToContextConditionScout(globeRef, {
          anchorLat,
          anchorLng,
          recommendations: nonMap,
          radiusM: outcome.radiusM,
        });
      }
    }
  }, [event, anchorPlaceName, anchorLat, anchorLng, userLat, userLng, globeRef]);

  const handleOpenScoutFeed = useCallback(
    async (input: { turnId: string; batchId: string }) => {
      if (!event) {
        return;
      }
      setScoutFeedGateBusy(true);
      try {
        const activated = activateDiscoveryExecutionSnapshot(event.id, input.batchId);
        if (!activated) {
          toast.message(copy.globe.contextConditionPinEmpty);
          return;
        }
        const lastBatch = readContextConditionLastBatch(event.id);
        if (!lastBatch) {
          toast.message(copy.globe.contextConditionPinEmpty);
          return;
        }
        setRecommendations(
          (lastBatch.recommendations ?? []).map((row, index) => ({
            kind: row.kind,
            title: row.title,
            reasonKo: row.reasonKo,
            rank: index + 1,
            placeId: row.placeId ?? `${row.kind}-${index}`,
            lat: row.lat ?? anchorLat,
            lng: row.lng ?? anchorLng,
          })),
        );
        setActiveSpec(lastBatch.spec ?? null);
        markScoutFeedGateOpened(event.id, input.turnId);
        setComposeThread(readContextAgentComposeThread(event.id));
        const rows = lastBatch.recommendations ?? [];
        const mapKindSet = new Set([
          "lodging",
          "eatery",
          "activity",
          "amenity",
        ]);
        const mapOnly =
          rows.length > 0 && rows.every((row) => mapKindSet.has(row.kind));
        if (mapOnly) {
          // Map-needed scout → 2D Workspace only. Never reveal/paint 3D Globe pins.
          const primaryKind = rows[0]!.kind;
          const domain =
            primaryKind === "lodging" || primaryKind === "eatery"
              ? primaryKind
              : primaryKind === "amenity"
                ? "amenity"
                : "poi";
          openMapContextWorkspace({
            contextEventId: event.id,
            domain,
            query: lastBatch.triggerMessage ?? "장소",
            summaryKo: lastBatch.summaryKo,
            hits: rows.map((row, index) => ({
              id: row.placeId ?? `${row.kind}-${index}`,
              labelKo: row.title,
              domain:
                row.kind === "lodging" || row.kind === "eatery"
                  ? row.kind
                  : ("poi" as const),
              lat: row.lat ?? anchorLat,
              lng: row.lng ?? anchorLng,
              rating: null,
              walkMinutes: null,
              priceBand: null,
              reservable: false,
              localFavorite: false,
              source: "maps" as const,
              reasonKo: row.reasonKo,
              thumbnailUrl: row.imageUrl ?? null,
              activitySubtype: row.activitySubtype ?? null,
            })),
            source: "scout_patch",
          });
          appendWorkspacePreviewComposeTurn(event.id);
          setComposeThread(readContextAgentComposeThread(event.id));
        } else {
          // Non-map scout (or mixed) may still use Globe reveal.
          revealContextConditionScout(event.id);
          publishFocusGlobeProjection({
            contextEventId: event.id,
            visiblePlaceIds: rows
              .map((row) => row.placeId?.trim() ?? "")
              .filter(Boolean),
          });
          dispatchIntelligentDiscoveryFeedOpen({
            contextEventId: event.id,
            source: "scout_complete",
          });
          if (globeRef && rows.length > 0) {
            snapGlobeToContextConditionScout(globeRef, {
              anchorLat,
              anchorLng,
              recommendations: rows.map((row, index) => ({
                kind: row.kind,
                activitySubtype: row.activitySubtype ?? null,
                title: row.title,
                reasonKo: row.reasonKo,
                rank: index + 1,
                placeId: row.placeId ?? "",
                lat: row.lat ?? anchorLat,
                lng: row.lng ?? anchorLng,
              })),
              radiusM: lastBatch.radiusM,
            });
          }
        }
        setContextAgentSessionPhase("awaiting_human");
      } finally {
        setScoutFeedGateBusy(false);
      }
    },
    [anchorLat, anchorLng, event, globeRef],
  );

  const handleRealityJump = useCallback(
    (target: import("@/lib/globe/reality-jump").RealityJumpTarget) => {
      const id = event?.id?.trim();
      if (!id) {
        toast.message(copy.globe.realityJumpNeedsContext);
        return;
      }
      const ok = dispatchRealityJump({
        contextEventId: id,
        target,
        source: "assistant_entity",
      });
      if (ok) {
        toast.message(copy.globe.realityJumpToast(target.labelKo));
      }
    },
    [event?.id],
  );

  const handleScoutDomainCorrection = useCallback(
    (input: { turnId: string; batchId: string; chipId: string }) => {
      if (!event) {
        return;
      }
      const gate = readContextAgentComposeThread(event.id).find(
        (row) =>
          row.id === input.turnId &&
          row.role === "assistant" &&
          row.kind === "scout_feed_gate",
      );
      const chips =
        gate && gate.role === "assistant" && gate.kind === "scout_feed_gate"
          ? (gate.payload.correctionChips ?? [])
          : [];
      const result = applyScoutDomainCorrection({
        contextEventId: event.id,
        batchId: input.batchId,
        chipId: input.chipId,
        chips,
        summaryForCount: (count, kind) =>
          copy.globe.scoutFeedGateCorrectionSummary({ count, kind }),
      });
      if (!result.ok) {
        toast.message(copy.globe.scoutFeedGateCorrectionEmpty);
        return;
      }
      const highlightTitles = (result.batch.recommendations ?? [])
        .slice(0, 3)
        .map((row) => row.title.trim())
        .filter(Boolean);
      const kinds = new Set(
        (result.batch.recommendations ?? []).map((row) => row.kind),
      );
      const scoutKind =
        kinds.size === 1
          ? ([...kinds][0] as "lodging" | "eatery" | "activity" | "amenity")
          : "mixed";
      patchScoutFeedGateAfterCorrection(event.id, {
        turnId: input.turnId,
        summaryKo: result.summaryKo,
        count: result.batch.count,
        scoutKind,
        highlightTitles,
      });
      setRecommendations(
        (result.batch.recommendations ?? []).map((row, index) => ({
          kind: row.kind,
          title: row.title,
          reasonKo: row.reasonKo,
          rank: index + 1,
          placeId: row.placeId ?? `${row.kind}-${index}`,
          lat: row.lat ?? anchorLat,
          lng: row.lng ?? anchorLng,
        })),
      );
      setActiveSpec(result.batch.spec ?? null);
      setComposeThread(readContextAgentComposeThread(event.id));
      toast.message(result.summaryKo);
    },
    [anchorLat, anchorLng, event],
  );

  const handleRefine = (message: string) => {
    setRefineBusy(true);
    void pinBarRef.current?.submitRefinement(message).finally(() => {
      setRefineBusy(false);
    });
  };

  const handleExplorationMode = (mode: ExplorationMode) => {
    setRefineBusy(true);
    void pinBarRef.current?.applyExplorationMode(mode).finally(() => {
      setRefineBusy(false);
    });
  };

  useEffect(() => {
    if (!event?.id) {
      return;
    }
    return subscribeExplorationModeOverride((eventId) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      if (eventId === event.id) {
        setExplorationRevision((value) => value + 1);
      }
    });
  }, [event?.id]);

  const handleConfirmActionInjection = () => {
    if (!actionInjection) {
      return;
    }
    const confirmed = confirmContextActionInjection(actionInjection);
    publishContextActionInjection(confirmed);
    setActionInjection(confirmed);
    setContextAgentSessionPhase("awaiting_human");
    if (event) {
      appendContextAgentComposeTurn(event.id, {
        role: "assistant",
        kind: "text",
        text: copy.globe.contextActionInjectedEyebrow,
      });
      setComposeThread(readContextAgentComposeThread(event.id));
    }
  };

  const handleRejectActionInjection = () => {
    if (!actionInjection) {
      return;
    }
    const dismissed = dismissContextActionInjection(actionInjection);
    clearContextActionInjection();
    setActionInjection(null);
    void dismissed;
  };

  const handleExecuteActionInjection = () => {
    if (!actionInjection) {
      return;
    }
    const executed = markContextActionInjectionExecuted(actionInjection);
    publishContextActionInjection(executed);
    setActionInjection(executed);
    toast.success(copy.globe.contextActionInjectedEyebrow);
  };

  const handleUserCompose = useCallback((text: string): boolean => {
    if (!event) {
      return false;
    }
    const line = text.trim();
    if (!line) {
      return false;
    }
    if (!prefetchStartedRef.current) {
      prefetchStartedRef.current = true;
      void prefetchContextAgentSurroundings({
        event,
        anchorLat,
        anchorLng,
        userLat,
        userLng,
      });
    }
    appendContextAgentComposeTurn(event.id, { role: "user", text: line });

    if (isPcPurchaseContinuityUtterance(line)) {
      void startPcPurchaseAgentRun({
        utterance: line,
        contextEventId: event.id,
      }).then((result) => {
        if (!event) {
          return;
        }
        if (result.kind !== "skip" && result.kind !== "preview") {
          appendContextAgentComposeTurn(event.id, {
            role: "assistant",
            kind: "text",
            text: result.messageKo,
          });
        }
        setComposeThread(readContextAgentComposeThread(event.id));
      });
      return true;
    }

    if (isScoutMapRevealUtterance(line)) {
      const thread = readContextAgentComposeThread(event.id);
      const openGate = [...thread]
        .reverse()
        .find(
          (row) =>
            row.role === "assistant" &&
            row.kind === "scout_feed_gate" &&
            row.payload.status === "open",
        );
      if (
        openGate &&
        openGate.role === "assistant" &&
        openGate.kind === "scout_feed_gate"
      ) {
        void handleOpenScoutFeed({
          turnId: openGate.id,
          batchId: openGate.payload.batchId,
        });
        setComposeThread(readContextAgentComposeThread(event.id));
        return true;
      }
      const lastBatch = readContextConditionLastBatch(event.id);
      if (
        globeRef &&
        lastBatch?.recommendations &&
        lastBatch.recommendations.length > 0
      ) {
        snapGlobeToContextConditionScout(globeRef, {
          anchorLat,
          anchorLng,
          recommendations: lastBatch.recommendations.map((row, index) => ({
            kind: row.kind,
            activitySubtype: row.activitySubtype ?? null,
            title: row.title,
            reasonKo: row.reasonKo,
            rank: index + 1,
            placeId: row.placeId ?? "",
            lat: row.lat ?? anchorLat,
            lng: row.lng ?? anchorLng,
          })),
          radiusM: lastBatch.radiusM,
        });
        publishFocusGlobeProjection({
          contextEventId: event.id,
          visiblePlaceIds: (lastBatch.recommendations ?? [])
            .map((row) => row.placeId?.trim() ?? "")
            .filter(Boolean),
        });
        setComposeThread(readContextAgentComposeThread(event.id));
        return true;
      }
    }

    if (isTripReviseUtterance(line)) {
      intentTimelineWalkRef.current?.stop();
      intentTimelineWalkRef.current = startIntentExecutionTimelineWalk({
        contextEventId: event.id,
        profile: "trip_revise",
      });
    }
    if (needsIntentSlotLlmFill({ text: line })) {
      void enrichContextIntentBlueprintClient({
        contextEventId: event.id,
        text: line,
      }).then(() => {
        setComposeThread(readContextAgentComposeThread(event.id));
      });
    }
    if (isResearchUtterance(line)) {
      void runContextResearchEngineClient({
        contextEventId: event.id,
        text: line,
      }).then(() => {
        setComposeThread(readContextAgentComposeThread(event.id));
      });
    }
    setComposeThread(readContextAgentComposeThread(event.id));
    return false;
  }, [
    event,
    anchorLat,
    anchorLng,
    userLat,
    userLng,
    globeRef,
    handleOpenScoutFeed,
  ]);

  const ontologyFacet = useMemo(() => {
    void ontologyFacetRevision;
    if (!event) {
      return readGeoOntologyFacetState("");
    }
    return readGeoOntologyFacetState(event.id);
  }, [event, ontologyFacetRevision]);

  useEffect(() => {
    if (!open) {
      lastFlownPlaceRef.current = null;
    }
  }, [open]);

  const palantirWorkspace = useMemo((): PalantirWorkspaceSnapshot | null => {
    void palantirWorkspaceRevision;
    if (!event) {
      return null;
    }
    return readPalantirWorkspaceSnapshot(event.id);
  }, [event, palantirWorkspaceRevision]);

  const palantirPrimaryRecommendation = useMemo(() => {
    const placeId = palantirWorkspace?.primaryPlaceId;
    if (!placeId) {
      return null;
    }
    return recommendations.find((row) => row.placeId === placeId) ?? null;
  }, [palantirWorkspace?.primaryPlaceId, recommendations]);

  const palantirCommitAction = useMemo(() => {
    if (!palantirPrimaryRecommendation) {
      return null;
    }
    return resolvePalantirCommitAction({
      recommendation: palantirPrimaryRecommendation,
      anchorPlaceName,
      triggerMessage: lastUserComposeLine,
      eventDatetime: event?.datetime ?? null,
    });
  }, [
    anchorPlaceName,
    event?.datetime,
    lastUserComposeLine,
    palantirPrimaryRecommendation,
  ]);

  const palantirPrimaryPinned = useMemo(() => {
    if (!palantirPrimaryRecommendation || !event) {
      return false;
    }
    const pinned = pinnedByKind;
    if (palantirPrimaryRecommendation.kind === "lodging") {
      return pinned.lodging === palantirPrimaryRecommendation.placeId;
    }
    if (palantirPrimaryRecommendation.kind === "activity") {
      return pinned.activity === palantirPrimaryRecommendation.placeId;
    }
    if (palantirPrimaryRecommendation.kind === "amenity") {
      return pinned.amenity === palantirPrimaryRecommendation.placeId;
    }
    return pinned.eatery === palantirPrimaryRecommendation.placeId;
  }, [event, palantirPrimaryRecommendation, pinnedByKind]);

  const handlePalantirCommit = () => {
    if (!event || !palantirPrimaryRecommendation || palantirPrimaryPinned) {
      return;
    }
    setCommitBusy(true);
    try {
      const outcome = executePalantirCommit({
        contextEventId: event.id,
        recommendation: palantirPrimaryRecommendation,
        anchorPlaceName,
        triggerMessage: lastUserComposeLine,
        eventDatetime: event.datetime ?? null,
      });
      setContextAgentSessionPhase("pinned");
      setPinnedRevision((value) => value + 1);
      appendContextAgentComposeTurn(event.id, {
        role: "assistant",
        kind: "text",
        text: copy.globe.palantirCommitDone,
      });
      setComposeThread(readContextAgentComposeThread(event.id));
      toast.success(outcome.action.labelKo);
      openPlaceOntologyResources(palantirPrimaryRecommendation);
    } catch {
      toast.message(copy.globe.palantirCommitFailed);
    } finally {
      setCommitBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !event || !palantirWorkspace?.primaryPlaceId) {
      return;
    }
    const placeId = palantirWorkspace.primaryPlaceId;
    if (lastFlownPlaceRef.current === placeId) {
      return;
    }
    lastFlownPlaceRef.current = placeId;
    const row = recommendations.find((item) => item.placeId === placeId);
    if (row) {
      globeRef?.current?.snapToPin(row.lat, row.lng, "street", {
        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
      });
    }
  }, [event, globeRef, open, palantirWorkspace?.primaryPlaceId, recommendations]);

  const explorationMode = useMemo(() => {
    void explorationRevision;
    if (!event) {
      return "convergent" as const;
    }
    return resolveExplorationMode({
      message: lastUserComposeLine,
      spec: activeSpec,
      override: readExplorationModeOverride(event.id),
    });
  }, [activeSpec, event, explorationRevision, lastUserComposeLine]);

  const handleSelectOntologyPlace = (placeId: string) => {
    if (!event) {
      return;
    }
    applyPalantirOperatorPlaceOverride({
      contextEventId: event.id,
      placeId,
      recommendations,
    });
    const row = recommendations.find((item) => item.placeId === placeId);
    if (row) {
      globeRef?.current?.snapToPin(row.lat, row.lng, "street", {
        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
      });
      openPlaceOntologyResources(row);
    }
  };

  const openPalantirPrimaryOnMap = () => {
    if (!event || !palantirWorkspace?.primaryPlaceId) {
      return;
    }
    const placeId = palantirWorkspace.primaryPlaceId;
    const row = recommendations.find((item) => item.placeId === placeId);
    if (!row) {
      return;
    }
    const focusKind =
      row.kind === "lodging"
        ? "lodging"
        : row.kind === "activity" || row.kind === "amenity"
          ? row.kind
          : "eatery";
    const activitySubtype =
      focusKind === "activity" ? (row.activitySubtype ?? null) : null;
    publishContextAgentGlobeMarkerFocus({
      contextEventId: event.id,
      placeId: row.placeId,
      kind: focusKind,
      activitySubtype,
      lat: row.lat,
      lng: row.lng,
      title: row.title,
      insightKo: row.reasonKo,
      actionHintKo:
        focusKind === "activity"
          ? buildContextAgentMarkerActionHint({
              kind: "activity",
              activitySubtype,
            })
          : null,
      source: "map_marker",
    });
    globeRef?.current?.snapToPin(row.lat, row.lng, "street", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
    openPlaceOntologyResources(row);
  };

  const chipsDisabled =
    refineBusy ||
    runtime.lifecycle === "busy" ||
    agentSession.workPhase === "scouting" ||
    agentSession.workPhase === "replanning";
  if (!open || !event) {
    return null;
  }

  const pipelinePhase = resolveContextAgentPipelinePhase({
    workPhase: agentSession.workPhase,
    processPhase: runtime.processPhase,
    lifecycle: runtime.lifecycle,
  });
  const lastUserLine = lastUserComposeLine;
  const hasPinnedSelection = Boolean(
    pinnedByKind.lodging ||
      pinnedByKind.eatery ||
      pinnedByKind.activity ||
      pinnedByKind.amenity,
  );
  const cicadaPhase = resolveCicadaAgentPhase({
    workPhase: agentSession.workPhase,
    processPhase: runtime.processPhase,
    lifecycle: runtime.lifecycle,
    hasPendingQuestions: questions.length > 0,
    alternateSearch: isAlternatePlaceSearch(lastUserLine),
    hasGlobeResults: recommendations.length > 0,
  });
  const cicadaSurfaceMode = resolveCicadaAssistantSurfaceMode({
    phase: cicadaPhase,
    pinned: hasPinnedSelection || agentSession.workPhase === "pinned",
  });
  const showRefineChips =
    recommendations.length > 0 &&
    cicadaSurfaceMode === "discussion" &&
    !palantirPrimaryPinned;
  const compactBrief = composeThread.length >= 2;
  const pipelineLabel =
    cicadaPhase !== "idle"
      ? resolveCicadaAgentPhaseLabel(cicadaPhase)
      : resolveGlobeComposePipelineLabel(pipelinePhase);
  const showBusyStatus =
    refineBusy ||
    runtime.lifecycle === "busy" ||
    agentSession.workPhase === "scouting" ||
    agentSession.workPhase === "replanning";
  const processPhase =
    runtime.processPhase ??
    (agentSession.workPhase === "scouting" ? "exploring" : null) ??
    (agentSession.workPhase === "replanning" ? "optimizing" : null) ??
    (showBusyStatus ? ("analyzing" as const) : null);
  const processStatusHint =
    runtime.statusHintKo?.trim() ||
    (showBusyStatus && !runtime.processPhase
      ? copy.globe.contextAgentStatusBusy
      : null);
  const showExplorationChips =
    Boolean(event) &&
    questions.length === 0 &&
    (recommendations.length > 0 || activeSpec != null) &&
    !showBusyStatus;

  const workChips = buildContextAssistantWorkChips({
    hubLog: readHubActionLog(event.id),
    liveLabelKo: showBusyStatus
      ? processStatusHint?.trim() || pipelineLabel
      : null,
    max: 5,
  });
  // Touch revision so emitSearchHubAction re-renders this strip.
  void hubActionLogRevision;

  const opacityPercent = Math.round(shellOpacity * 100);
  const opacityControl = (
    <label
      className="flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 shadow-sm ring-1 ring-black/[0.06]"
      data-globe-context-assistant-opacity
    >
      <Blend className="size-3 shrink-0 text-[#515154]" aria-hidden />
      <span className="sr-only">
        {copy.globe.contextConditionPanelOpacityAria}
      </span>
      <input
        type="range"
        min={Math.round(CONTEXT_ASSISTANT_OPACITY_MIN * 100)}
        max={Math.round(CONTEXT_ASSISTANT_OPACITY_MAX * 100)}
        step={5}
        value={opacityPercent}
        onChange={(event) => {
          setShellOpacity(Number(event.currentTarget.value) / 100);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-black/[0.12] accent-[#1d1d1f] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1d1d1f] [&::-webkit-slider-thumb]:shadow-sm"
        aria-label={copy.globe.contextConditionPanelOpacityAria}
        aria-valuemin={Math.round(CONTEXT_ASSISTANT_OPACITY_MIN * 100)}
        aria-valuemax={Math.round(CONTEXT_ASSISTANT_OPACITY_MAX * 100)}
        aria-valuenow={opacityPercent}
      />
      <span className="min-w-[1.75rem] text-right text-[10px] font-semibold tabular-nums text-[#1d1d1f]">
        {opacityPercent}
      </span>
    </label>
  );

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="context-condition-prompt"
      zIndex={
        discoveryFeedFocus
          ? RIMVIO_ASSISTANT_FEED_BACKDROP_Z_INDEX
          : RIMVIO_ASSISTANT_FRAME_Z_INDEX
      }
      dragLabel={copy.globe.contextConditionPanelDragLabel}
      dragLeading={opacityControl}
      className={cn(className)}
      style={{
        // Keep chrome readable; feed dim applies to body content only.
        opacity: shellOpacity,
        transition: "opacity 160ms ease",
      }}
      shellClassName={rimvioAssistantFrameShellClass()}
      bodyClassName="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col",
          discoveryFeedFocus && "opacity-40 transition-opacity duration-200",
        )}
        data-globe-assistant-feed-backdrop={discoveryFeedFocus ? "true" : undefined}
        data-cicada-agent-phase={cicadaPhase}
        data-cicada-assistant-surface={cicadaSurfaceMode}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3 py-2">
          <div
            className="min-w-0 flex-1"
            data-globe-context-agent-connected={
              isGlobeContextAgentBound(event.id) ? "true" : undefined
            }
          >
            <p className={cn("truncate", rimvioAssistantTitleClass())}>
              {event.title?.trim() || anchorPlaceName}
            </p>
            <p
              className="mt-0.5 truncate text-[11px] text-[#86868b]"
              data-globe-context-agent-status
              data-globe-context-agent-lifecycle={runtime.lifecycle}
            >
              {[
                copy.globe.contextCommandBarEyebrow,
                event.title?.trim() && event.title.trim() !== anchorPlaceName
                  ? anchorPlaceName
                  : null,
                pipelineLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="relative z-[2] flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[#515154] active:scale-95"
            aria-label={copy.globe.contextConditionPanelCloseAria}
            data-globe-context-condition-panel-close
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <GlobeContextAssistantWorkChips chips={workChips} />

        {questions.length > 0 ? (
          <div className="border-b border-black/[0.05] px-3 py-2">
            <GlobeContextAgentConditionQuestions
              questions={questions}
              onSelect={(choice) => questionHandlerRef.current(choice)}
            />
          </div>
        ) : null}

        {lensSession && lensSession.lenses.length > 0 ? (
          <div className="border-b border-black/[0.05] px-3 py-2">
            <GlobeDiscoveryLensBar
              session={lensSession}
              onSelect={(lensId) => lensHandlerRef.current(lensId)}
            />
          </div>
        ) : null}

        {palantirWorkspace ? (
          <div
            className={cn(
              "shrink-0 border-b border-black/[0.05] px-3",
              compactBrief ? "space-y-1 py-1" : "space-y-2 py-2",
            )}
          >
            {ontologyHistoryResumeLabel && !compactBrief ? (
              <GlobePalantirOntologyHistoryHint labelKo={ontologyHistoryResumeLabel} />
            ) : null}
            <GlobePalantirOperatorBrief
              snapshot={palantirWorkspace}
              onOpenPrimary={openPalantirPrimaryOnMap}
              compact={compactBrief}
            />
            {palantirCommitAction && questions.length === 0 && !showBusyStatus ? (
              <GlobePalantirOperatorCommitRail
                action={palantirCommitAction}
                pinned={palantirPrimaryPinned}
                busy={commitBusy || chipsDisabled}
                onCommit={handlePalantirCommit}
                compact={compactBrief}
              />
            ) : null}
          </div>
        ) : null}

        {ontologyDevSurface && ontologyGraph ? (
          <div className="border-b border-black/[0.05] px-3 py-2">
            <button
              type="button"
              onClick={() => setOntologyExpanded((value) => !value)}
              className="text-[11px] font-medium text-[#0071e3] active:opacity-70"
              data-palantir-ontology-toggle
            >
              {ontologyExpanded
                ? copy.globe.palantirOntologyCollapse
                : copy.globe.palantirOntologyExpand}
            </button>
            {ontologyExpanded ? (
              <div className="mt-2">
                <GlobeContextAgentOntologyGraph
                  graph={ontologyGraph}
                  activeFacetId={ontologyFacet.activeFacetId}
                  highlightedPlaceId={ontologyFacet.highlightedPlaceId}
                  compact={false}
                  onSelectPlace={handleSelectOntologyPlace}
                />
              </div>
            ) : null}
            {cicadaPhase === "clarifying" ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#86868b]">
                {copy.globe.geoOntologyClarifyPriority}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          data-globe-context-condition-workspace
        >
          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2"
            data-globe-context-condition-conversation
          >
            <GlobeAssistantComposeThread
              turns={composeThread}
              typewriterTurnId={typewriterTurnId}
              onTypewriterComplete={() => setTypewriterTurnId(null)}
              pinnedByKind={pinnedByKind}
              pickBusyPlaceId={pickBusyPlaceId}
              onPickRecommendation={handlePickRecommendation}
              contextEventId={event?.id ?? null}
              onOpenIdentitySettings={openIdentityVaultSettings}
              onIntakeSubmit={(input) => void intakeSubmitRef.current?.(input)}
              onAskChipPick={(input) => void askChipPickRef.current?.(input)}
              onOpenScoutFeed={(input) => void handleOpenScoutFeed(input)}
              onScoutDomainCorrection={handleScoutDomainCorrection}
              scoutFeedGateBusy={scoutFeedGateBusy}
              onRealityJump={handleRealityJump}
            />
          {composeThread.length === 0 && recommendations.length === 0 ? (
            <p className="px-1 text-[12px] leading-relaxed text-[#86868b]">
              {copy.globe.contextAgentComposeHint}
            </p>
          ) : null}
          {cicadaSurfaceMode === "globe_primary" && recommendations.length > 0 ? (
            <p className="px-1 text-[11px] leading-relaxed text-[#86868b]">
              {copy.globe.cicadaAgentGlobePrimaryHint}
            </p>
          ) : null}
          {actionInjection &&
          actionInjection.phase !== "dismissed" &&
          actionInjection.phase !== "executed" ? (
            <GlobeContextActionInjectionCard
              injection={actionInjection}
              onConfirm={handleConfirmActionInjection}
              onReject={handleRejectActionInjection}
              onExecute={handleExecuteActionInjection}
            />
          ) : null}
          {showBusyStatus ? (
            <GlobeContextAgentProcessStrip
              activePhase={processPhase}
              statusHintKo={processStatusHint}
            />
          ) : null}
        </div>

        {showExplorationChips ? (
          <div className="shrink-0 border-t border-black/[0.05] px-3 py-1.5">
            <GlobeContextExplorationModeChips
              mode={explorationMode}
              disabled={chipsDisabled}
              onSelect={handleExplorationMode}
            />
          </div>
        ) : null}

        {showRefineChips ? (
          <div className="shrink-0 border-t border-black/[0.05] px-3 py-1">
            <GlobeContextAgentRefineChips
              disabled={chipsDisabled}
              onSelect={handleRefine}
              compact
            />
          </div>
        ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.05] px-3 py-2">
          <GlobeContextConditionPinBar
            ref={pinBarRef}
            contextEventId={event.id}
            operatorBlueprint={operatorBlueprint}
            destinationConfirmed={destinationConfirmed}
            anchorPlaceId={anchorPlaceId}
            anchorPlaceName={anchorPlaceName}
            anchorLat={anchorLat}
            anchorLng={anchorLng}
            userLat={userLat}
            userLng={userLng}
            anchorPriceKrw={anchorPriceKrw}
            globeRef={globeRef}
            onPinned={handlePinned}
            onPalantirOperatorUpdate={handlePalantirOperatorUpdate}
            onUserCompose={handleUserCompose}
            hydrateFromBatch={!CONTEXT_AGENT_ASK_FIRST}
            onQuestionsChange={setQuestions}
            onRecommendationsChange={setRecommendations}
            onActionInjectionChange={setActionInjection}
            registerQuestionHandler={registerQuestionHandler}
            registerLensHandler={registerLensHandler}
            registerIntakeSubmitHandler={registerIntakeSubmitHandler}
            registerAskChipPickHandler={registerAskChipPickHandler}
            onLensSessionChange={setLensSession}
          />
        </div>
      </div>
    </GlobeBrainSurfaceFloatingFrame>
  );
});
