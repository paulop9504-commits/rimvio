"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeContextAgentConditionQuestions } from "@/components/globe/globe-context-agent-condition-questions";
import { GlobeContextAgentProcessStrip } from "@/components/globe/globe-context-agent-process-strip";
import { GlobeContextAgentRecommendationList } from "@/components/globe/globe-context-agent-recommendation-list";
import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
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
  subscribeContextAgentRuntime,
  isGlobeContextAgentBound,
  type ContextAgentRuntimeState,
} from "@/lib/globe/context-agent";
import { resolveContextAgentZeroPrompt } from "@/lib/globe/context-agent/resolve-context-agent-zero-prompt";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

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

function resolveStatusLabel(runtime: ContextAgentRuntimeState): string {
  if (runtime.lifecycle === "idle") {
    return copy.globe.contextAgentStatusIdle;
  }
  switch (runtime.processPhase) {
    case "exploring":
      return copy.globe.contextAgentStatusExplore;
    case "analyzing":
      return copy.globe.contextAgentStatusAnalyze;
    case "optimizing":
      return copy.globe.contextAgentStatusPin;
    default:
      return copy.globe.contextAgentStatusBusy;
  }
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
    setBodyExpanded(false);
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
    }
    setActiveSpec(batch?.spec ?? null);
  }, [anchorLat, anchorLng, event, open]);

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
    const zero = resolveContextAgentZeroPrompt({
      event,
      anchorPlaceName,
    });
    setSituationLine(zero.situationLineKo);
    setBodyExpanded(true);

    void (async () => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
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
    setBodyExpanded(true);
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

  const showRefineChips = recommendations.length > 0;
  const chipsDisabled = refineBusy || runtime.lifecycle === "busy";

  if (!open || !event) {
    return null;
  }

  const statusLabel = resolveStatusLabel(runtime);
  const showProcessStrip = runtime.lifecycle === "busy" && runtime.processPhase != null;

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
              <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">
                {anchorPlaceName}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-[11px]",
                  runtime.lifecycle === "busy"
                    ? "font-medium text-[#0071e3]"
                    : "text-[#86868b]",
                )}
                data-globe-context-agent-status
                data-globe-context-agent-lifecycle={runtime.lifecycle}
              >
                {statusLabel}
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

        {situationLine && recommendations.length === 0 && questions.length === 0 ? (
          <div className="border-b border-black/[0.05] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
              {copy.globe.localDiscoverySituationEyebrow}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#1d1d1f]">
              {situationLine}
            </p>
          </div>
        ) : null}

        {bodyExpanded ? (
          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3"
            data-globe-context-condition-conversation
          >
            {situationLine ? (
              <p className="rounded-xl bg-[#0071e3]/8 px-2.5 py-2 text-[11px] leading-relaxed text-[#1d1d1f]">
                {situationLine}
              </p>
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
          </div>
        ) : questions.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-[#86868b]">
            {situationLine ??
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
            registerQuestionHandler={(handler) => {
              questionHandlerRef.current = handler;
            }}
          />
        </div>
      </div>
    </GlobeBrainSurfaceFloatingFrame>
  );
}
