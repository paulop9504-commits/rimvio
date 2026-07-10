"use client";

import type { RefObject } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { GlobeLodgingBookingSlotChips } from "@/components/globe/globe-lodging-booking-slot-chips";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { copy } from "@/lib/copy/human-ko";
import { flyGlobeToDiscoveryLenses } from "@/lib/globe/context-agent/snap-globe-to-context-agent-anchor";
import {
  readContextConditionPinnedPlaceIds,
  pinContextConditionRecommendation,
  clearContextConditionLastBatch,
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
  runContextConditionAnchorPin,
  dismissContextConditionPinBatch,
  planSpatialPatch,
  type ContextConditionLastBatchWire,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import {
  buildContextActionInjection,
  publishContextActionInjection,
  resolveContextActionIntent,
} from "@/lib/globe/context-action-injection";
import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";
import {
  clearContextConditionPending,
  readContextConditionPending,
  writeContextConditionPending,
} from "@/lib/globe/context-condition-ai/context-condition-pending-spec-store";
import type {
  ContextConditionRecommendation,
  LocalDiscoveryPendingAnswers,
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  applyQuestionChoice,
  isLocalDiscoveryRefinement,
  resolveLocalDiscoveryAction,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import { assessIntentConvergence } from "@/lib/globe/context-condition-ai/intent-convergence/assess-intent-convergence";
import { detectConvergenceIntent } from "@/lib/globe/context-condition-ai/intent-convergence/intent-convergence-schema";
import {
  INSTANT_POI_DEBOUNCE_MS,
  isInstantPoiSearch,
  matchesInstantPoiTyping,
  resolveInstantPoiFocus,
} from "@/lib/globe/context-condition-ai/instant-poi-search";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import {
  INSTANT_EATERY_DEBOUNCE_MS,
  isInstantEaterySearch,
  matchesInstantEateryTyping,
} from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { buildConvergenceQuestion } from "@/lib/globe/context-condition-ai/intent-convergence/build-convergence-question";
import { buildActivityNextHopQuestion } from "@/lib/globe/context-condition-ai/intent-convergence/build-next-hop-question";
import { generateSmallTalkReply } from "@/lib/globe/context-condition-ai/small-talk/generate-small-talk-reply";
import { classifyInput } from "@/lib/globe/context-condition-ai/dispatch/classify-input";
import {
  isFollowUpDiscoveryTurn,
} from "@/lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import {
  beginContextAgentWork,
  finishContextAgentWork,
  setContextAgentProcessPhase,
  setContextAgentSessionPhase,
  setContextAgentSessionSpec,
} from "@/lib/globe/context-agent";
import {
  appendContextAgentComposeTurn,
  appendScoutFeedGateTurn,
  appendIntakeSlotsComposeTurn,
  appendOperatorAskChipsComposeTurn,
  markIntakeSlotsComposeTurnSubmitted,
  markOperatorAskChipsTurnSubmitted,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant";
import {
  applyPalantirOperatorFacetRefine,
  buildClarifyingOntologyGraph,
  buildContextDiscoveryOntologyGraph,
  publishContextOnlyGlobeProjection,
  publishGeoOntologyGraph,
  readPalantirWorkspaceSnapshot,
  resolvePalantirExcludePlaceIds,
  resolvePalantirRefineIntent,
} from "@/lib/globe/spatial-semantic";
import { dispatchGlobeLodgingDiscoveryClose } from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { interpretMessyForContextAgent } from "@/lib/messy-prompt-interpreter/adapters/context-agent-adapter";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import {
  writeExplorationModeOverride,
  type ExplorationMode,
} from "@/lib/globe/discovery-policy";
import { cn } from "@/lib/utils";
import {
  applyLensCommand,
  lensPickPromptKo,
  publishDiscoveryLensAction,
  readDiscoveryLensSession,
  setActiveDiscoveryLens,
  subscribeDiscoveryLensAction,
  subscribeDiscoveryLensSession,
  type DiscoveryLensId,
  type DiscoveryLensSession,
} from "@/lib/globe/discovery-lens";
import { buildDiscoveryLensSpawnAnnouncement } from "@/lib/globe/discovery-lens/build-discovery-lens-announcements";
import {
  ensureNeighborhoodLensForActivityScout,
  ensureScoutAnchorFromDiscoveryPov,
  isLodgingDiscoveryMessage,
  maybeSpawnDiscoveryLensesFromChoice,
  resolveDiscoveryOriginForContext,
} from "@/lib/globe/discovery-lens/integrate-context-agent-lens";
import {
  hasCompleteLodgingBookingSlots,
  isLodgingBookingQuery,
  readLodgingBookingSlots,
  writeLodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import { buildLodgingBookingSlotChipLabels } from "@/lib/globe/context-hub/build-lodging-booking-slot-chip-labels";
import { prefetchAllDiscoveryLenses, prefetchDiscoveryLensById } from "@/lib/globe/discovery-lens/prefetch-all-discovery-lenses";
import {
  dispatchGlobeResourceReelKindFilter,
} from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import { buildScoutFeedGateEnrichment } from "@/lib/globe/context-condition-ai/build-scout-feed-gate-enrichment";
import { clearScoutRevealPending } from "@/lib/globe/context-condition-ai/context-condition-scout-reveal-pending-store";
import { resourceReelKindFilterReplyKo } from "@/lib/globe/resource-reel/resource-reel-kind-filter-reply";
import { markDiscoveryLensPickPending } from "@/lib/globe/discovery-lens/spawn-discovery-lenses";
import {
  assertScoutContractGate,
  primaryScoutViolationMessage,
  readScoutContract,
  readScoutSelectedAnchor,
  scoutCategoryFromSpec,
  withScoutOutputRef,
  wrapScoutContract,
  writeScoutContract,
} from "@/lib/globe/contracts";
import {
  gateOperatorTurnSync,
  mapClassifyToOperatorTool,
  readOperatorTurnSsot,
} from "@/lib/globe/operator-turn";
import {
  evaluateOnboardingParallelException,
  runOnboardingParallelMapScouts,
} from "@/lib/container-ai";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { TRAVEL_ONBOARDING_PARALLEL_NODE_IDS } from "@/lib/context-blueprint/node-resource-state";
import {
  buildIntakeContext,
  LODGING_INTAKE_DOMAIN_ID,
  resolveIntakeOffer,
  TRIP_INTAKE_DOMAIN_ID,
} from "@/lib/intake";
import { buildIntakeSheetFromOffer, buildLodgingIntakeEditOffer } from "@/lib/intake/build-intake-sheet-from-offer";
import { parseLodgingIntakeSubmitValues } from "@/lib/intake/domains/lodging/build-lodging-intake-sheet-fields";
import { parseTripIntakeSubmitValues } from "@/lib/intake/domains/trip/build-trip-intake-sheet-fields";
import {
  isBroadTripPackageMessage,
  applyTripIntakeAskChip,
  writeTripIntakeSlots,
  type TripIntakeGapId,
} from "@/lib/globe/trip-intake";
import { runOneShotLodgingPrepClient, isLodgingPrepUtterance } from "@/lib/globe/lodging-prep";

export type IntakeSlotsSubmitInput = {
  turnId: string;
  domainId: string;
  values: Record<string, string | number>;
};

export type AskChipPickInput = {
  turnId: string;
  chipId: string;
  gapId: string;
  value: string;
  labelKo: string;
  pendingTrigger: string;
};

export type GlobeContextConditionPinBarHandle = {
  submitTrigger: (message: string) => Promise<void>;
  submitRefinement: (message: string) => Promise<void>;
  applyExplorationMode: (mode: ExplorationMode) => Promise<void>;
  hasLastBatch: () => boolean;
  hasActiveSpec: () => boolean;
};

export type GlobeContextConditionPinBarProps = {
  contextEventId: string;
  /** TravelTrip Blueprint for broad onboardingParallel gate (optional). */
  operatorBlueprint?: ContextBlueprint | null;
  /** Destination already committed (not Ingress hypothesis). */
  destinationConfirmed?: boolean;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  userLat?: number | null;
  userLng?: number | null;
  anchorPriceKrw?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  onPinned?: (outcome: ContextConditionAnchorPinOutcome) => void;
  onPalantirOperatorUpdate?: () => void;
  onUserCompose?: (message: string) => void;
  /** When false, opening the frame does not restore last pin batch into the UI. */
  hydrateFromBatch?: boolean;
  onQuestionsChange?: (questions: readonly LocalDiscoveryQuestion[]) => void;
  onRecommendationsChange?: (
    items: ContextConditionAnchorPinOutcome["recommendations"],
  ) => void;
  onActionInjectionChange?: (injection: ContextActionInjection | null) => void;
  registerQuestionHandler?: (
    handler: (choice: LocalDiscoveryQuestionChoice) => void,
  ) => void;
  onLensSessionChange?: (session: DiscoveryLensSession | null) => void;
  registerLensHandler?: (handler: (lensId: DiscoveryLensId) => void) => void;
  registerIntakeSubmitHandler?: (
    handler: (input: IntakeSlotsSubmitInput) => Promise<void>,
  ) => void;
  registerAskChipPickHandler?: (
    handler: (input: AskChipPickInput) => Promise<void>,
  ) => void;
  className?: string;
};

function mapMobility(value: string | undefined): "walk" | "car" | "transit" | null {
  if (value === "walk" || value === "transit" || value === "taxi" || value === "mixed") {
    if (value === "taxi") {
      return "car";
    }
    if (value === "mixed") {
      return "transit";
    }
    return value;
  }
  return null;
}

/** Coarse resource category of a spec — used to purge stale off-category pins. */
function specResourceCategory(
  spec: ContextConditionAnchorPinOutcome["spec"],
): "lodging" | "eatery" | "activity" | "amenity" {
  const types = spec.resourceTypes;
  if (types.includes("amenity")) {
    return "amenity";
  }
  if (types.includes("activity")) {
    return "activity";
  }
  if (types.includes("hotel") && !types.includes("restaurant")) {
    return "lodging";
  }
  return "eatery";
}

function publishScoutFeedGateTurn(input: {
  contextEventId: string;
  outcome: ContextConditionAnchorPinOutcome;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  triggerMessage?: string;
}): void {
  if (input.outcome.recommendations.length === 0) {
    return;
  }
  const enrichment = buildScoutFeedGateEnrichment({
    anchorPlaceName: input.anchorPlaceName,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    triggerMessage: input.triggerMessage,
    outcome: input.outcome,
  });
  appendScoutFeedGateTurn(input.contextEventId, {
    summaryKo: input.outcome.summaryKo,
    count: input.outcome.recommendations.length,
    batchId: input.outcome.batchId,
    scoutKind: enrichment.scoutKind,
    aiInsightKo: enrichment.aiInsightKo,
    tipsKo: enrichment.tipsKo,
    highlightTitles: enrichment.highlightTitles,
    videoContext: enrichment.videoContext,
  });
}

function mapBudget(value: string | undefined): "low" | "medium" | "high" | null {
  if (value === "value") {
    return "low";
  }
  if (value === "premium") {
    return "high";
  }
  if (value === "balanced") {
    return "medium";
  }
  return null;
}

/** Local action trigger → questions → structured spec → map placement. */
export const GlobeContextConditionPinBar = forwardRef<
  GlobeContextConditionPinBarHandle,
  GlobeContextConditionPinBarProps
>(function GlobeContextConditionPinBar(
  {
  contextEventId,
  operatorBlueprint = null,
  destinationConfirmed = false,
  anchorPlaceId,
  anchorPlaceName,
  anchorLat,
  anchorLng,
  userLat = null,
  userLng = null,
  anchorPriceKrw = null,
  globeRef,
  onPinned,
  onPalantirOperatorUpdate,
  onUserCompose,
  hydrateFromBatch = true,
  onQuestionsChange,
  onRecommendationsChange,
  onActionInjectionChange,
  registerQuestionHandler,
  onLensSessionChange,
  registerLensHandler,
  registerIntakeSubmitHandler,
  registerAskChipPickHandler,
  className,
  },
  ref,
) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setLensSession] = useState<DiscoveryLensSession | null>(
    () => readDiscoveryLensSession(contextEventId),
  );
  const lastTriggerRef = useRef<string>("");
  const [lastBatch, setLastBatch] = useState<ContextConditionLastBatchWire | null>(
    null,
  );
  const [lastSpec, setLastSpec] = useState<
    ContextConditionAnchorPinOutcome["spec"] | null
  >(null);

  const [lastRecommendations, setLastRecommendations] = useState<
    readonly ContextConditionRecommendation[]
  >([]);
  const lastSpecRef = useRef<ContextConditionAnchorPinOutcome["spec"] | null>(null);
  lastSpecRef.current = lastSpec;
  const lastInstantPoiSearchRef = useRef<string>("");
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    return subscribeDiscoveryLensSession((session) => {
      if (session && session.contextEventId !== contextEventId) {
        return;
      }
      setLensSession(session);
      onLensSessionChange?.(session);
    });
  }, [contextEventId, onLensSessionChange]);

  function wireRecommendations(
    batch: ContextConditionLastBatchWire | null,
  ): ContextConditionRecommendation[] {
    return (batch?.recommendations ?? []).map((row, index) => ({
      kind: row.kind,
      title: row.title,
      reasonKo: row.reasonKo,
      rank: index + 1,
      placeId: row.placeId ?? `${row.kind}-${index}`,
      lat: row.lat ?? anchorLat,
      lng: row.lng ?? anchorLng,
    }));
  }

  useEffect(() => {
    if (!hydrateFromBatch) {
      setLastBatch(null);
      setLastSpec(null);
      setLastRecommendations([]);
      onQuestionsChange?.([]);
      return;
    }
    const batch = readContextConditionLastBatch(contextEventId);
    setLastBatch(batch);
    setLastSpec(batch?.spec ?? null);
    const wired = wireRecommendations(batch);
    setLastRecommendations(wired);
    onRecommendationsChange?.(wired);
    const pending = readContextConditionPending(contextEventId);
    onQuestionsChange?.(pending?.questions ?? []);
  }, [
    anchorLat,
    anchorLng,
    contextEventId,
    hydrateFromBatch,
    onQuestionsChange,
    onRecommendationsChange,
  ]);

  const tryPublishActionInjection = useCallback(
    async (triggerMessage: string): Promise<boolean> => {
      let event = findLifeEventCandidate(contextEventId);
      if (!event) {
        return false;
      }
      const pinned = readContextConditionPinnedPlaceIds(event);
      const pinnedResourceKind = pinned.lodging
        ? "lodging"
        : pinned.eatery
          ? "eatery"
          : null;
      const intent = resolveContextActionIntent({
        message: triggerMessage,
        pinnedResourceKind,
      });
      if (!intent) {
        return false;
      }

      const needsPin =
        (intent.resourceKind === "lodging" && !pinned.lodging) ||
        (intent.resourceKind === "eatery" && !pinned.eatery);
      if (needsPin) {
        const batch = readContextConditionLastBatch(contextEventId);
        const candidate = batch?.recommendations?.find(
          (row) => row.kind === intent.resourceKind,
        );
        if (candidate?.placeId) {
          try {
            pinContextConditionRecommendation({
              eventId: contextEventId,
              recommendation: {
                kind: candidate.kind,
                placeId: candidate.placeId,
                title: candidate.title,
              },
            });
            event = findLifeEventCandidate(contextEventId) ?? event;
          } catch {
            // fall through — build may still fail with pin-first hint
          }
        }
      }

      const built = buildContextActionInjection({ event, intent });
      if (!built) {
        toast.message(copy.globe.contextActionPinFirstHint);
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: copy.globe.contextActionPinFirstHint,
        });
        return true;
      }
      publishContextActionInjection(built);
      onActionInjectionChange?.(built);
      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: copy.globe.contextActionInjectionAssistLine(built.target.title),
      });
      setMessage("");
      setContextAgentSessionPhase("awaiting_human");
      return true;
    },
    [contextEventId, onActionInjectionChange],
  );

  const executeParallelOnboarding = useCallback(
    async (input: {
      triggerMessage: string;
      parallelNodeIds: readonly string[];
      destinationLabel: string;
    }): Promise<ContextConditionAnchorPinOutcome | null> => {
      dispatchGlobeLodgingDiscoveryClose();
      if (lastBatch) {
        dismissContextConditionPinBatch({
          contextEventId,
          batchId: lastBatch.batchId,
        });
        clearContextConditionLastBatch(contextEventId);
        clearScoutRevealPending(contextEventId);
      }
      setContextAgentSessionPhase("scouting");
      beginContextAgentWork("exploring");
      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: copy.globe.onboardingParallelStart(input.destinationLabel),
      });
      if (input.parallelNodeIds.includes("departure")) {
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: copy.globe.onboardingParallelDepartureHint,
        });
      }

      const result = await runOnboardingParallelMapScouts({
        contextEventId,
        triggerMessage: input.triggerMessage,
        destinationLabel: input.destinationLabel,
        parallelNodeIds: input.parallelNodeIds,
        anchorPlaceId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        anchorPriceKrw,
        discoveryOrigin: resolveDiscoveryOriginForContext(contextEventId),
      });

      const outcome = result.merged;
      if (!outcome) {
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: copy.globe.contextConditionPinEmpty,
        });
        toast.message(copy.globe.contextConditionPinEmpty);
        return null;
      }

      const wire: ContextConditionLastBatchWire = {
        batchId: outcome.batchId,
        count: outcome.lodgingCount + outcome.eateryCount,
        summaryKo: outcome.summaryKo,
        atIso: new Date().toISOString(),
        radiusM: outcome.radiusM,
        spec: outcome.spec,
        recommendations: outcome.recommendations.map((row) => ({
          kind: row.kind,
          activitySubtype: row.activitySubtype ?? null,
          title: row.title,
          reasonKo: row.reasonKo,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
        })),
      };
      writeContextConditionLastBatch(contextEventId, wire);
      setLastBatch(wire);
      setLastSpec(outcome.spec);
      setLastRecommendations(outcome.recommendations);
      setMessage("");
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcome.recommendations);
      clearContextConditionPending(contextEventId);
      setContextAgentSessionSpec(outcome.spec);
      setContextAgentSessionPhase("deciding");
      onPinned?.(outcome);
      publishScoutFeedGateTurn({
        contextEventId,
        outcome,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        triggerMessage: input.triggerMessage,
      });
      return outcome;
    },
    [
      anchorLat,
      anchorLng,
      anchorPlaceId,
      anchorPlaceName,
      anchorPriceKrw,
      contextEventId,
      lastBatch,
      onPinned,
      onQuestionsChange,
      onRecommendationsChange,
    ],
  );

  const executeWithSpec = useCallback(
    async (input: {
      triggerMessage: string;
      spec: ContextConditionAnchorPinOutcome["spec"];
      patchPlan?: ReturnType<typeof planSpatialPatch> | null;
      keptRecommendations?: readonly ContextConditionRecommendation[];
      excludePlaceIds?: readonly string[];
      /** Strict domains handle empty results conversationally — skip generic toast. */
      suppressEmptyMessage?: boolean;
    }) => {
      // Category-switch cleanup: an activity/eatery search must not leave stale
      // hotel pins behind. Close the separate lodging discovery session and drop
      // the previous batch when the resource category changes (fresh scout only).
      const nextCategory = specResourceCategory(input.spec);
      if (nextCategory !== "lodging") {
        dispatchGlobeLodgingDiscoveryClose();
      }
      if (!input.patchPlan && lastBatch) {
        dismissContextConditionPinBatch({
          contextEventId,
          batchId: lastBatch.batchId,
        });
        clearContextConditionLastBatch(contextEventId);
        clearScoutRevealPending(contextEventId);
      }
      if (nextCategory === "activity" || nextCategory === "amenity") {
        publishContextOnlyGlobeProjection(contextEventId);
      }
      setContextAgentSessionPhase("scouting");
      beginContextAgentWork("exploring");
      const instantScout =
        isInstantPoiSearch(input.triggerMessage) ||
        isInstantEaterySearch(input.triggerMessage) ||
        isInstantLodgingSearch(input.triggerMessage) ||
        isLodgingBookingQuery(input.triggerMessage);
      if (!instantScout) {
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "build_log",
          text: copy.globe.geoOntologyBuildMapping,
        });
      }
      const outcome = await runContextConditionAnchorPin({
        contextEventId,
        anchorPlaceId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        anchorPriceKrw,
        message: input.triggerMessage,
        spec: input.spec,
        patchPlan: input.patchPlan ?? null,
        keptRecommendations: input.keptRecommendations,
        excludePlaceIds: input.excludePlaceIds,
        discoveryOrigin: resolveDiscoveryOriginForContext(contextEventId),
        deferMapReveal: true,
        onProcessPhase: (phase) => {
          setContextAgentProcessPhase(phase);
          if (phase === "optimizing" && !instantScout) {
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "build_log",
              text: copy.globe.geoOntologyBuildSpatial,
            });
          }
        },
      });
      if (!outcome) {
        if (
          nextCategory === "activity" ||
          nextCategory === "amenity"
        ) {
          publishContextOnlyGlobeProjection(contextEventId);
        }
        if (!input.suppressEmptyMessage) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: copy.globe.contextConditionPinEmpty,
          });
          toast.message(copy.globe.contextConditionPinEmpty);
        }
        return null;
      }
      if (!instantScout) {
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "build_log",
          text: copy.globe.geoOntologyBuildResolve,
        });
      }
      const activeContract = readScoutContract(contextEventId);
      if (activeContract) {
        const gate = assertScoutContractGate({
          contract: activeContract,
          outputKinds: outcome.recommendations.map((row) => row.kind),
        });
        if (!gate.ok) {
          const messageKo =
            primaryScoutViolationMessage(gate) ??
            copy.globe.contextConditionPinEmpty;
          dismissContextConditionPinBatch({
            contextEventId,
            batchId: outcome.batchId,
          });
          clearContextConditionLastBatch(contextEventId);
          clearScoutRevealPending(contextEventId);
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: messageKo,
          });
          toast.message(messageKo);
          return null;
        }
        writeScoutContract(
          contextEventId,
          withScoutOutputRef(activeContract, outcome.batchId),
        );
      }

      const wire: ContextConditionLastBatchWire = {
        batchId: outcome.batchId,
        count: outcome.lodgingCount + outcome.eateryCount,
        summaryKo: outcome.summaryKo,
        atIso: new Date().toISOString(),
        radiusM: outcome.radiusM,
        spec: outcome.spec,
        recommendations: outcome.recommendations.map((row) => ({
          kind: row.kind,
          title: row.title,
          reasonKo: row.reasonKo,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
        })),
      };
      setLastBatch(wire);
      setLastSpec(outcome.spec);
      setLastRecommendations(outcome.recommendations);
      setMessage("");
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcome.recommendations);
      clearContextConditionPending(contextEventId);
      setContextAgentSessionSpec(outcome.spec);
      setContextAgentSessionPhase("deciding");
      onPinned?.(outcome);
      publishScoutFeedGateTurn({
        contextEventId,
        outcome,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        triggerMessage: input.triggerMessage,
      });
      return outcome;
    },
    [
      anchorLat,
      anchorLng,
      anchorPlaceId,
      anchorPlaceName,
      anchorPriceKrw,
      contextEventId,
      lastBatch,
      onPinned,
      onQuestionsChange,
      onRecommendationsChange,
    ],
  );

  useEffect(() => {
    return subscribeDiscoveryLensAction(({ contextEventId: eventId, action }) => {
      if (eventId !== contextEventId) {
        return;
      }
      const activeLensId = readDiscoveryLensSession(contextEventId)?.activeLensId;
      if (action.type === "move_active" || action.type === "resize_active") {
        if (activeLensId) {
          void prefetchDiscoveryLensById({
            contextEventId,
            lensId: activeLensId,
          }).then(({ announceKo }) => {
            if (announceKo) {
              appendContextAgentComposeTurn(contextEventId, {
                role: "assistant",
                kind: "text",
                text: announceKo,
              });
            }
          });
        }
      } else if (action.type === "activate") {
        void prefetchDiscoveryLensById({
          contextEventId,
          lensId: action.lensId as DiscoveryLensId,
        }).then(({ announceKo }) => {
          if (announceKo) {
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: announceKo,
            });
          }
        });
      }
      const rescout =
        action.type === "activate"
          ? action.rescout
          : action.type === "move_active" || action.type === "resize_active"
            ? action.rescout
            : false;
      if (!rescout) {
        return;
      }
      const spec = lastSpecRef.current;
      const trigger = lastTriggerRef.current;
      if (!spec || !trigger) {
        return;
      }
      void executeWithSpec({
        triggerMessage: trigger,
        spec,
        suppressEmptyMessage: true,
      });
    });
  }, [contextEventId, executeWithSpec]);

  const runPalantirRefine = useCallback(
    async (refineMessage: string): Promise<boolean> => {
      const text = refineMessage.trim();
      if (!text || !lastSpec || lastRecommendations.length === 0) {
        return false;
      }

      const event = findLifeEventCandidate(contextEventId);
      const pinned = readContextConditionPinnedPlaceIds(event);
      const intent = resolvePalantirRefineIntent({
        message: text,
        currentSpec: lastSpec,
        previousRecommendations: lastRecommendations,
        pinnedPlaceIds: pinned,
      });
      if (!intent) {
        return false;
      }

      if (intent.kind === "facet_rerank") {
        const snapshot = applyPalantirOperatorFacetRefine({
          contextEventId,
          facetId: intent.facetId,
          recommendations: lastRecommendations,
          spec: lastSpec,
          radiusM: lastBatch?.radiusM ?? lastSpec.radiusM,
          batchId: lastBatch?.batchId ?? null,
        });
        if (snapshot?.briefKo) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: snapshot.briefKo,
          });
        }
        onPalantirOperatorUpdate?.();
        setContextAgentSessionPhase("awaiting_human");
        return true;
      }

      if (intent.kind === "alternate_scout") {
        const focus = lastSpec.eateryFocus?.trim();
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: focus
            ? copy.globe.cicadaAgentSearchingSummaryFocus(focus)
            : copy.globe.cicadaAgentSearchingSummary,
        });
        setContextAgentSessionPhase("replanning");
        await executeWithSpec({
          triggerMessage: text,
          spec: lastSpec,
          excludePlaceIds: resolvePalantirExcludePlaceIds({
            recommendations: lastRecommendations,
            projectedPlaceIds:
              readPalantirWorkspaceSnapshot(contextEventId)?.projectedPlaceIds,
          }),
        });
        return true;
      }

      setContextAgentSessionPhase("replanning");
      await executeWithSpec({
        triggerMessage: text,
        spec: intent.nextSpec,
        patchPlan: intent.patchPlan,
        keptRecommendations: intent.keptRecommendations,
      });
      return true;
    },
    [
      contextEventId,
      executeWithSpec,
      lastBatch?.batchId,
      lastBatch?.radiusM,
      lastRecommendations,
      lastSpec,
      onPalantirOperatorUpdate,
    ],
  );

  const emitStrictDomainEmptyFollowup = useCallback(
    async (
      spec: ContextConditionAnchorPinOutcome["spec"],
      triggerMessage: string,
      answers: LocalDiscoveryPendingAnswers,
      askedAxisIds: readonly string[],
    ) => {
      if (spec.resourceTypes.includes("amenity")) {
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: copy.globe.contextConditionGuardEmptyAmenity,
        });
        setContextAgentSessionPhase("awaiting_human");
        return;
      }
      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: copy.globe.contextConditionGuardEmptyActivity,
      });
      onQuestionsChange?.([]);
      setContextAgentSessionPhase("awaiting_human");
    },
    [anchorPlaceName, contextEventId, onQuestionsChange],
  );

  const resolveAndMaybeExecute = useCallback(
    async (triggerMessage: string, answers?: Record<string, string>) => {
      const interpreted = await interpretMessyForContextAgent({
        messyInput: triggerMessage,
        contextEventId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
      });
      const pipelineMessage = interpreted.refinedMessage;

      const event = findLifeEventCandidate(contextEventId);
      const travelBrain = event ? buildTravelBrainState(event) : null;
      const lodgingSlots = readLodgingBookingSlots(event);
      const lodgingFastPath =
        isInstantLodgingSearch(pipelineMessage) ||
        (isLodgingBookingQuery(pipelineMessage) &&
          hasCompleteLodgingBookingSlots(lodgingSlots));
      const eateryFastPath = isInstantEaterySearch(pipelineMessage);
      const followUpTurn =
        lastRecommendations.length > 0 &&
        isFollowUpDiscoveryTurn(pipelineMessage, lastRecommendations);
      const mergedAnswers: Record<string, string> = {
        ...(followUpTurn && lastSpec
          ? {
              transport: lastSpec.transport,
              budget: lastSpec.budget,
              vibe: lastSpec.vibe,
              ...(lastSpec.lodgingKind !== "any"
                ? { lodgingKind: lastSpec.lodgingKind }
                : {}),
            }
          : {}),
        ...(answers ?? {}),
      };

      // Intent Convergence Engine — before searching, converge an ambiguous
      // request ("놀거리"·"카페"·"데이트") into a concrete intent with the fewest
      // questions. High confidence (qualifier present / already answered) → skip.
      // The LLM only authors chip copy; chips reuse the existing question channel.
      const convergenceIntent = detectConvergenceIntent(pipelineMessage);
      const skipConvergenceForBroadActivity =
        convergenceIntent === "activity" || convergenceIntent === "outing";
      const pendingConvergence = readContextConditionPending(contextEventId);
      const askedAxisIds = pendingConvergence?.askedConvergenceAxes ?? [];
      const priorHops = pendingConvergence?.convergenceHops ?? 0;
      const convergence = lodgingFastPath || eateryFastPath || skipConvergenceForBroadActivity
        ? { shouldAsk: false as const, intentType: convergenceIntent }
        : assessIntentConvergence({
            message: pipelineMessage,
            answers: mergedAnswers,
            askedAxisIds,
            followUpTurn,
          });
      if (!lodgingFastPath && !eateryFastPath && convergence.shouldAsk) {
        setContextAgentSessionPhase("collecting_context");
        const { question, askedAxisId } = await buildConvergenceQuestion({
          intentType: convergence.intentType,
          topAxis: convergence.topAxis,
          candidateAxes: convergence.candidateAxes,
          query: pipelineMessage,
          region: anchorPlaceName,
        });
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: question.promptKo,
        });
        writeContextConditionPending(contextEventId, {
          triggerMessage,
          questions: [question],
          answers: mergedAnswers,
          spec: null,
          updatedAtIso: new Date().toISOString(),
          askedConvergenceAxes: [...askedAxisIds, askedAxisId],
        });
        onQuestionsChange?.([question]);
        return null;
      }

      const resolved = resolveLocalDiscoveryAction({
        message: pipelineMessage,
        answers: mergedAnswers,
        followUpTurn,
        previousSpec: lastSpec,
        mobilityConfidence: travelBrain?.slots.mobility_style.confidence,
        budgetConfidence: travelBrain?.slots.budget_band.confidence,
        foodConfidence: travelBrain?.slots.food_bias.confidence,
        lodgingConfidence: travelBrain?.slots.lodging_priority.confidence,
        inferredTransport: mapMobility(travelBrain?.slots.mobility_style.value),
        inferredBudget: mapBudget(travelBrain?.slots.budget_band.value),
        inferredVibe:
          travelBrain?.slots.food_bias.value === "local"
            ? "local"
            : travelBrain?.slots.food_bias.value === "value"
              ? "popular"
              : "popular",
      });

      if (resolved.status === "questions") {
        setContextAgentSessionPhase("collecting_context");
        const resourceQuestion = resolved.questions.find(
          (row) => row.slot === "resourceFocus",
        );
        const menuQuestion = resolved.questions.find((row) => row.slot === "menuFocus");
        const clarifyText = resourceQuestion
          ? resourceQuestion.promptKo
          : menuQuestion
            ? `${copy.globe.cicadaAgentClarifyIntro} ${menuQuestion.promptKo}`
            : resolved.questions[0]?.promptKo ?? copy.globe.cicadaAgentClarifyIntro;
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: clarifyText,
        });
        publishGeoOntologyGraph(
          buildClarifyingOntologyGraph({
            contextEventId,
            anchorPlaceName,
            themeKo:
              resolved.questions.find((row) => row.slot === "menuFocus")?.choices[0]
                ?.label ?? copy.globe.geoOntologyRootEatery,
          }),
        );
        writeContextConditionPending(contextEventId, {
          triggerMessage,
          questions: resolved.questions,
          answers: resolved.answers,
          spec: null,
          updatedAtIso: new Date().toISOString(),
        });
        onQuestionsChange?.(resolved.questions);
        return null;
      }

      lastTriggerRef.current = pipelineMessage;
      setLastSpec(resolved.spec);

      const priorContract = readScoutContract(contextEventId);
      const selectedAnchor = readScoutSelectedAnchor(contextEventId);
      const nextCategory = scoutCategoryFromSpec(resolved.spec);
      const isChained =
        Boolean(selectedAnchor) &&
        (followUpTurn ||
          (priorContract != null && priorContract.category !== nextCategory));
      const chainIndex = isChained ? (priorContract?.chainIndex ?? 0) + 1 : 0;
      const lensSessionForContract = readDiscoveryLensSession(contextEventId);
      const scoutContract = wrapScoutContract({
        contextEventId,
        spec: resolved.spec,
        chainIndex,
        anchorRef: isChained && selectedAnchor
          ? {
              scoutId: selectedAnchor.scoutId,
              placeId: selectedAnchor.placeId,
              lat: selectedAnchor.lat,
              lng: selectedAnchor.lng,
              title: selectedAnchor.title ?? null,
            }
          : null,
        lensId: lensSessionForContract?.activeLensId ?? null,
      });
      const preGate = assertScoutContractGate({ contract: scoutContract });
      if (!preGate.ok) {
        const messageKo =
          primaryScoutViolationMessage(preGate) ??
          copy.globe.contextConditionPinEmpty;
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: messageKo,
        });
        toast.message(messageKo);
        setContextAgentSessionPhase("awaiting_human");
        return null;
      }
      writeScoutContract(contextEventId, scoutContract);

      const nearbyPov = resolveDiscoveryOriginForContext(contextEventId);
      if (
        nearbyPov &&
        (nextCategory === "activity" || nextCategory === "amenity")
      ) {
        ensureScoutAnchorFromDiscoveryPov(contextEventId, nearbyPov);
        if (nextCategory === "activity") {
          ensureNeighborhoodLensForActivityScout(contextEventId, nearbyPov);
          flyGlobeToDiscoveryLenses(globeRef, {
            lenses: [
              {
                center: { lat: nearbyPov.lat, lng: nearbyPov.lng },
                radiusM: nearbyPov.radiusM,
              },
            ],
          });
        }
      }

      const lensSessionNow = readDiscoveryLensSession(contextEventId);
      const wantsLodging =
        resolved.spec.resourceTypes.includes("hotel") ||
        isLodgingDiscoveryMessage(pipelineMessage);
      if (
        wantsLodging &&
        lensSessionNow &&
        lensSessionNow.lenses.length >= 2
      ) {
        markDiscoveryLensPickPending({
          session: lensSessionNow,
          pendingSearchKind: "lodging",
        });
        const pickKo = lensPickPromptKo(readDiscoveryLensSession(contextEventId));
        if (pickKo) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: pickKo,
          });
        }
        setContextAgentSessionPhase("awaiting_human");
        return null;
      }

      beginContextAgentWork("exploring");
      setContextAgentSessionPhase("scouting");
      // Strict domains (activity/amenity) may come back empty because the
      // Category Integrity Guard rejected off-domain junk. Don't dead-end with a
      // generic "no fit" — answer conversationally and offer convergence chips.
      const strictDomain =
        resolved.spec.resourceTypes.includes("activity") ||
        resolved.spec.resourceTypes.includes("amenity");
      const outcome = await executeWithSpec({
        triggerMessage: pipelineMessage,
        spec: resolved.spec,
        suppressEmptyMessage: strictDomain,
      });
      if (!outcome && strictDomain) {
        await emitStrictDomainEmptyFollowup(
          resolved.spec,
          pipelineMessage,
          mergedAnswers,
          askedAxisIds,
        );
        return null;
      }

      // Deepen once: results become the next trigger. After a cluster activity
      // search, offer ONE tidy row of deeper facets (테마파크 · 포토스팟 · 야경).
      // Capped at a single hop so the chat stays clean — no runaway drill-down.
      const activityCluster = resolved.spec.activityCluster ?? [];
      if (
        outcome &&
        priorHops < 1 &&
        resolved.spec.resourceTypes.includes("activity") &&
        activityCluster.length > 0
      ) {
        const nextHop = buildActivityNextHopQuestion({
          region: anchorPlaceName,
          cluster: activityCluster,
          promptKo: copy.globe.contextConditionNextHopPrompt,
        });
        if (nextHop) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: nextHop.promptKo,
          });
          writeContextConditionPending(contextEventId, {
            triggerMessage: pipelineMessage,
            questions: [nextHop],
            answers: {},
            spec: null,
            updatedAtIso: new Date().toISOString(),
            convergenceHops: priorHops + 1,
            convergenceNextHop: true,
          });
          onQuestionsChange?.([nextHop]);
        }
      }
      return outcome;
    },
    [
      anchorLat,
      anchorLng,
      anchorPlaceName,
      contextEventId,
      emitStrictDomainEmptyFollowup,
      executeWithSpec,
      globeRef,
      lastRecommendations,
      lastSpec,
      onQuestionsChange,
    ],
  );

  const runTripTriggerAfterIntake = useCallback(
    async (input: { triggerMessage: string; destinationLabel: string }) => {
      const text = input.triggerMessage.trim();
      if (!text) {
        return;
      }
      if (operatorBlueprint && isBroadTripPackageMessage(text)) {
        await executeParallelOnboarding({
          triggerMessage: text,
          parallelNodeIds: [...TRAVEL_ONBOARDING_PARALLEL_NODE_IDS],
          destinationLabel: input.destinationLabel,
        });
        return;
      }
      await resolveAndMaybeExecute(text);
    },
    [executeParallelOnboarding, operatorBlueprint, resolveAndMaybeExecute],
  );

  const tryOpenIntakeForMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) {
        return false;
      }
      const event = findLifeEventCandidate(contextEventId);
      const offer = resolveIntakeOffer(
        buildIntakeContext({
          contextEventId,
          message: trimmed,
          event,
          blueprint: operatorBlueprint,
          destinationConfirmed,
        }),
      );
      if (!offer) {
        return false;
      }
      const sheet = buildIntakeSheetFromOffer(offer);
      if (!sheet || sheet.fields.length === 0) {
        return false;
      }
      appendIntakeSlotsComposeTurn(contextEventId, {
        domainId: sheet.domainId,
        hint: sheet.hint,
        submitLabel: sheet.submitLabel,
        pendingTrigger: trimmed,
        fields: sheet.fields,
      });
      return true;
    },
    [contextEventId, destinationConfirmed, operatorBlueprint],
  );

  const openLodgingIntakeEditInThread = useCallback(() => {
    const event = findLifeEventCandidate(contextEventId);
    const slots = readLodgingBookingSlots(event);
    const sheet = buildLodgingIntakeEditOffer(slots);
    appendIntakeSlotsComposeTurn(contextEventId, {
      domainId: sheet.domainId,
      hint: sheet.hint,
      submitLabel: sheet.submitLabel,
      pendingTrigger: message.trim() || "숙소",
      fields: sheet.fields,
    });
  }, [contextEventId, message]);

  const runLodgingTriggerAfterSlotSave = useCallback(
    async (triggerMessage: string) => {
      const text = triggerMessage.trim();
      if (!text) {
        return;
      }
      setBusy(true);
      try {
        await resolveAndMaybeExecute(text);
        setMessage("");
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [resolveAndMaybeExecute],
  );

  const handleAskChipPick = useCallback(
    async (input: AskChipPickInput) => {
      if (busy) {
        return;
      }
      const pendingTrigger = input.pendingTrigger.trim();
      if (!pendingTrigger) {
        return;
      }
      setBusy(true);
      try {
        const priorEvent = findLifeEventCandidate(contextEventId);
        applyTripIntakeAskChip({
          contextEventId,
          event: priorEvent,
          message: pendingTrigger,
          chip: { gapId: input.gapId as TripIntakeGapId, value: input.value },
          userLat,
          userLng,
        });
        markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
          chipId: input.chipId,
          summaryKo: copy.globe.tripIntakeAskChipApplied(input.labelKo),
        });
        runOneShotLodgingPrepClient({
          message: pendingTrigger,
          contextEventId,
          event: findLifeEventCandidate(contextEventId),
          userLat,
          userLng,
        });
        await resolveAndMaybeExecute(pendingTrigger);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, contextEventId, resolveAndMaybeExecute, userLat, userLng],
  );

  const handleIntakeSlotsSubmit = useCallback(
    async (input: IntakeSlotsSubmitInput) => {
      const turn = readContextAgentComposeThread(contextEventId).find(
        (row) => row.id === input.turnId,
      );
      const pendingTrigger =
        turn?.role === "assistant" &&
        turn.kind === "intake_slots" &&
        turn.payload.status === "open"
          ? turn.payload.pendingTrigger.trim()
          : "";

      if (input.domainId === TRIP_INTAKE_DOMAIN_ID) {
        const parsed = parseTripIntakeSubmitValues(input.values);
        writeTripIntakeSlots({
          contextEventId,
          ...parsed,
        });
        const summaryKo = copy.globe.tripIntakeComposeLine(parsed.destinationLabel);
        markIntakeSlotsComposeTurnSubmitted(contextEventId, input.turnId, summaryKo);
        const nextTrigger =
          pendingTrigger || message.trim() || parsed.destinationLabel;
        await runTripTriggerAfterIntake({
          triggerMessage: nextTrigger,
          destinationLabel: parsed.destinationLabel,
        });
        return;
      }

      if (input.domainId === LODGING_INTAKE_DOMAIN_ID) {
        const parsed = parseLodgingIntakeSubmitValues(input.values);
        const updated = writeLodgingBookingSlots({
          contextEventId,
          ...parsed,
        });
        const slots = readLodgingBookingSlots(updated);
        const chipLabels = buildLodgingBookingSlotChipLabels(slots, updated);
        const summaryKo = chipLabels.join(" · ");
        markIntakeSlotsComposeTurnSubmitted(
          contextEventId,
          input.turnId,
          summaryKo || copy.globe.lodgingSlotApply,
        );
        const nextTrigger =
          pendingTrigger ||
          message.trim() ||
          updated.place?.trim() ||
          "숙소";
        await runLodgingTriggerAfterSlotSave(nextTrigger);
      }
    },
    [
      contextEventId,
      message,
      runLodgingTriggerAfterSlotSave,
      runTripTriggerAfterIntake,
    ],
  );

  useEffect(() => {
    registerIntakeSubmitHandler?.(handleIntakeSlotsSubmit);
  }, [handleIntakeSlotsSubmit, registerIntakeSubmitHandler]);

  useEffect(() => {
    registerAskChipPickHandler?.(handleAskChipPick);
  }, [handleAskChipPick, registerAskChipPickHandler]);

  const handleSubmit = useCallback(async () => {
    if (busy) {
      return;
    }
    const text = message.trim();
    if (!text && !lastSpec) {
      return;
    }
    if (text) {
      onUserCompose?.(text);
    }
    if (text && !isLodgingPrepUtterance(text) && tryOpenIntakeForMessage(text)) {
      setMessage("");
      return;
    }
    setBusy(true);
    try {
      // Operator turn: READ SSOT → GATE fixed tool → ACT (one tool).
      // @see docs/RIMVIO_OPERATOR_TURN.md
      if (text) {
        const composeTail = readContextAgentComposeThread(contextEventId)
          .slice(-6)
          .map((turn) => ({ role: turn.role, text: turn.text }));
        const ssot = readOperatorTurnSsot({
          contextEventId,
          composeTail,
          hasActiveSpec: lastSpec != null,
        });
        const operatorEvent = findLifeEventCandidate(contextEventId);
        let plan = gateOperatorTurnSync({
          text,
          ssot,
          event: operatorEvent,
          userLat,
          userLng,
        });

        if (plan.tool === "ask_chips") {
          appendOperatorAskChipsComposeTurn(contextEventId, {
            hint: copy.globe.tripIntakeAskHint,
            pendingTrigger: text,
            chips: plan.chips,
          });
          setMessage("");
          return;
        }

        if (plan.tool === "lens_command") {
          const lensResult = await applyLensCommand({
            contextEventId,
            text,
            region: anchorPlaceName,
          });
          if (lensResult.handled) {
            const activeLensId = readDiscoveryLensSession(contextEventId)?.activeLensId;
            if (activeLensId) {
              void prefetchDiscoveryLensById({
                contextEventId,
                lensId: activeLensId,
              });
            }
            if (lensResult.replyKo) {
              appendContextAgentComposeTurn(contextEventId, {
                role: "assistant",
                kind: "text",
                text: lensResult.replyKo,
              });
            }
            setMessage("");
            return;
          }
          plan = gateOperatorTurnSync({
            text,
            ssot,
            skipLens: true,
            event: operatorEvent,
            userLat,
            userLng,
          });
        }

        if (plan.tool === "filter_inventory") {
          dispatchGlobeResourceReelKindFilter({
            contextEventId,
            kindFilter: plan.kindFilter,
          });
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: resourceReelKindFilterReplyKo(plan.kindFilter),
          });
          setMessage("");
          return;
        }

        if (plan.tool === "scout" || plan.tool === "defer_classify") {
          // Broad travel onboarding → stay+explore (and departure announce) in parallel.
          if (operatorBlueprint && text) {
            const parallelGate = evaluateOnboardingParallelException({
              blueprint: operatorBlueprint,
              userMessage: text,
              destinationConfirmed,
            });
            if (parallelGate.allowed) {
              await executeParallelOnboarding({
                triggerMessage: text,
                parallelNodeIds: parallelGate.parallelNodeIds,
                destinationLabel: parallelGate.destinationLabel,
              });
              return;
            }
          }
        }

        if (plan.tool === "scout") {
          runOneShotLodgingPrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
            userLat,
            userLng,
          });
          // fall through to scout / refine / resolve below
        } else if (plan.tool === "defer_classify") {
          const history = composeTail.map((turn) => `${turn.role}: ${turn.text}`);
          const classification = await classifyInput({
            text,
            region: anchorPlaceName,
            history,
            hasActiveResults: lastRecommendations.length > 0,
          });
          const classified = mapClassifyToOperatorTool(classification.category);
          if (classified.tool === "small_talk") {
            const small = await generateSmallTalkReply({
              text,
              region: anchorPlaceName,
              history: composeTail,
              recentSearchKo: lastSpec?.activityFocus ?? null,
              scopeId: contextEventId,
            });
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: small.replyKo,
            });
            setMessage("");
            setContextAgentSessionPhase("awaiting_human");
            return;
          }
          if (classified.tool === "task_injection") {
            if (await tryPublishActionInjection(text)) {
              return;
            }
            // fall through to scout rather than dead-ending
          }
        } else if (plan.tool === "noop") {
          setMessage("");
          return;
        }
      }
      if (
        lastSpec &&
        lastRecommendations.length > 0 &&
        !isFollowUpDiscoveryTurn(text, lastRecommendations) &&
        isLocalDiscoveryRefinement(text) &&
        (await runPalantirRefine(text))
      ) {
        return;
      }

      const pending = readContextConditionPending(contextEventId);
      const followUp = isFollowUpDiscoveryTurn(text, lastRecommendations);
      if (followUp) {
        clearContextConditionPending(contextEventId);
      }
      await resolveAndMaybeExecute(
        text || pending?.triggerMessage || "",
        followUp ? undefined : pending?.answers,
      );
    } finally {
      setBusy(false);
      finishContextAgentWork();
    }
  }, [
    anchorPlaceName,
    busy,
    contextEventId,
    destinationConfirmed,
    executeParallelOnboarding,
    lastSpec,
    lastRecommendations,
    message,
    onUserCompose,
    operatorBlueprint,
    resolveAndMaybeExecute,
    runPalantirRefine,
    tryOpenIntakeForMessage,
    tryPublishActionInjection,
    userLat,
    userLng,
  ]);

  handleSubmitRef.current = handleSubmit;

  /** Google Maps–like: debounced auto-search for instant POI / ready lodging while typing. */
  useEffect(() => {
    const trimmed = message.trim();
    const currentEvent = findLifeEventCandidate(contextEventId);
    const allowLodgingAutoSearch =
      isInstantLodgingSearch(trimmed) ||
      (isLodgingBookingQuery(trimmed) &&
        hasCompleteLodgingBookingSlots(readLodgingBookingSlots(currentEvent)));
    const allowEateryAutoSearch = isInstantEaterySearch(trimmed);
    if (
      busy ||
      !trimmed ||
      (!matchesInstantPoiTyping(message) &&
        !allowLodgingAutoSearch &&
        !matchesInstantEateryTyping(message))
    ) {
      return;
    }
    if (
      !resolveInstantPoiFocus(trimmed) &&
      !allowLodgingAutoSearch &&
      !allowEateryAutoSearch
    ) {
      return;
    }
    if (
      typeof anchorLat !== "number" ||
      typeof anchorLng !== "number" ||
      !Number.isFinite(anchorLat) ||
      !Number.isFinite(anchorLng)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (lastInstantPoiSearchRef.current === trimmed) {
        return;
      }
      lastInstantPoiSearchRef.current = trimmed;
      void handleSubmitRef.current();
    }, INSTANT_POI_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [message, busy, anchorLat, anchorLng, contextEventId]);

  const submitTrigger = useCallback(
    async (triggerMessage: string) => {
      const text = triggerMessage.trim();
      if (!text || busy) {
        return;
      }
      onUserCompose?.(text);
      setBusy(true);
      try {
        const composeTail = readContextAgentComposeThread(contextEventId)
          .slice(-6)
          .map((turn) => ({ role: turn.role, text: turn.text }));
        const ssot = readOperatorTurnSsot({
          contextEventId,
          composeTail,
          hasActiveSpec: lastSpec != null,
        });
        const operatorEvent = findLifeEventCandidate(contextEventId);
        const plan = gateOperatorTurnSync({
          text,
          ssot,
          event: operatorEvent,
          userLat,
          userLng,
        });
        if (plan.tool === "ask_chips") {
          appendOperatorAskChipsComposeTurn(contextEventId, {
            hint: copy.globe.tripIntakeAskHint,
            pendingTrigger: text,
            chips: plan.chips,
          });
          return;
        }
        if (!isLodgingPrepUtterance(text) && tryOpenIntakeForMessage(text)) {
          return;
        }
        if (operatorBlueprint) {
          const parallelGate = evaluateOnboardingParallelException({
            blueprint: operatorBlueprint,
            userMessage: text,
            destinationConfirmed,
          });
          if (parallelGate.allowed) {
            await executeParallelOnboarding({
              triggerMessage: text,
              parallelNodeIds: parallelGate.parallelNodeIds,
              destinationLabel: parallelGate.destinationLabel,
            });
            return;
          }
        }
        if (await tryPublishActionInjection(text)) {
          return;
        }
        if (plan.tool === "scout" || isLodgingPrepUtterance(text)) {
          runOneShotLodgingPrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
            userLat,
            userLng,
          });
        }
        await resolveAndMaybeExecute(text);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [
      busy,
      contextEventId,
      destinationConfirmed,
      executeParallelOnboarding,
      lastSpec,
      onUserCompose,
      operatorBlueprint,
      resolveAndMaybeExecute,
      tryOpenIntakeForMessage,
      tryPublishActionInjection,
      userLat,
      userLng,
    ],
  );

  const submitRefinement = useCallback(
    async (refineMessage: string) => {
      const text = refineMessage.trim();
      if (!text || busy || !lastSpec) {
        return;
      }
      onUserCompose?.(text);
      setBusy(true);
      try {
        await runPalantirRefine(text);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, lastSpec, onUserCompose, runPalantirRefine],
  );

  const applyExplorationModeChoice = useCallback(
    async (mode: ExplorationMode) => {
      writeExplorationModeOverride(contextEventId, mode);
      if (busy || !lastSpec) {
        return;
      }
      const triggerMessage =
        [...readContextAgentComposeThread(contextEventId)]
          .reverse()
          .find((turn) => turn.role === "user")?.text ??
        (mode === "diffuse"
          ? copy.globe.explorationModeDiffuseChip
          : copy.globe.explorationModeConvergentChip);
      const vibe = mode === "diffuse" ? ("local" as const) : ("popular" as const);
      const nextSpec = { ...lastSpec, vibe };
      const excludePlaceIds =
        mode === "diffuse"
          ? lastRecommendations.map((row) => row.placeId)
          : undefined;
      onUserCompose?.(triggerMessage);
      setBusy(true);
      beginContextAgentWork("exploring");
      try {
        await executeWithSpec({
          triggerMessage,
          spec: nextSpec,
          excludePlaceIds,
        });
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [
      busy,
      contextEventId,
      executeWithSpec,
      lastRecommendations,
      lastSpec,
      onUserCompose,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      submitTrigger,
      submitRefinement,
      applyExplorationMode: applyExplorationModeChoice,
      hasLastBatch: () => lastBatch != null,
      hasActiveSpec: () => lastSpec != null,
    }),
    [lastBatch, lastSpec, applyExplorationModeChoice, submitRefinement, submitTrigger],
  );

  const handleQuestionChoice = useCallback(
    async (choice: LocalDiscoveryQuestionChoice) => {
      if (busy) {
        return;
      }
      const pending = readContextConditionPending(contextEventId);
      const triggerMessage =
        choice.slot === "activityFocus" ? choice.value : pending?.triggerMessage ?? message.trim();
      if (!triggerMessage) {
        return;
      }
      const answers = applyQuestionChoice({
        answers: pending?.answers ?? {},
        choice,
      });
      setBusy(true);
      try {
        // Natural path: choice → lens rings → scout activities immediately.
        // Prefetch fills the reel in parallel; do not block map pins on it.
        const spawned = await maybeSpawnDiscoveryLensesFromChoice({
          contextEventId,
          choice,
          region: anchorPlaceName,
          hintLat: anchorLat,
          hintLng: anchorLng,
        });
        if (spawned) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: buildDiscoveryLensSpawnAnnouncement({
              session: spawned,
              choice,
            }),
          });
          flyGlobeToDiscoveryLenses(globeRef, { lenses: spawned.lenses });
          void prefetchAllDiscoveryLenses({ contextEventId }).then((prefetchKo) => {
            if (!prefetchKo) {
              return;
            }
            // Only soft-confirm if scout has not already closed the loop.
            if (!readContextConditionLastBatch(contextEventId)) {
              appendContextAgentComposeTurn(contextEventId, {
                role: "assistant",
                kind: "text",
                text: prefetchKo,
              });
            }
          });
        }
        await resolveAndMaybeExecute(triggerMessage, answers);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [
      anchorLat,
      anchorLng,
      anchorPlaceName,
      busy,
      contextEventId,
      globeRef,
      message,
      resolveAndMaybeExecute,
    ],
  );

  const activateDiscoveryLens = useCallback(
    (lensId: DiscoveryLensId) => {
      const session = readDiscoveryLensSession(contextEventId);
      if (!session) {
        return;
      }
      setActiveDiscoveryLens({ session, lensId });
      publishDiscoveryLensAction(contextEventId, {
        type: "activate",
        lensId,
        rescout: true,
      });
    },
    [contextEventId],
  );

  useEffect(() => {
    registerQuestionHandler?.(handleQuestionChoice);
  }, [handleQuestionChoice, registerQuestionHandler]);

  useEffect(() => {
    registerLensHandler?.(activateDiscoveryLens);
  }, [activateDiscoveryLens, registerLensHandler]);

  const handleDismissBatch = useCallback(() => {
    if (!lastBatch) {
      return;
    }
    dismissContextConditionPinBatch({
      contextEventId,
      batchId: lastBatch.batchId,
    });
    clearContextConditionLastBatch(contextEventId);
    clearScoutRevealPending(contextEventId);
    setLastBatch(null);
    setLastSpec(null);
    setLastRecommendations([]);
    onRecommendationsChange?.([]);
    setContextAgentSessionPhase("briefing");
  }, [contextEventId, lastBatch, onRecommendationsChange]);

  const lodgingSlotDefaults = readLodgingBookingSlots(findLifeEventCandidate(contextEventId));
  const lodgingSlotChipLabels = useMemo(() => {
    if (!lodgingSlotDefaults.checkInIso || !lodgingSlotDefaults.checkOutIso) {
      return [];
    }
    return buildLodgingBookingSlotChipLabels(
      lodgingSlotDefaults,
      findLifeEventCandidate(contextEventId),
    );
  }, [
    contextEventId,
    lodgingSlotDefaults.checkInIso,
    lodgingSlotDefaults.checkOutIso,
    lodgingSlotDefaults.guestCount,
    lodgingSlotDefaults.roomCount,
  ]);

  return (
    <div
      className={cn(className)}
      data-globe-context-condition-pin-bar
    >
      {lodgingSlotChipLabels.length > 0 ? (
        <GlobeLodgingBookingSlotChips
          className="mb-2"
          chips={lodgingSlotChipLabels}
          onEdit={openLodgingIntakeEditInThread}
        />
      ) : null}
      <div className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 ring-1 ring-black/[0.04]">
        <input
          type="text"
          value={message}
          onChange={(event) => {
            const next = event.target.value;
            setMessage(next);
            if (!next.trim()) {
              lastInstantPoiSearchRef.current = "";
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={copy.globe.contextConditionPinPlaceholder}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none disabled:opacity-60"
          aria-label={copy.globe.contextConditionPinPlaceholder}
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy || !message.trim()}
          className="shrink-0 rounded-lg bg-[#1d1d1f] px-2.5 py-1 text-[11px] font-semibold text-white active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "…" : copy.globe.contextConditionPinSubmit}
        </button>
      </div>

      {lastBatch ? (
        <button
          type="button"
          onClick={handleDismissBatch}
          className="mt-1.5 px-0.5 text-[10px] font-medium text-[#86868b] active:text-[#ff6b4a]"
        >
          {copy.globe.contextConditionPinDismiss}
        </button>
      ) : null}
    </div>
  );
});
