"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeContextAgentConditionQuestions } from "@/components/globe/globe-context-agent-condition-questions";
import { GlobeContextAgentInterpretationPanel } from "@/components/globe/globe-context-agent-interpretation-panel";
import { GlobeContextAgentPreflightBubble } from "@/components/globe/globe-context-agent-preflight-bubble";
import { GlobeContextAgentProcessStrip } from "@/components/globe/globe-context-agent-process-strip";
import { GlobeContextAgentRecommendationList } from "@/components/globe/globe-context-agent-recommendation-list";
import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { GlobeContextAgentSpatialPatchPreview } from "@/components/globe/globe-context-agent-spatial-patch-preview";
import { GlobeContextActionInjectionCard } from "@/components/globe/globe-context-action-injection-card";
import { GlobeContextAgentRefineChips } from "@/components/globe/globe-context-agent-refine-chips";
import { GlobeContextConditionPinBar, type GlobeContextConditionPinBarHandle } from "@/components/globe/globe-context-condition-pin-bar";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { useContextConditionAutoReplan } from "@/hooks/use-context-condition-auto-replan";
import { copy } from "@/lib/copy/human-ko";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import {
  readContextConditionLastBatch,
  pinContextConditionRecommendation,
  readContextConditionPinnedPlaceIds,
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
  resolveContextAgentWorkPhaseLabel,
  subscribeContextAgentRuntime,
  subscribeContextAgentSession,
  subscribeContextAgentInterpretation,
  readContextAgentInterpretationForEvent,
  setContextAgentSessionPhase,
  type ContextAgentInterpretation,
  isGlobeContextAgentBound,
  type ContextAgentRuntimeState,
  type ContextAgentSessionState,
} from "@/lib/globe/context-agent";
import type { SpatialPatchPreview } from "@/lib/globe/context-condition-ai/spatial-patch-types";
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
import {
  buildContextAgentPreflightBriefing,
  resolveContextAgentZeroPrompt,
} from "@/lib/globe/context-agent";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";
import { resolveBridgeContextWeatherTarget } from "@/lib/globe/resolve-bridge-context-weather-target";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { GlobeExperienceTimelineStrip } from "@/components/globe/globe-experience-timeline-strip";
import { useExperienceSimulationPlayback } from "@/hooks/use-experience-simulation-playback";
import {
  buildExperienceScenarioFromOutcome,
  publishExperienceScenario,
  readExperienceSimulationState,
  resolveActiveSimulationNode,
  setExperienceSimulationBranch,
  setExperienceSimulationPlayback,
  subscribeExperienceSimulation,
  type ExperienceSimulationState,
} from "@/lib/globe/experience-simulation";
import { cn } from "@/lib/utils";

const PREFLIGHT_READ_MS = 2800;

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

function resolveStatusLabel(
  runtime: ContextAgentRuntimeState,
  session: ContextAgentSessionState,
): string {
  return resolveContextAgentWorkPhaseLabel(
    session.workPhase,
    runtime.processPhase,
  );
}

/** Context-bound execution layer — state machine + condition pin bar (not generic chat). */
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
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [runtime, setRuntime] = useState<ContextAgentRuntimeState>(() =>
    readContextAgentRuntimeState(),
  );
  const [agentSession, setAgentSession] = useState<ContextAgentSessionState>(() =>
    readContextAgentSessionState(),
  );
  const [patchPreview, setPatchPreview] = useState<SpatialPatchPreview | null>(
    null,
  );
  const [actionInjection, setActionInjection] =
    useState<ContextActionInjection | null>(() => readContextActionInjection());
  const [simulation, setSimulation] = useState<ExperienceSimulationState>(() =>
    readExperienceSimulationState(),
  );
  const [questions, setQuestions] = useState<readonly LocalDiscoveryQuestion[]>([]);
  const [recommendations, setRecommendations] = useState<
    readonly ContextConditionRecommendation[]
  >([]);
  const questionHandlerRef = useRef<
    (choice: LocalDiscoveryQuestionChoice) => void
  >(() => {});
  const pinBarRef = useRef<GlobeContextConditionPinBarHandle>(null);
  const zeroPromptRanRef = useRef(false);
  const [situationLine, setSituationLine] = useState<string | null>(null);
  const [preflightLine, setPreflightLine] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<ContextAgentInterpretation | null>(
    null,
  );
  const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
  const [refineBusy, setRefineBusy] = useState(false);
  const [pickBusyPlaceId, setPickBusyPlaceId] = useState<string | null>(null);
  const [pinnedRevision, setPinnedRevision] = useState(0);
  const [activeSpec, setActiveSpec] = useState<
    import("@/lib/globe/context-condition-ai/local-discovery-action-types").LocalDiscoveryActionSpec | null
  >(null);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    zeroPromptRanRef.current = false;
    setSituationLine(null);
    setPreflightLine(null);
    setInterpretation(null);
    setWeatherContext(null);
    setBodyExpanded(true);
    setQuestions([]);
    const batch = readContextConditionLastBatch(event.id);
    setLastSummary(batch?.summaryKo ?? null);
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
    if ((batch?.recommendations?.length ?? 0) > 0) {
      setBodyExpanded(true);
      setContextAgentSessionPhase("awaiting_human");
    }
    setActiveSpec(batch?.spec ?? null);
    if (event && batch?.count && batch.count > 0) {
      const wired = (batch.recommendations ?? []).map((row, index) => ({
        kind: row.kind,
        title: row.title,
        reasonKo: row.reasonKo,
        rank: index + 1,
        placeId: row.placeId ?? `${row.kind}-${index}`,
        lat: row.lat ?? anchorLat,
        lng: row.lng ?? anchorLng,
      }));
      const scenario = buildExperienceScenarioFromOutcome({
        contextEventId: event.id,
        anchorTitle: anchorPlaceName,
        anchorLat,
        anchorLng,
        outcome: {
          batchId: batch.batchId,
          lodgingCount: wired.filter((row) => row.kind === "lodging").length,
          eateryCount: wired.filter((row) => row.kind === "eatery").length,
          summaryKo: batch.summaryKo,
          pinPoints: wired.map((row) => ({ lat: row.lat, lng: row.lng })),
          radiusM: batch.radiusM ?? 800,
          recommendations: wired,
          spec: batch.spec ?? {
            version: 1,
            resourceTypes: ["restaurant", "hotel"],
            transport: "walk",
            budget: "medium",
            vibe: "popular",
            lodgingKind: "any",
            radiusM: batch.radiusM ?? 800,
          },
        },
      });
      if (scenario) {
        publishExperienceScenario({
          scenario,
          radiusM: batch.radiusM ?? 800,
        });
      }
    }
    if (event) {
      const briefing = buildContextAgentPreflightBriefing({
        event,
        anchorPlaceName,
      });
      setPreflightLine(briefing.briefingLineKo);
      setSituationLine(briefing.briefingLineKo);
    }
  }, [anchorLat, anchorLng, anchorPlaceName, event, open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const target = resolveBridgeContextWeatherTarget(event);
    if (!target) {
      return;
    }
    let cancelled = false;
    void fetchWeatherForecastClient({
      location: target.location,
      targetIso: target.targetIso,
      eventDate: target.eventDate,
      eventTimeSource: target.eventTimeSource,
    }).then((payload) => {
      if (cancelled) {
        return;
      }
      setWeatherContext(payload?.weather ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [event, open]);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const briefing = buildContextAgentPreflightBriefing({
      event,
      anchorPlaceName,
      weather: weatherContext,
    });
    setPreflightLine(briefing.briefingLineKo);
    setSituationLine(briefing.briefingLineKo);
  }, [anchorPlaceName, event, open, weatherContext]);

  useEffect(() => {
    if (!open || !event || zeroPromptRanRef.current) {
      return;
    }
    if (!isGlobeContextAgentBound(event.id)) {
      return;
    }
    const batch = readContextConditionLastBatch(event.id);
    if (batch?.count && batch.count > 0) {
      return;
    }

    zeroPromptRanRef.current = true;
    setContextAgentSessionPhase("briefing");
    const zero = resolveContextAgentZeroPrompt({
      event,
      anchorPlaceName,
      weather: weatherContext,
    });
    setSituationLine(zero.preflightBriefingKo);
    setPreflightLine(zero.preflightBriefingKo);
    setBodyExpanded(true);

    void (async () => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, PREFLIGHT_READ_MS);
      });
      setRefineBusy(true);
      try {
        await pinBarRef.current?.submitTrigger(zero.triggerMessage);
      } finally {
        setRefineBusy(false);
      }
    })();
  }, [anchorPlaceName, event, open]);

  useEffect(() => {
    return subscribeContextAgentRuntime(setRuntime);
  }, []);

  useEffect(() => {
    return subscribeContextAgentSession(setAgentSession);
  }, []);

  useEffect(() => {
    if (!open || !event) {
      return;
    }
    const syncInterpretation = () => {
      setInterpretation(readContextAgentInterpretationForEvent(event.id));
    };
    syncInterpretation();
    return subscribeContextAgentInterpretation(syncInterpretation);
  }, [event, open]);

  useEffect(() => {
    return subscribeContextActionInjection(setActionInjection);
  }, []);

  useEffect(() => {
    return subscribeExperienceSimulation(setSimulation);
  }, []);

  useExperienceSimulationPlayback();

  const lastSimulationFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !event || !simulation.scenario) {
      return;
    }
    if (simulation.scenario.contextEventId !== event.id) {
      return;
    }
    const target = resolveActiveSimulationNode(
      simulation.scenario,
      simulation.playback.cursorIndex,
    );
    if (!target || !globeRef?.current) {
      return;
    }
    const focusKey = `${simulation.scenario.activeBranchId}:${simulation.playback.cursorIndex}:${target.placeId}`;
    if (lastSimulationFocusRef.current === focusKey) {
      return;
    }
    lastSimulationFocusRef.current = focusKey;
    globeRef.current.flyToPin(target.lat, target.lng, "city", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  }, [
    event,
    globeRef,
    open,
    simulation.playback.cursorIndex,
    simulation.scenario,
  ]);

  const travelLines = useMemo(() => {
    if (!event) {
      return [] as string[];
    }
    const state = buildTravelBrainState(event);
    return [
      state.slots.budget_band.reasonKo,
      state.slots.food_bias.reasonKo,
      state.slots.lodging_priority.reasonKo,
    ].filter(Boolean);
  }, [event]);

  const pinnedByKind = useMemo(() => {
    void pinnedRevision;
    const freshEvent = event ? findLifeEventCandidate(event.id) ?? event : null;
    return readContextConditionPinnedPlaceIds(freshEvent);
  }, [event, pinnedRevision]);

  const handlePickRecommendation = (item: ContextConditionRecommendation) => {
    if (!event) {
      return;
    }
    setPickBusyPlaceId(item.placeId);
    void (async () => {
      try {
        pinContextConditionRecommendation({
          eventId: event.id,
          recommendation: item,
        });
        setContextAgentSessionPhase("pinned");
        setPinnedRevision((value) => value + 1);
        toast.success(copy.globe.contextQuickPinToast(item.title));
        globeRef?.current?.flyToPin(item.lat, item.lng, "city", {
          pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
        });
      } catch (caught) {
        toast.error(
          caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : copy.globe.ingestAttachFail,
        );
      } finally {
        setPickBusyPlaceId(null);
      }
    })();
  };

  const handlePinned = (outcome: ContextConditionAnchorPinOutcome) => {
    setLastSummary(outcome.summaryKo);
    setRecommendations(outcome.recommendations);
    setActiveSpec(outcome.spec);
    setContextAgentSessionPhase("awaiting_human");
    setBodyExpanded(true);
    if (event) {
      const scenario = buildExperienceScenarioFromOutcome({
        contextEventId: event.id,
        anchorTitle: anchorPlaceName,
        anchorLat,
        anchorLng,
        outcome,
      });
      if (scenario) {
        publishExperienceScenario({
          scenario,
          radiusM: outcome.radiusM,
        });
      }
    }
    if (outcome.pinPoints.length === 0) {
      return;
    }
    const bounds = computeLodgingDiscoveryBounds({
      user:
        userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null,
      lodging: outcome.pinPoints,
      radiusM: outcome.radiusM,
    });
    if (!bounds) {
      return;
    }
    globeRef?.current?.flyToDiscoveryBounds({
      centerLat: bounds.centerLat,
      centerLng: bounds.centerLng,
      altitude: bounds.altitude,
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
  };

  const handleRefine = (message: string) => {
    setRefineBusy(true);
    void pinBarRef.current?.submitRefinement(message).finally(() => {
      setRefineBusy(false);
    });
  };

  useContextConditionAutoReplan({
    enabled: open && Boolean(event) && isGlobeContextAgentBound(event?.id),
    event,
    anchorPlaceName,
    spec: activeSpec,
    onReplan: async (message) => {
      await pinBarRef.current?.submitRefinement(message);
    },
  });

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

  const showRefineChips = recommendations.length > 0;
  const chipsDisabled =
    refineBusy ||
    runtime.lifecycle === "busy" ||
    agentSession.workPhase === "scouting" ||
    agentSession.workPhase === "replanning";
  const showPreflightChat =
    Boolean(preflightLine) &&
    recommendations.length === 0 &&
    questions.length === 0 &&
    agentSession.workPhase === "briefing";

  if (!open || !event) {
    return null;
  }

  const statusLabel = resolveStatusLabel(runtime, agentSession);
  const showProcessStrip =
    (runtime.lifecycle === "busy" && runtime.processPhase != null) ||
    agentSession.workPhase === "scouting" ||
    agentSession.workPhase === "replanning";

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="context-condition-prompt"
      zIndex={34}
      dragLabel={copy.globe.contextConditionPanelDragLabel}
      className={cn(className)}
      shellClassName="overflow-hidden rounded-[1.15rem] bg-white/82 shadow-[0_18px_48px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05] backdrop-blur-xl"
      bodyClassName="flex min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-black/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <GlobeContextConditionOrb size="md" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                {copy.globe.containerAiEyebrow}
              </p>
              {isGlobeContextAgentBound(event.id) ? (
                <div
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-2 py-0.5 ring-1 ring-[#0071e3]/20"
                  data-globe-context-agent-connected
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-[#0071e3]"
                    aria-hidden
                  />
                  <span className="text-[10px] font-semibold text-[#0071e3]">
                    {copy.globe.contextAgentConnectedBadge}
                  </span>
                </div>
              ) : null}
              <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">
                {anchorPlaceName}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-[11px]",
                  isGlobeContextAgentBound(event.id)
                    ? "text-[#0071e3]/85"
                    : runtime.lifecycle === "busy"
                      ? "font-medium text-[#0071e3]"
                      : "text-[#86868b]",
                )}
                data-globe-context-agent-status
                data-globe-context-agent-lifecycle={runtime.lifecycle}
              >
                {isGlobeContextAgentBound(event.id)
                  ? copy.globe.contextAgentConnectedHint
                  : statusLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setBodyExpanded((value) => !value)}
              className="flex size-7 items-center justify-center rounded-full bg-black/[0.05] text-[#515154] active:scale-95"
              aria-label={
                bodyExpanded
                  ? copy.globe.contextAgentFrameCollapse
                  : copy.globe.contextAgentFrameExpand
              }
              aria-expanded={bodyExpanded}
              data-globe-context-agent-body-toggle
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  bodyExpanded && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full bg-black/[0.05] text-[#515154] active:scale-95"
              aria-label={copy.globe.contextConditionPanelCloseAria}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {showProcessStrip ? (
          <div className="border-b border-black/[0.05] px-3 py-2.5">
            <GlobeContextAgentProcessStrip activePhase={runtime.processPhase} />
          </div>
        ) : null}

        {questions.length > 0 ? (
          <div className="border-b border-black/[0.05] px-3 py-2.5">
            <GlobeContextAgentConditionQuestions
              questions={questions}
              onSelect={(choice) => questionHandlerRef.current(choice)}
            />
          </div>
        ) : null}

        {showPreflightChat ? (
          <div className="min-h-[7.5rem] flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <GlobeContextAgentPreflightBubble briefingLine={preflightLine ?? ""} />
            {refineBusy || runtime.lifecycle === "busy" ? (
              <p className="mt-3 px-1 text-[11px] leading-relaxed text-[#86868b]">
                {copy.globe.contextAgentPreflightScoutSoon}
              </p>
            ) : null}
          </div>
        ) : bodyExpanded ? (
          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3"
            data-globe-context-condition-conversation
          >
            {preflightLine ? (
              <GlobeContextAgentPreflightBubble briefingLine={preflightLine} />
            ) : null}
            <GlobeContextAgentInterpretationPanel interpretation={interpretation} />
            {patchPreview ? (
              <GlobeContextAgentSpatialPatchPreview preview={patchPreview} />
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
            {recommendations.length > 0 ? (
              <GlobeContextAgentRecommendationList
                items={recommendations}
                pinnedByKind={pinnedByKind}
                pickBusyPlaceId={pickBusyPlaceId}
                onPick={handlePickRecommendation}
              />
            ) : (
              <>
                <p className="text-[12px] leading-relaxed text-[#515154]">
                  {copy.globe.contextConditionPanelHint}
                </p>
                {travelLines.length > 0 ? (
                  <ul className="space-y-1.5">
                    {travelLines.map((line) => (
                      <li
                        key={line}
                        className="rounded-xl bg-[#f5f5f7] px-2.5 py-2 text-[11px] leading-relaxed text-[#515154]"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
            {lastSummary ? (
              <p className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-900">
                {lastSummary}
              </p>
            ) : null}
            {simulation.scenario &&
            simulation.scenario.contextEventId === event.id ? (
              <GlobeExperienceTimelineStrip
                scenario={simulation.scenario}
                playback={simulation.playback}
                itineraryDiff={simulation.itineraryDiff}
                onBranchChange={setExperienceSimulationBranch}
                onTogglePlay={() => {
                  setExperienceSimulationPlayback({
                    playing: !simulation.playback.playing,
                  });
                }}
                onScrub={(cursorIndex) => {
                  setExperienceSimulationPlayback({
                    playing: false,
                    cursorIndex,
                  });
                }}
              />
            ) : null}
          </div>
        ) : questions.length === 0 && !showPreflightChat ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-[#86868b]">
            {preflightLine ??
              (recommendations.length > 0
                ? copy.globe.localDiscoveryRefineHint
                : copy.globe.contextAgentComposeHint)}
          </p>
        ) : null}

        {showRefineChips ? (
          <div className="shrink-0 border-t border-black/[0.05] px-3 py-2">
            <GlobeContextAgentRefineChips
              disabled={chipsDisabled}
              onSelect={handleRefine}
            />
          </div>
        ) : null}

        <div className="shrink-0 border-t border-black/[0.05] px-3 py-2.5">
          <GlobeContextConditionPinBar
            ref={pinBarRef}
            contextEventId={event.id}
            anchorPlaceId={anchorPlaceId}
            anchorPlaceName={anchorPlaceName}
            anchorLat={anchorLat}
            anchorLng={anchorLng}
            anchorPriceKrw={anchorPriceKrw}
            onPinned={handlePinned}
            onQuestionsChange={setQuestions}
            onRecommendationsChange={setRecommendations}
            onPatchPreviewChange={setPatchPreview}
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
