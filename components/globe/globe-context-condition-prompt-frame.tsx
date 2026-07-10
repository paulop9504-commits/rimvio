"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeAssistantComposeThread } from "@/components/globe/globe-assistant-compose-thread";
import { GlobeContextAgentConditionQuestions } from "@/components/globe/globe-context-agent-condition-questions";
import { GlobePalantirOperatorBrief } from "@/components/globe/globe-palantir-operator-brief";
import { GlobePalantirOperatorCommitRail } from "@/components/globe/globe-palantir-operator-commit-rail";
import { GlobePalantirOntologyHistoryHint } from "@/components/globe/globe-palantir-ontology-history-hint";
import { GlobeContextAgentOntologyGraph } from "@/components/globe/globe-context-agent-ontology-graph";
import { GlobeContextAgentProcessStrip } from "@/components/globe/globe-context-agent-process-strip";
import { GlobeContextAgentRefineChips } from "@/components/globe/globe-context-agent-refine-chips";
import { GlobeContextExplorationModeChips } from "@/components/globe/globe-context-exploration-mode-chips";
import { GlobeContextActionInjectionCard } from "@/components/globe/globe-context-action-injection-card";
import { GlobeHubCheckoutSheet } from "@/components/globe/globe-hub-checkout-sheet";
import { GlobeContextConditionPinBar, type GlobeContextConditionPinBarHandle, type IntakeSlotsSubmitInput, type AskChipPickInput } from "@/components/globe/globe-context-condition-pin-bar";
import { GlobeDiscoveryLensBar } from "@/components/globe/globe-discovery-lens-bar";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { copy } from "@/lib/copy/human-ko";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { hasScoutRevealPending } from "@/lib/globe/context-condition-ai/context-condition-scout-reveal-pending-store";
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
import { commitOneShotLodgingMainOfferClient } from "@/lib/globe/lodging-prep";
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
import {
  subscribeLodgingHubCheckoutOpen,
  type HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { openIdentityVaultSettings } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import {
  appendContextAgentComposeTurn,
  appendLodgingRoomCardsComposeTurn,
  clearContextAgentComposeThread,
  CONTEXT_AGENT_ASK_FIRST,
  markScoutFeedGateOpened,
  readContextAgentComposeThread,
  resolveContextAgentPipelinePhase,
  resolveGlobeComposePipelineLabel,
  subscribeContextAgentComposeThread,
  type ContextAgentComposeTurn,
} from "@/lib/globe/assistant";
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
  resetGlobeProjectionLayerPolicy,
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

/** Context-bound execution layer — talk thread + globe apply (Cursor-style). */
export function GlobeContextConditionPromptFrame({
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
  const [lensSession, setLensSession] = useState<DiscoveryLensSession | null>(
    () => (event ? readDiscoveryLensSession(event.id) : null),
  );
  const pinBarRef = useRef<GlobeContextConditionPinBarHandle>(null);
  const prefetchStartedRef = useRef(false);
  const [refineBusy, setRefineBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [pickBusyPlaceId, setPickBusyPlaceId] = useState<string | null>(null);
  const [scoutFeedGateBusy, setScoutFeedGateBusy] = useState(false);
  const discoveryFeedFocus = useIntelligentDiscoveryFeedFocus(event?.id);
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] =
    useState<HubLodgingCheckoutSession | null>(null);
  const lastFlownPlaceRef = useRef<string | null>(null);
  const lastInterpretationRef = useRef<string | null>(null);
  const ontologyDevSurface = isPalantirOntologyDevSurfaceEnabled();

  useEffect(() => {
    if (!open) {
      resetGlobeProjectionLayerPolicy();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    return subscribeDiscoveryLensSession((session) => {
      if (session && session.contextEventId !== event.id) {
        return;
      }
      setLensSession(session);
    });
  }, [event, open]);

  useEffect(() => {
    if (!open || !event) {
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
    } else {
      publishContextOnlyGlobeProjection(event.id);
    }

    const rawBatch = readContextConditionLastBatch(event.id);
    const batch =
      rawBatch &&
      isContextConditionLastBatchMisanchored(rawBatch, anchorLat, anchorLng)
        ? (clearContextConditionLastBatch(event.id), null)
        : rawBatch;

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
        setContextAgentSessionPhase("idle");
      }
    }
  }, [anchorLat, anchorLng, anchorPlaceName, event, open]);

  useEffect(() => {
    return subscribeContextAgentRuntime(setRuntime);
  }, []);

  useEffect(() => {
    return subscribeContextAgentSession(setAgentSession);
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
      setComposeThread(readContextAgentComposeThread(event.id));
    };
    syncInterpretation();
    return subscribeContextAgentInterpretation(syncInterpretation);
  }, [event, open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const syncThread = () => {
      setComposeThread(readContextAgentComposeThread(event.id));
    };
    syncThread();
    return subscribeContextAgentComposeThread((eventId) => {
      if (eventId === event.id) {
        syncThread();
      }
    });
  }, [event, open]);

  useEffect(() => {
    return subscribeContextActionInjection(setActionInjection);
  }, []);

  const pinnedByKind = useMemo(() => {
    void pinnedRevision;
    const freshEvent = event ? findLifeEventCandidate(event.id) ?? event : null;
    return readContextConditionPinnedPlaceIds(freshEvent);
  }, [event, pinnedRevision]);

  useEffect(() => {
    return subscribeLodgingHubCheckoutOpen(({ session }) => {
      setCheckoutSession(session);
      setCheckoutOpen(true);
    });
  }, []);

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

  const handlePalantirOperatorUpdate = () => {
    setOntologyHistoryResumeLabel(null);
    lastFlownPlaceRef.current = null;
  };

  const handlePinned = (outcome: ContextConditionAnchorPinOutcome) => {
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

    const oneShotMain = commitOneShotLodgingMainOfferClient({
      contextEventId: event.id,
      triggerMessage,
      outcome,
      event: findLifeEventCandidate(event.id) ?? event,
      userLat,
      userLng,
    });
    if (oneShotMain.committed) {
      setPinnedRevision((value) => value + 1);
      setContextAgentSessionPhase(oneShotMain.expressOpened ? "awaiting_human" : "pinned");
      setComposeThread(readContextAgentComposeThread(event.id));
      if (oneShotMain.expressOpened) {
        toast.message(copy.hubCheckout.expressTitle);
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

    if (globeRef && !hasScoutRevealPending(event.id)) {
      snapGlobeToContextConditionScout(globeRef, {
        anchorLat,
        anchorLng,
        recommendations: outcome.recommendations,
        radiusM: outcome.radiusM,
      });
    }
  };

  const handleOpenScoutFeed = useCallback(
    async (input: { turnId: string; batchId: string }) => {
      if (!event) {
        return;
      }
      setScoutFeedGateBusy(true);
      try {
        const lastBatch = readContextConditionLastBatch(event.id);
        if (!lastBatch || lastBatch.batchId !== input.batchId) {
          toast.message(copy.globe.contextConditionPinEmpty);
          return;
        }
        revealContextConditionScout(event.id);
        markScoutFeedGateOpened(event.id, input.turnId);
        setComposeThread(readContextAgentComposeThread(event.id));
        dispatchIntelligentDiscoveryFeedOpen({
          contextEventId: event.id,
          source: "scout_complete",
        });
        if (globeRef && lastBatch.recommendations && lastBatch.recommendations.length > 0) {
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
        }
        setContextAgentSessionPhase("awaiting_human");
      } finally {
        setScoutFeedGateBusy(false);
      }
    },
    [anchorLat, anchorLng, event, globeRef],
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

  const handleUserCompose = (text: string) => {
    if (!event) {
      return;
    }
    const line = text.trim();
    if (!line) {
      return;
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
    setComposeThread(readContextAgentComposeThread(event.id));
  };

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
    (agentSession.workPhase === "replanning" ? "optimizing" : null);
  const showExplorationChips =
    Boolean(event) &&
    questions.length === 0 &&
    (recommendations.length > 0 || activeSpec != null) &&
    !showBusyStatus;

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="context-condition-prompt"
      zIndex={
        discoveryFeedFocus
          ? RIMVIO_ASSISTANT_FEED_BACKDROP_Z_INDEX
          : RIMVIO_ASSISTANT_FRAME_Z_INDEX
      }
      dragLabel={copy.globe.contextConditionPanelDragLabel}
      className={cn(
        className,
        discoveryFeedFocus &&
          "pointer-events-none invisible transition-[opacity,transform] duration-200",
      )}
      shellClassName={rimvioAssistantFrameShellClass()}
      bodyClassName="flex min-h-0 flex-col"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-globe-assistant-feed-backdrop={discoveryFeedFocus ? "true" : undefined}
        data-cicada-agent-phase={cicadaPhase}
        data-cicada-assistant-surface={cicadaSurfaceMode}
      >
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3 py-2">
          <div
            className="min-w-0"
            data-globe-context-agent-connected={
              isGlobeContextAgentBound(event.id) ? "true" : undefined
            }
          >
            <p className={cn("truncate", rimvioAssistantTitleClass())}>
              {anchorPlaceName}
            </p>
            <p
              className="mt-0.5 truncate text-[11px] text-[#86868b]"
              data-globe-context-agent-status
              data-globe-context-agent-lifecycle={runtime.lifecycle}
            >
              {pipelineLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[#515154] active:scale-95"
            aria-label={copy.globe.contextConditionPanelCloseAria}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

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
              scoutFeedGateBusy={scoutFeedGateBusy}
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
          {showBusyStatus && processPhase ? (
            <GlobeContextAgentProcessStrip activePhase={processPhase} />
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
            registerQuestionHandler={(handler) => {
              questionHandlerRef.current = handler;
            }}
            registerLensHandler={(handler) => {
              lensHandlerRef.current = handler;
            }}
            registerIntakeSubmitHandler={(handler) => {
              intakeSubmitRef.current = handler;
            }}
            registerAskChipPickHandler={(handler) => {
              askChipPickRef.current = handler;
            }}
            onLensSessionChange={setLensSession}
          />
        </div>
      </div>
      <GlobeHubCheckoutSheet
        open={checkoutOpen}
        session={checkoutSession}
        onOpenChange={setCheckoutOpen}
        onOpenIdentitySettings={openIdentityVaultSettings}
        onComplete={() => {
          toast.success(copy.globe.lodgingRoomCardReserveDone);
        }}
      />
    </GlobeBrainSurfaceFloatingFrame>
  );
}
