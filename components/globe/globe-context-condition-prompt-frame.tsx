"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { GlobeContextActionInjectionCard } from "@/components/globe/globe-context-action-injection-card";
import { GlobeContextConditionPinBar, type GlobeContextConditionPinBarHandle } from "@/components/globe/globe-context-condition-pin-bar";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import {
  readContextConditionLastBatch,
  readContextConditionPinnedPlaceIds,
  isContextConditionLastBatchMisanchored,
  clearContextConditionLastBatch,
  clearContextConditionPending,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
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
  appendContextAgentComposeTurn,
  clearContextAgentComposeThread,
  CONTEXT_AGENT_ASK_FIRST,
  readContextAgentComposeThread,
  resolveContextAgentPipelinePhase,
  resolveGlobeComposePipelineLabel,
  subscribeContextAgentComposeThread,
  type ContextAgentComposeTurn,
} from "@/lib/globe/assistant";
import { isAlternatePlaceSearch } from "@/lib/globe/context-condition-ai/is-alternate-place-search";
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
import { cn } from "@/lib/utils";
import {
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
  const pinBarRef = useRef<GlobeContextConditionPinBarHandle>(null);
  const prefetchStartedRef = useRef(false);
  const [refineBusy, setRefineBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [pinnedRevision, setPinnedRevision] = useState(0);
  const [, setActiveSpec] = useState<
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
    if (!open) {
      resetGlobeProjectionLayerPolicy();
    }
  }, [open]);

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
    });
  }, [event, globeRef, open, recommendations]);

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
      snapGlobeToContextConditionScout(globeRef, {
        anchorLat,
        anchorLng,
        recommendations: outcome.recommendations,
        radiusM: outcome.radiusM,
      });
    }
  };

  const handleRefine = (message: string) => {
    setRefineBusy(true);
    void pinBarRef.current?.submitRefinement(message).finally(() => {
      setRefineBusy(false);
    });
  };

  const handleConfirmActionInjection = () => {
    if (!actionInjection) {
      return;
    }
    const confirmed = confirmContextActionInjection(actionInjection);
    publishContextActionInjection(confirmed);
    setActionInjection(confirmed);
    setContextAgentSessionPhase("awaiting_human");
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
    return palantirPrimaryRecommendation.kind === "lodging"
      ? pinned.lodging === palantirPrimaryRecommendation.placeId
      : pinned.eatery === palantirPrimaryRecommendation.placeId;
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
  const hasPinnedSelection = Boolean(pinnedByKind.lodging || pinnedByKind.eatery);
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

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="context-condition-prompt"
      zIndex={RIMVIO_ASSISTANT_FRAME_Z_INDEX}
      dragLabel={copy.globe.contextConditionPanelDragLabel}
      className={cn(className)}
      shellClassName={rimvioAssistantFrameShellClass()}
      bodyClassName="flex min-h-0 flex-col"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
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
            anchorPlaceId={anchorPlaceId}
            anchorPlaceName={anchorPlaceName}
            anchorLat={anchorLat}
            anchorLng={anchorLng}
            anchorPriceKrw={anchorPriceKrw}
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
          />
        </div>
      </div>
    </GlobeBrainSurfaceFloatingFrame>
  );
}
