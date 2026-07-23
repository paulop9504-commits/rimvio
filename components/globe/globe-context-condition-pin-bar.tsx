"use client";

import type { RefObject } from "react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  GlobeContextConditionComposeInput,
  type GlobeContextConditionComposeInputHandle,
} from "@/components/globe/globe-context-condition-compose-input";
import { GlobeLodgingBookingSlotChips } from "@/components/globe/globe-lodging-booking-slot-chips";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { copy } from "@/lib/copy/human-ko";
import { tryRunContextNlActionAsync } from "@/lib/action-planner";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { isGlobeContextConditionPanelOpen } from "@/lib/globe/context-condition-ai/globe-context-condition-panel-bridge";
import {
  flyGlobeToDiscoveryLenses,
  flyGlobeToSessionGraphDiff,
} from "@/lib/globe/context-agent/snap-globe-to-context-agent-anchor";
import { hasProvisionalContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
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
  extractBookingTargetLabel,
  placeLabelMatchesQuery,
  publishContextActionInjection,
  resolveContextActionIntent,
} from "@/lib/globe/context-action-injection";
import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";
import {
  dispatchGlobeLodgingFocus,
  dispatchGlobeLodgingFocusStage,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import {
  clearContextConditionPending,
  readContextConditionPending,
  writeContextConditionPending,
} from "@/lib/globe/context-condition-ai/context-condition-pending-spec-store";
import {
  clearScoutTurnConstraints,
  mergeScoutTurnConstraints,
  readScoutTurnConstraints,
  shouldCarryPriorEateryFocus,
  writeScoutTurnConstraints,
} from "@/lib/globe/context-condition-ai/scout-turn-constraints";
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
  isInstantPoiSearch,
} from "@/lib/globe/context-condition-ai/instant-poi-search";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import {
  isInstantEaterySearch,
} from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
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
  supersedePriorScoutFeedGates,
} from "@/lib/globe/assistant";
import { readActiveDiscoveryExecution, writeActiveDiscoveryExecution, clearActiveDiscoveryExecution } from "@/lib/globe/discovery-execution/read-active-discovery-execution";
import { isConcreteCuisineEateryFocus } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { clearDiscoveryLensSession } from "@/lib/globe/discovery-lens/lens-session-bridge";
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
import {
  buildScoutNarrationPlan,
  narrateScoutPlan,
  publishScoutNarration,
  completeScoutNarration,
  publishScoutNarrationLiveStep,
  type ScoutNarration,
} from "@/lib/globe/narrator-engine";
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
import { resolveDiscoveryOriginFromUtterance } from "@/lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
import { observeScoutSeedLearning } from "@/lib/seed-learning";
import { isGlobeComposeInputFocused } from "@/lib/globe/compose-input-focus";
import {
  hasCompleteLodgingBookingSlots,
  isLodgingBookingQuery,
  readLodgingBookingSlots,
  writeLodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import { buildLodgingBookingSlotChipLabels } from "@/lib/globe/context-hub/build-lodging-booking-slot-chip-labels";
import {
  applyLodgingStayRevisePending,
  cancelLodgingStayRevisePending,
} from "@/lib/globe/context-hub/apply-lodging-stay-revise";
import { readLodgingStayRevisePending } from "@/lib/globe/context-hub/lodging-stay-revise-pending-store";
import {
  isLodgingStayReviseAffirmUtterance,
  isLodgingStayReviseRejectUtterance,
} from "@/lib/globe/context-hub/lodging-stay-revise-affirm";
import {
  applySoftConfirmPending,
  cancelSoftConfirmPending,
} from "@/lib/globe/soft-confirm/apply-soft-confirm-pending";
import {
  isSoftConfirmAffirmUtterance,
  isSoftConfirmRejectUtterance,
} from "@/lib/globe/soft-confirm/soft-confirm-affirm";
import { readSoftConfirmPending } from "@/lib/globe/soft-confirm/soft-confirm-pending-store";
import {
  clearClarifyLessPending,
  buildClarifyResumeUtterance,
  readClarifyLessPending,
} from "@/lib/rule-engine/clarify-less-pending-store";
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
  clearScoutContract,
  primaryScoutViolationMessage,
  readScoutContract,
  readScoutSelectedAnchor,
  reelKindAllowedForContract,
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
  claimOperatorAutoRun,
  subscribeOperatorAutoRun,
} from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { offerScoutFailRecovery } from "@/lib/globe/operator-turn/offer-scout-fail-recovery-client";
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
import {
  applyTripExperienceAskChip,
  isTripExperienceUtterance,
  planOneShotTripExperiencePrep,
  runOneShotTripExperiencePrepClient,
  runTripExperienceParallelScouts,
  type TripExperienceGapId,
} from "@/lib/globe/trip-experience";
import {
  isLodgingPrepUtterance,
  runOneShotLodgingPrepClient,
} from "@/lib/globe/lodging-prep";
import {
  isFlightPrepUtterance,
  tryCompleteFlightPrepClient,
} from "@/lib/globe/flight-prep";
import {
  applyTransitPrepAskChip,
  isTransitPrepUtterance,
  tryCompleteTransitPrepClient,
  type TransitPrepGapId,
} from "@/lib/globe/transit-prep";
import {
  applyFinancePrepAskChip,
  isFinancePrepUtterance,
  tryCompleteFinancePrepClient,
  type FinancePrepGapId,
} from "@/lib/globe/finance-prep";
import { applyResearchApprovalChip } from "@/lib/research-engine/apply-research-approval-chip";
import { resolveOperatorAskChipDomain } from "@/lib/globe/operator-turn/resolve-operator-ask-chip-domain";
import { recordEngineScoutFailureClient } from "@/lib/engine/record-engine-lifecycle";
import { resolveDiscoveryEngineId } from "@/lib/engine/resolve-discovery-engine-id";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { INGRESS_CONVERGE_NEW_VALUE } from "@/lib/globe-ingress/offer-ingress-converge-chips-client";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";

/** Prefer toast over stacking Pending Reality on Context AI. */
function openFieldQueueOrDefer(contextEventId: string): void {
  if (isGlobeContextConditionPanelOpen()) {
    toast.message(copy.globe.contextAiFieldDeferToast);
    return;
  }
  openFieldDashboardIngress({
    tab: "queue",
    primaryEventId: contextEventId,
  });
}

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
  submitTrigger: (
    message: string,
    options?: { expressReady?: boolean },
  ) => Promise<void>;
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
  onUserCompose?: (message: string) => boolean | void;
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
    triggerMessage: input.triggerMessage,
    scoutKind: enrichment.scoutKind,
    aiInsightKo: enrichment.aiInsightKo,
    tipsKo: enrichment.tipsKo,
    highlightTitles: enrichment.highlightTitles,
    videoContext: enrichment.videoContext,
    correctionChips: enrichment.correctionChips,
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
export const GlobeContextConditionPinBar = memo(forwardRef<
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
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  /** Leaf composer — keystrokes stay off this ~3k-line tree. */
  const composeInputRef = useRef<GlobeContextConditionComposeInputHandle>(null);
  const readComposerMessage = useCallback(
    () => composeInputRef.current?.getValue() ?? "",
    [],
  );
  const clearComposerMessage = useCallback(() => {
    composeInputRef.current?.clear();
  }, []);
  const processPhaseNarrationRef = useRef<{
    raf: number | null;
    contextEventId: string;
    turnId: string | null;
    stepId: string;
    textKo: string;
  }>({
    raf: null,
    contextEventId: "",
    turnId: null,
    stepId: "",
    textKo: "",
  });
  const onLensSessionChangeRef = useRef(onLensSessionChange);
  onLensSessionChangeRef.current = onLensSessionChange;
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

  useEffect(() => {
    return subscribeDiscoveryLensSession((session) => {
      if (isGlobeComposeInputFocused()) {
        return;
      }
      if (session && session.contextEventId !== contextEventId) {
        return;
      }
      onLensSessionChangeRef.current?.(session);
    });
  }, [contextEventId]);

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
    // Hydrate once per event — geocode lat/lng must not re-push recommendations mid-IME.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextEventId gates hydrate
  }, [contextEventId, hydrateFromBatch]);

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
      let intent = resolveContextActionIntent({
        message: triggerMessage,
        pinnedResourceKind,
      });
      if (!intent) {
        return false;
      }

      const batch = readContextConditionLastBatch(contextEventId);
      const namedLabel = extractBookingTargetLabel(triggerMessage);
      const namedCandidate =
        namedLabel && batch?.recommendations
          ? batch.recommendations.find(
              (row) =>
                (row.kind === "lodging" || row.kind === "eatery") &&
                placeLabelMatchesQuery(row.title, namedLabel),
            )
          : null;

      // Named place wins over default lodging/eatery kind.
      if (namedCandidate) {
        intent = {
          ...intent,
          resourceKind: namedCandidate.kind === "eatery" ? "eatery" : "lodging",
          kind:
            namedCandidate.kind === "eatery"
              ? intent.kind.startsWith("pay")
                ? "pay_eatery"
                : "book_eatery"
              : intent.kind.startsWith("pay")
                ? "pay_lodging"
                : "book_lodging",
        };
      }

      const needsPin =
        (intent.resourceKind === "lodging" && !pinned.lodging) ||
        (intent.resourceKind === "eatery" && !pinned.eatery) ||
        Boolean(namedCandidate);
      if (needsPin) {
        const candidate =
          namedCandidate ??
          batch?.recommendations?.find(
            (row) => row.kind === intent!.resourceKind,
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
            // Named lodging may only exist in inventory — try pin via inventory match.
            if (namedLabel && intent.resourceKind === "lodging") {
              const lodgingRow = readLodgingInventoryRows(event).find((row) =>
                placeLabelMatchesQuery(row.name ?? "", namedLabel),
              );
              if (lodgingRow?.placeId) {
                try {
                  pinContextConditionRecommendation({
                    eventId: contextEventId,
                    recommendation: {
                      kind: "lodging",
                      placeId: lodgingRow.placeId,
                      title: lodgingRow.name ?? namedLabel,
                    },
                  });
                  event = findLifeEventCandidate(contextEventId) ?? event;
                } catch {
                  // fall through
                }
              }
            }
            if (namedLabel && intent.resourceKind === "eatery") {
              const eateryRow = readEateryInventoryRows(event).find((row) =>
                placeLabelMatchesQuery(row.name ?? "", namedLabel),
              );
              if (eateryRow?.placeId) {
                try {
                  pinContextConditionRecommendation({
                    eventId: contextEventId,
                    recommendation: {
                      kind: "eatery",
                      placeId: eateryRow.placeId,
                      title: eateryRow.name ?? namedLabel,
                    },
                  });
                  event = findLifeEventCandidate(contextEventId) ?? event;
                } catch {
                  // fall through
                }
              }
            }
          }
        } else if (namedLabel && intent.resourceKind === "lodging") {
          const lodgingRow = readLodgingInventoryRows(event).find((row) =>
            placeLabelMatchesQuery(row.name ?? "", namedLabel),
          );
          if (lodgingRow?.placeId) {
            try {
              pinContextConditionRecommendation({
                eventId: contextEventId,
                recommendation: {
                  kind: "lodging",
                  placeId: lodgingRow.placeId,
                  title: lodgingRow.name ?? namedLabel,
                },
              });
              event = findLifeEventCandidate(contextEventId) ?? event;
            } catch {
              // fall through
            }
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

      // Open reservation surface for lodging book/pay — don't keep scouting.
      if (intent.resourceKind === "lodging" && built.target.placeId) {
        dispatchGlobeLodgingFocus({
          resourceId: `${contextEventId}:lodging:${built.target.placeId}`,
          carouselIndex: 0,
          source: "discovery_card",
        });
        dispatchGlobeLodgingFocusStage(true);
      }

      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: copy.globe.contextActionInjectionAssistLine(built.target.title),
      });
      clearComposerMessage();
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
        discoveryOrigin: resolveDiscoveryOriginFromUtterance(
          input.triggerMessage,
          resolveDiscoveryOriginForContext(contextEventId),
        ),
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
      clearComposerMessage();
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcome.recommendations);
      clearContextConditionPending(contextEventId);
      writeScoutTurnConstraints(
        contextEventId,
        mergeScoutTurnConstraints({
          prior: readScoutTurnConstraints(contextEventId),
          message: input.triggerMessage,
          spec: outcome.spec,
        }),
      );
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

  const executeTripExperienceParallelScout = useCallback(
    async (input: { triggerMessage: string }): Promise<ContextConditionAnchorPinOutcome | null> => {
      const text = input.triggerMessage.trim();
      if (!text || !isTripExperienceUtterance(text)) {
        return null;
      }
      const prep = runOneShotTripExperiencePrepClient({
        message: text,
        contextEventId,
        event: findLifeEventCandidate(contextEventId),
        userLat,
        userLng,
      });
      if (!prep?.plan.readyForScout) {
        return null;
      }

      dispatchGlobeLodgingDiscoveryClose();
      if (lastBatch) {
        dismissContextConditionPinBatch({
          contextEventId,
          batchId: lastBatch.batchId,
        });
        clearContextConditionLastBatch(contextEventId);
        clearScoutRevealPending(contextEventId);
      }
      writeExplorationModeOverride(contextEventId, "diffuse");

      const destLabel =
        prep.plan.experienceState.destinationLabel?.trim() ||
        anchorPlaceName.trim() ||
        "여행";
      setContextAgentSessionPhase("scouting");
      beginContextAgentWork("exploring");
      appendContextAgentComposeTurn(contextEventId, {
        role: "assistant",
        kind: "text",
        text: copy.globe.tripExperienceParallelStart(destLabel),
      });

      const result = await runTripExperienceParallelScouts({
        contextEventId,
        triggerMessage: text,
        plan: prep.plan,
        anchorPlaceId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        anchorPriceKrw,
        discoveryOrigin: resolveDiscoveryOriginFromUtterance(
          text,
          resolveDiscoveryOriginForContext(contextEventId),
        ),
      });

      const outcome = result.merged;
      if (!outcome) {
        recordEngineScoutFailureClient({
          contextEventId,
          engineId: "trip_experience_search",
          lastError: "parallel_scout_empty",
          payload: { triggerMessage: text },
        });
        if (
          offerScoutFailRecovery({
            contextEventId,
            engineId: "trip_experience_search",
            lastError: "parallel_scout_empty",
            seedUtterance: text,
          })
        ) {
          return null;
        }
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
      clearComposerMessage();
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcome.recommendations);
      clearContextConditionPending(contextEventId);
      writeScoutTurnConstraints(
        contextEventId,
        mergeScoutTurnConstraints({
          prior: readScoutTurnConstraints(contextEventId),
          message: input.triggerMessage,
          spec: outcome.spec,
        }),
      );
      setContextAgentSessionSpec(outcome.spec);
      setContextAgentSessionPhase("deciding");
      onPinned?.(outcome);
      publishScoutFeedGateTurn({
        contextEventId,
        outcome,
        anchorPlaceName,
        anchorLat,
        anchorLng,
        triggerMessage: text,
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
      userLat,
      userLng,
    ],
  );

  const tryExecuteTripExperienceParallelScout = useCallback(
    async (triggerMessage: string): Promise<boolean> => {
      const outcome = await executeTripExperienceParallelScout({ triggerMessage });
      return outcome != null;
    },
    [executeTripExperienceParallelScout],
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
      /** Pre-built Narrator output (Intent→Planner→Narrator). */
      narration?: ScoutNarration | null;
      /** Cursor Diff — map markers only; skip Feed compose hero. */
      skipFeedGate?: boolean;
    }) => {
      // Category-switch cleanup: an activity/eatery search must not leave stale
      // hotel pins behind. Close the separate lodging discovery session and drop
      // the previous batch when the resource category changes (fresh scout only).
      const nextCategory = specResourceCategory(input.spec);
      const priorCategory = lastSpec ? specResourceCategory(lastSpec) : null;
      if (nextCategory !== "lodging") {
        dispatchGlobeLodgingDiscoveryClose();
      }
      if (priorCategory && priorCategory !== nextCategory) {
        clearDiscoveryLensSession(contextEventId);
      }

      // Narrator plan first — Replace mode drives SSOT wipe (Cursor task switch).
      const discoveryOriginForNarration = resolveDiscoveryOriginFromUtterance(
        input.triggerMessage,
        resolveDiscoveryOriginForContext(contextEventId),
      );
      // Seed learning — frequent hit/miss → promote candidates (never mutates Reality).
      try {
        observeScoutSeedLearning({
          message: input.triggerMessage,
          discoveryOriginHit: discoveryOriginForNarration != null,
          discoveryRegionLabel: discoveryOriginForNarration?.regionLabel ?? null,
        });
      } catch {
        /* learning must never break scout */
      }
      const narration =
        input.narration ??
        narrateScoutPlan(
          buildScoutNarrationPlan({
            message: input.triggerMessage,
            spec: input.spec,
            priorConstraints: readScoutTurnConstraints(contextEventId),
            previousSpec: lastSpec,
            anchorLabelKo:
              discoveryOriginForNarration?.regionLabel ?? anchorPlaceName,
          }),
        );

      if (!input.patchPlan && lastBatch) {
        dismissContextConditionPinBatch({
          contextEventId,
          batchId: lastBatch.batchId,
        });
        clearScoutRevealPending(contextEventId);
        setLastBatch(null);
        setLastRecommendations([]);
        onRecommendationsChange?.([]);
      }

      const priorFocus = lastSpec?.eateryFocus?.trim() || null;
      const nextFocus = input.spec.eateryFocus?.trim() || null;
      const cuisineReplaced =
        Boolean(nextFocus) &&
        isConcreteCuisineEateryFocus(nextFocus) &&
        priorFocus != null &&
        priorFocus !== nextFocus;
      if (
        !input.patchPlan &&
        (narration.plan.mode === "Replace" || cuisineReplaced)
      ) {
        clearActiveDiscoveryExecution(contextEventId);
        clearContextConditionLastBatch(contextEventId);
      }
      setContextAgentSessionPhase("scouting");
      beginContextAgentWork("exploring");

      const narrationTurnId = publishScoutNarration({
        contextEventId,
        narration,
      });

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
        discoveryOrigin: resolveDiscoveryOriginFromUtterance(
          input.triggerMessage,
          resolveDiscoveryOriginForContext(contextEventId),
        ),
        // Map pins land immediately — feed gate stays optional archive, not a blocker.
        deferMapReveal: false,
        onProcessPhase: (phase) => {
          setContextAgentProcessPhase(phase);
          // Coalesce live narration to one publish per frame — phase bursts
          // were re-rendering the whole compose thread while the input felt stuck.
          const textKo =
            phase === "exploring"
              ? "📡 탐색 엔진 호출 중…"
              : phase === "analyzing"
                ? "🧬 후보 신호 분석 중…"
                : phase === "optimizing"
                  ? "⚙️ 추천 순위를 맞추는 중…"
                  : null;
          if (!textKo) {
            return;
          }
          const stepId = `phase_${phase}`;
          const pending = processPhaseNarrationRef.current;
          pending.contextEventId = contextEventId;
          pending.turnId = narrationTurnId;
          pending.stepId = stepId;
          pending.textKo = textKo;
          if (pending.raf != null) {
            return;
          }
          pending.raf = requestAnimationFrame(() => {
            pending.raf = null;
            publishScoutNarrationLiveStep({
              contextEventId: pending.contextEventId,
              turnId: pending.turnId,
              stepId: pending.stepId,
              textKo: pending.textKo,
            });
          });
        },
      });
      if (!outcome) {
        completeScoutNarration({
          contextEventId,
          turnId: narrationTurnId,
        });
        if (
          nextCategory === "activity" ||
          nextCategory === "amenity"
        ) {
          publishContextOnlyGlobeProjection(contextEventId);
        }
        const failedEngineId = resolveDiscoveryEngineId({
          message: input.triggerMessage,
          event: findLifeEventCandidate(contextEventId),
          spec: input.spec,
        });
        if (failedEngineId) {
          recordEngineScoutFailureClient({
            contextEventId,
            engineId: failedEngineId,
            lastError: "scout_empty",
            payload: {
              triggerMessage: input.triggerMessage,
              category: nextCategory,
            },
          });
          const retried = offerScoutFailRecovery({
            contextEventId,
            engineId: failedEngineId,
            lastError: "scout_empty",
            seedUtterance: input.triggerMessage,
          });
          if (retried) {
            return null;
          }
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
      completeScoutNarration({
        contextEventId,
        turnId: narrationTurnId,
      });
      const activeContract = readScoutContract(contextEventId);
      let outcomeWorking = outcome;
      if (activeContract) {
        let gate = assertScoutContractGate({
          contract: activeContract,
          outputKinds: outcomeWorking.recommendations.map((row) => row.kind),
        });
        if (!gate.ok) {
          const isContamination = gate.violations.some(
            (row) => row.code === "category_contamination",
          );
          if (isContamination) {
            const filtered = outcomeWorking.recommendations.filter((row) =>
              reelKindAllowedForContract(activeContract, row.kind),
            );
            if (filtered.length > 0) {
              const lodgingCount = filtered.filter(
                (row) => row.kind === "lodging",
              ).length;
              const eateryCount = filtered.filter(
                (row) => row.kind === "eatery",
              ).length;
              outcomeWorking = {
                ...outcomeWorking,
                recommendations: filtered,
                lodgingCount,
                eateryCount,
                summaryKo:
                  lodgingCount > 0 && eateryCount === 0
                    ? copy.globe.contextConditionPinLodgingDone.replace(
                        "{n}",
                        String(lodgingCount),
                      )
                    : eateryCount > 0 && lodgingCount === 0
                      ? copy.globe.contextConditionPinEateryDone.replace(
                          "{n}",
                          String(eateryCount),
                        )
                      : copy.globe.contextConditionPinDone.replace(
                          "{n}",
                          String(filtered.length),
                        ),
              };
              gate = { ok: true };
            }
          }
        }
        if (!gate.ok) {
          const messageKo =
            primaryScoutViolationMessage(gate) ??
            copy.globe.contextConditionPinEmpty;
          const failedEngineId = resolveDiscoveryEngineId({
            message: input.triggerMessage,
            event: findLifeEventCandidate(contextEventId),
            spec: outcomeWorking.spec,
            recommendationKinds: outcomeWorking.recommendations.map(
              (row) => row.kind,
            ),
          });
          if (failedEngineId) {
            recordEngineScoutFailureClient({
              contextEventId,
              engineId: failedEngineId,
              lastError: "scout_contract_violation",
              payload: { batchId: outcomeWorking.batchId },
            });
          }
          dismissContextConditionPinBatch({
            contextEventId,
            batchId: outcomeWorking.batchId,
          });
          clearContextConditionLastBatch(contextEventId);
          clearScoutRevealPending(contextEventId);
          clearScoutContract(contextEventId);
          const retried =
            failedEngineId != null &&
            offerScoutFailRecovery({
              contextEventId,
              engineId: failedEngineId,
              lastError: "scout_contract_violation",
              seedUtterance: input.triggerMessage,
            });
          if (!retried) {
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: messageKo,
            });
            toast.message(messageKo);
          }
          return null;
        }
        writeScoutContract(
          contextEventId,
          withScoutOutputRef(activeContract, outcomeWorking.batchId),
        );
      }

      const wire: ContextConditionLastBatchWire = {
        batchId: outcomeWorking.batchId,
        count: outcomeWorking.lodgingCount + outcomeWorking.eateryCount,
        summaryKo: outcomeWorking.summaryKo,
        atIso: new Date().toISOString(),
        triggerMessage: input.triggerMessage.trim() || undefined,
        radiusM: outcomeWorking.radiusM,
        spec: outcomeWorking.spec,
        recommendations: outcomeWorking.recommendations.map((row) => ({
          kind: row.kind,
          title: row.title,
          reasonKo: row.reasonKo,
          placeId: row.placeId,
          lat: row.lat,
          lng: row.lng,
        })),
      };
      writeActiveDiscoveryExecution(contextEventId, wire, {
        archivePrior: true,
      });
      supersedePriorScoutFeedGates(contextEventId, outcomeWorking.batchId);
      setLastBatch(wire);
      setLastSpec(outcomeWorking.spec);
      setLastRecommendations(outcomeWorking.recommendations);
      clearComposerMessage();
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcomeWorking.recommendations);
      clearContextConditionPending(contextEventId);
      writeScoutTurnConstraints(
        contextEventId,
        mergeScoutTurnConstraints({
          prior: readScoutTurnConstraints(contextEventId),
          message: input.triggerMessage,
          spec: outcomeWorking.spec,
        }),
      );
      setContextAgentSessionSpec(outcomeWorking.spec);
      setContextAgentSessionPhase("deciding");
      onPinned?.(outcomeWorking);
      if (!input.skipFeedGate) {
        publishScoutFeedGateTurn({
          contextEventId,
          outcome: outcomeWorking,
          anchorPlaceName,
          anchorLat,
          anchorLng,
          triggerMessage: input.triggerMessage,
        });
      }
      return outcomeWorking;
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
    async (
      triggerMessage: string,
      answers?: Record<string, string>,
      options?: { skipFeedGate?: boolean },
    ) => {
      const interpreted = await interpretMessyForContextAgent({
        messyInput: triggerMessage,
        contextEventId,
        anchorPlaceName,
        anchorLat,
        anchorLng,
      });
      const pipelineMessage = interpreted.refinedMessage;

      // Graph Command OS / Action Planner gate — freeze free-NL scout when matched.
      {
        const graphResult = await tryRunContextNlActionAsync({
          utterance: pipelineMessage,
          contextEventId,
          anchorLat,
          anchorLng,
          contextLabelKo: anchorPlaceName,
        });
        if (graphResult) {
          if (graphResult.via === "revise_confirm") {
            appendOperatorAskChipsComposeTurn(contextEventId, {
              chipDomain: "lodging_stay_revise",
              hint: graphResult.assistantReplyKo,
              pendingTrigger: pipelineMessage,
              chips: graphResult.reviseChips,
            });
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return null;
          }
          if (graphResult.via === "revise_applied") {
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: graphResult.assistantReplyKo,
            });
            if (graphResult.requestDiffRescout && graphResult.skipFeedGate) {
              await resolveAndMaybeExecute(
                `${anchorPlaceName.trim() || "숙소"} 숙소`,
                undefined,
                { skipFeedGate: true },
              );
            }
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return null;
          }
          if (
            (graphResult.via === "clarify" || graphResult.via === "reason") &&
            graphResult.clarifyChips &&
            graphResult.clarifyChips.length > 0
          ) {
            appendOperatorAskChipsComposeTurn(contextEventId, {
              chipDomain: "clarify_less",
              hint: graphResult.assistantReplyKo,
              pendingTrigger: pipelineMessage,
              chips: graphResult.clarifyChips,
            });
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return null;
          }
          if (graphResult.via === "soft_confirm") {
            appendOperatorAskChipsComposeTurn(contextEventId, {
              chipDomain: "soft_graph_confirm",
              hint: graphResult.assistantReplyKo,
              pendingTrigger: pipelineMessage,
              chips: graphResult.softConfirmChips,
            });
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return null;
          }
          // Scout handoff — Operator owns Field discovery (must continue below).
          if (graphResult.via !== "scout_handoff") {
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: graphResult.assistantReplyKo,
            });
            if (
              graphResult.via === "graph_command" &&
              graphResult.commands.some((c) => c.op === "search_project") &&
              hasProvisionalContextWorkspace(contextEventId)
            ) {
              appendWorkspacePreviewComposeTurn(contextEventId);
              dispatchContextWorkspaceExpand({
                contextEventId,
                source: "map_search_auto",
              });
            }
            if (
              graphResult.via === "graph_command" &&
              !hasProvisionalContextWorkspace(contextEventId)
            ) {
              flyGlobeToSessionGraphDiff(globeRef, contextEventId);
            }
            if (
              graphResult.waitingCommit &&
              (graphResult.reservedOpIds?.length ?? 0) > 0
            ) {
              openFieldQueueOrDefer(contextEventId);
            }
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return null;
          }
        }
      }

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
      const priorConstraints = readScoutTurnConstraints(contextEventId);
      const utteranceSlots = parseUtteranceIntentSlots(pipelineMessage);
      const nextDishLocked = Boolean(utteranceSlots.dishFocus?.trim());
      const carryPriorDish = shouldCarryPriorEateryFocus(pipelineMessage);
      const mergedAnswers: Record<string, string> = {
        ...(followUpTurn && lastSpec
          ? {
              transport: lastSpec.transport,
              budget: lastSpec.budget,
              vibe: lastSpec.vibe,
              ...(lastSpec.lodgingKind !== "any"
                ? { lodgingKind: lastSpec.lodgingKind }
                : {}),
              // Prefs carry; dish/menu never revives on re-search.
              ...(carryPriorDish && priorConstraints?.menuFocusId
                ? { menuFocus: priorConstraints.menuFocusId }
                : {}),
            }
          : carryPriorDish && priorConstraints?.menuFocusId
            ? { menuFocus: priorConstraints.menuFocusId }
            : {}),
        ...(answers ?? {}),
      };
      // Explicit dish turn converges menuFocus over any leftover chip.
      if (nextDishLocked && utteranceSlots.cuisineId) {
        mergedAnswers.menuFocus = utteranceSlots.cuisineId;
      } else if (nextDishLocked) {
        delete mergedAnswers.menuFocus;
      }

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
        priorConstraints,
        previousTriggerMessage:
          readActiveDiscoveryExecution(contextEventId)?.triggerMessage ??
          lastBatch?.triggerMessage ??
          null,
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

      const nearbyPov =
        resolveDiscoveryOriginFromUtterance(
          pipelineMessage,
          resolveDiscoveryOriginForContext(contextEventId),
        ) ?? resolveDiscoveryOriginForContext(contextEventId);
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
        skipFeedGate: options?.skipFeedGate === true,
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
      pendingTrigger: readComposerMessage().trim() || "숙소",
      fields: sheet.fields,
    });
  }, [contextEventId, readComposerMessage]);

  const runLodgingTriggerAfterSlotSave = useCallback(
    async (triggerMessage: string) => {
      const text = triggerMessage.trim();
      if (!text) {
        return;
      }
      setBusy(true);
      beginContextAgentWork("analyzing", copy.globe.contextAgentStatusBusy);
      try {
        await resolveAndMaybeExecute(text);
        clearComposerMessage();
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [resolveAndMaybeExecute],
  );

  /** Stay revise Confirm → Tool Diff re-search (same project, no Field scout). */
  const runLodgingStayDiffRescout = useCallback(async () => {
    setBusy(true);
    beginContextAgentWork("exploring", copy.globe.contextAgentStatusBusy);
    try {
      await resolveAndMaybeExecute("다시 찾아줘", undefined, {
        skipFeedGate: true,
      });
      clearComposerMessage();
    } finally {
      setBusy(false);
      finishContextAgentWork();
    }
  }, [resolveAndMaybeExecute]);

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
      beginContextAgentWork("analyzing", copy.globe.contextAgentStatusBusy);
      try {
        const priorEvent = findLifeEventCandidate(contextEventId);
        const turn = readContextAgentComposeThread(contextEventId).find(
          (row) => row.id === input.turnId,
        );
        const chipDomain =
          turn?.role === "assistant" &&
          turn.kind === "ask_chips" &&
          turn.payload.chipDomain
            ? turn.payload.chipDomain
            : "trip_intake";

        if (chipDomain === "research_approval") {
          const applied = applyResearchApprovalChip({
            contextEventId,
            turnId: input.turnId,
            chipId: input.chipId,
            value: input.value,
            labelKo: input.labelKo,
          });
          if (applied.decision === "apply") {
            toast.success(applied.summaryKo);
          } else if (applied.decision === "revise" || applied.decision === "reject") {
            toast.message(applied.summaryKo);
          }
          return;
        }

        if (chipDomain === "lodging_stay_revise") {
          if (input.gapId === "cancel" || input.value === "cancel") {
            const summaryKo = cancelLodgingStayRevisePending(contextEventId);
            markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
              chipId: input.chipId,
              summaryKo,
            });
            toast.message(summaryKo);
            return;
          }
          if (input.gapId === "edit" || input.value === "edit") {
            cancelLodgingStayRevisePending(contextEventId);
            markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
              chipId: input.chipId,
              summaryKo: copy.globe.lodgingSlotChipsEdit,
            });
            openLodgingIntakeEditInThread();
            return;
          }
          // NL one-line: soft affirm → revise_applied → skipFeedGate Diff.
          const nlApply = await tryRunContextNlActionAsync({
            utterance: "응",
            contextEventId,
            anchorLat,
            anchorLng,
            contextLabelKo: anchorPlaceName,
          });
          if (nlApply?.via === "revise_applied") {
            markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
              chipId: input.chipId,
              summaryKo: nlApply.assistantReplyKo,
            });
            toast.success(nlApply.assistantReplyKo);
            if (nlApply.requestDiffRescout && nlApply.skipFeedGate) {
              await resolveAndMaybeExecute(
                `${anchorPlaceName.trim() || "숙소"} 숙소`,
                undefined,
                { skipFeedGate: true },
              );
            }
            return;
          }
          const applied = applyLodgingStayRevisePending({ contextEventId });
          if (!applied.ok) {
            toast.message(applied.messageKo);
            return;
          }
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: applied.summaryKo,
          });
          toast.success(copy.globe.lodgingStayReviseApplied(applied.summaryKo));
          await runLodgingStayDiffRescout();
          return;
        }

        if (chipDomain === "clarify_less") {
          const pending = readClarifyLessPending(contextEventId);
          const pickedLabel = input.labelKo.trim();
          const chipValue = input.value.trim();
          // Recovery chips embed full re-entry utterances in `value`.
          const resume =
            chipValue.length >= 2 &&
            /(?:찾아|옮겨|예약|준비|비교|다시|주변)/u.test(chipValue)
              ? chipValue
              : buildClarifyResumeUtterance({
                  originalUtterance:
                    pending?.originalUtterance ?? pendingTrigger,
                  pickedLabelKo: pickedLabel,
                });
          clearClarifyLessPending(contextEventId);
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: pickedLabel,
          });
          await resolveAndMaybeExecute(resume);
          return;
        }

        if (chipDomain === "soft_graph_confirm") {
          if (input.gapId === "cancel" || input.value === "cancel") {
            const summaryKo = cancelSoftConfirmPending(contextEventId);
            markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
              chipId: input.chipId,
              summaryKo,
            });
            toast.message(summaryKo);
            return;
          }
          const applied = applySoftConfirmPending({
            contextEventId,
            anchorLat,
            anchorLng,
            contextLabelKo: anchorPlaceName,
          });
          if (!applied.ok) {
            toast.message(applied.messageKo);
            return;
          }
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: applied.summaryKo,
          });
          toast.success(copy.globe.softConfirmApplied(applied.summaryKo));
          return;
        }

        if (chipDomain === "trip_experience") {
          applyTripExperienceAskChip({
            contextEventId,
            event: priorEvent,
            message: pendingTrigger,
            chip: {
              gapId: input.gapId as TripExperienceGapId,
              value: input.value,
            },
            userLat,
            userLng,
          });
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: copy.globe.tripExperienceAskChipApplied(input.labelKo),
          });
          runOneShotTripExperiencePrepClient({
            message: pendingTrigger,
            contextEventId,
            event: findLifeEventCandidate(contextEventId),
            userLat,
            userLng,
          });
          if (await tryExecuteTripExperienceParallelScout(pendingTrigger)) {
            return;
          }
        } else if (chipDomain === "flight_prep") {
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
          const completed = tryCompleteFlightPrepClient({
            message: pendingTrigger,
            contextEventId,
            event: findLifeEventCandidate(contextEventId),
            userLat,
            userLng,
          });
          if (completed.committed) {
            toast.success(copy.globe.flightPrepReady);
            return;
          }
        } else if (chipDomain === "transit_prep") {
          applyTransitPrepAskChip({
            contextEventId,
            event: priorEvent,
            message: pendingTrigger,
            chip: { gapId: input.gapId as TransitPrepGapId, value: input.value },
          });
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: copy.globe.tripIntakeAskChipApplied(input.labelKo),
          });
          const completed = tryCompleteTransitPrepClient({
            message: pendingTrigger,
            contextEventId,
            event: findLifeEventCandidate(contextEventId),
          });
          if (completed.committed) {
            toast.success(copy.globe.transitPrepReady);
            return;
          }
        } else if (chipDomain === "finance_prep") {
          applyFinancePrepAskChip({
            contextEventId,
            event: priorEvent,
            message: pendingTrigger,
            chip: { gapId: input.gapId as FinancePrepGapId, value: input.value },
          });
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: copy.globe.tripIntakeAskChipApplied(input.labelKo),
          });
          const completed = tryCompleteFinancePrepClient({
            message: pendingTrigger,
            contextEventId,
            event: findLifeEventCandidate(contextEventId),
          });
          if (completed.committed) {
            toast.success(copy.globe.financePrepReady);
            return;
          }
        } else if (chipDomain === "plan_handoff") {
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: copy.globe.planHandoffAskChipApplied(input.labelKo),
          });
        } else if (chipDomain === "ingress_converge") {
          const pickValue = input.value.trim();
          const forceNew = pickValue === INGRESS_CONVERGE_NEW_VALUE;
          const attachEventId = forceNew ? null : pickValue;
          markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
            chipId: input.chipId,
            summaryKo: forceNew
              ? copy.globe.tripSituationRouter.convergeNewChip
              : copy.globe.tripSituationRouter.convergeAttachChip(
                  input.labelKo.slice(0, 18),
                ),
          });
          const result = await dispatchContextRun(
            {
              kind: "text",
              text: pendingTrigger,
              surface: "composer",
              layerMode: "personal",
              contextEventId: attachEventId,
              forceNewContext: forceNew,
              lat: userLat ?? null,
              lng: userLng ?? null,
            },
            {
              openPortal: async () => {},
              openFieldDiscovery: () => {},
              tryQuickListMarket: async () => false,
              navigateUrl: (url, label) => {
                window.location.assign(url);
                toast.success(`${label} 여는 중…`);
              },
              toastSuccess: (line) => {
                toast.success(line);
              },
              onAttached: (eventId) => {
                requestGlobeAskBridgeFocus(eventId, "bridge");
              },
              onGlobeIngressCompiled: ({ eventId }) => {
                requestGlobeAskBridgeFocus(eventId, "bridge");
              },
            },
          );
          if (result.status === "error") {
            toast.error(result.errorMessage ?? copy.globe.ingestAttachFail);
          }
          return;
        } else {
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
        }
        await resolveAndMaybeExecute(
          chipDomain === "plan_handoff" && input.value.trim()
            ? input.value.trim()
            : pendingTrigger,
        );
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, contextEventId, openLodgingIntakeEditInThread, resolveAndMaybeExecute, runLodgingStayDiffRescout, tryExecuteTripExperienceParallelScout, userLat, userLng],
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
          pendingTrigger || readComposerMessage().trim() || parsed.destinationLabel;
        await runTripTriggerAfterIntake({
          triggerMessage: nextTrigger,
          destinationLabel: parsed.destinationLabel,
        });
        return;
      }

      if (input.domainId === LODGING_INTAKE_DOMAIN_ID) {
        const parsed = parseLodgingIntakeSubmitValues(input.values);
        let updated;
        try {
          updated = writeLodgingBookingSlots({
            contextEventId,
            ...parsed,
          });
        } catch {
          toast.error(copy.globe.lodgingSlotMissingToast);
          return;
        }
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
          readComposerMessage().trim() ||
          updated.place?.trim() ||
          "숙소";
        await runLodgingTriggerAfterSlotSave(nextTrigger);
      }
    },
    [
      contextEventId,
      readComposerMessage,
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
    const text = readComposerMessage().trim();
    if (!text && !lastSpec) {
      return;
    }
    if (text) {
      const composeHandled = onUserCompose?.(text) === true;
      if (composeHandled) {
        clearComposerMessage();
        return;
      }
    }
    // Soft yes/no after 「5박6일로 바꿀까요?」 ask chips.
    if (text && readLodgingStayRevisePending(contextEventId)) {
      if (isLodgingStayReviseRejectUtterance(text)) {
        const summaryKo = cancelLodgingStayRevisePending(contextEventId);
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: summaryKo,
        });
        clearComposerMessage();
        return;
      }
      if (isLodgingStayReviseAffirmUtterance(text)) {
        const nlApply = await tryRunContextNlActionAsync({
          utterance: text,
          contextEventId,
          anchorLat,
          anchorLng,
          contextLabelKo: anchorPlaceName,
        });
        if (nlApply?.via === "revise_applied") {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: nlApply.assistantReplyKo,
          });
          clearComposerMessage();
          if (nlApply.requestDiffRescout && nlApply.skipFeedGate) {
            await resolveAndMaybeExecute(
              `${anchorPlaceName.trim() || "숙소"} 숙소`,
              undefined,
              { skipFeedGate: true },
            );
          }
          return;
        }
        const applied = applyLodgingStayRevisePending({ contextEventId });
        if (!applied.ok) {
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: applied.messageKo,
          });
          clearComposerMessage();
          return;
        }
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: copy.globe.lodgingStayReviseApplied(applied.summaryKo),
        });
        clearComposerMessage();
        await runLodgingStayDiffRescout();
        return;
      }
    }
    if (readSoftConfirmPending(contextEventId)) {
      if (isSoftConfirmRejectUtterance(text)) {
        const summaryKo = cancelSoftConfirmPending(contextEventId);
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: summaryKo,
        });
        clearComposerMessage();
        return;
      }
      if (isSoftConfirmAffirmUtterance(text)) {
        const applied = applySoftConfirmPending({
          contextEventId,
          anchorLat,
          anchorLng,
          contextLabelKo: anchorPlaceName,
        });
        appendContextAgentComposeTurn(contextEventId, {
          role: "assistant",
          kind: "text",
          text: applied.ok
            ? copy.globe.softConfirmApplied(applied.summaryKo)
            : applied.messageKo,
        });
        clearComposerMessage();
        return;
      }
    }
    if (text && !isLodgingPrepUtterance(text) && !isFlightPrepUtterance(text) && !isTransitPrepUtterance(text) && !isFinancePrepUtterance(text) && !isTripExperienceUtterance(text) && tryOpenIntakeForMessage(text)) {
      clearComposerMessage();
      return;
    }
    setBusy(true);
    beginContextAgentWork("analyzing", copy.globe.contextAgentStatusBusy);
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
          blueprint: operatorBlueprint,
          userLat,
          userLng,
        });

        if (plan.tool === "ask_chips") {
          const chipDomain = resolveOperatorAskChipDomain({
            pendingTrigger: text,
            planReason: plan.reason,
          });
          const stayHint =
            chipDomain === "lodging_stay_revise"
              ? readLodgingStayRevisePending(contextEventId)?.confirmHintKo ??
                copy.globe.lodgingStayReviseAskHint
              : null;
          appendOperatorAskChipsComposeTurn(contextEventId, {
            chipDomain,
            hint:
              stayHint ??
              (chipDomain === "trip_experience"
                ? copy.globe.tripExperienceAskHint
                : chipDomain === "flight_prep"
                  ? copy.globe.flightPrepAskHint
                  : chipDomain === "transit_prep"
                    ? copy.globe.transitPrepAskHint
                    : chipDomain === "finance_prep"
                      ? copy.globe.financePrepAskHint
                      : copy.globe.tripIntakeAskHint),
            pendingTrigger: text,
            chips: plan.chips,
          });
          clearComposerMessage();
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
            clearComposerMessage();
            return;
          }
          plan = gateOperatorTurnSync({
            text,
            ssot,
            skipLens: true,
            event: operatorEvent,
            blueprint: operatorBlueprint,
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
          clearComposerMessage();
          return;
        }

        if (plan.tool === "task_injection") {
          if (await tryPublishActionInjection(text)) {
            return;
          }
          // Intent matched but handoff failed — still stop Continue scout.
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: copy.globe.contextActionPinFirstHint,
          });
          clearComposerMessage();
          setContextAgentSessionPhase("awaiting_human");
          return;
        }

        if (plan.tool === "graph_command") {
          const graphResult = await tryRunContextNlActionAsync({
            utterance: text,
            contextEventId,
            anchorLat,
            anchorLng,
            contextLabelKo: anchorPlaceName,
          });
          if (graphResult) {
            if (graphResult.via === "revise_confirm") {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "lodging_stay_revise",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.reviseChips,
              });
              clearComposerMessage();
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (graphResult.via === "soft_confirm") {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "soft_graph_confirm",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.softConfirmChips,
              });
              clearComposerMessage();
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (
              (graphResult.via === "clarify" || graphResult.via === "reason") &&
              graphResult.clarifyChips &&
              graphResult.clarifyChips.length > 0
            ) {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "clarify_less",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.clarifyChips,
              });
              clearComposerMessage();
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (graphResult.via === "scout_handoff") {
              await resolveAndMaybeExecute(text);
              clearComposerMessage();
              return;
            }
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: graphResult.assistantReplyKo,
            });
            if (
              graphResult.via === "graph_command" &&
              graphResult.commands.some((c) => c.op === "search_project") &&
              hasProvisionalContextWorkspace(contextEventId)
            ) {
              appendWorkspacePreviewComposeTurn(contextEventId);
              dispatchContextWorkspaceExpand({
                contextEventId,
                source: "map_search_auto",
              });
            }
            if (
              graphResult.via === "graph_command" &&
              !hasProvisionalContextWorkspace(contextEventId)
            ) {
              flyGlobeToSessionGraphDiff(globeRef, contextEventId);
            }
            if (
              graphResult.via === "soft_command" &&
              graphResult.mapsUrl &&
              typeof window !== "undefined"
            ) {
              window.open(graphResult.mapsUrl, "_blank", "noopener,noreferrer");
            }
            if (
              graphResult.waitingCommit &&
              (graphResult.reservedOpIds?.length ?? 0) > 0
            ) {
              openFieldQueueOrDefer(contextEventId);
            }
            clearComposerMessage();
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return;
          }
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: copy.globe.contextActionPinFirstHint,
          });
          clearComposerMessage();
          setContextAgentSessionPhase("awaiting_human");
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

        if (plan.tool === "scout" && plan.reason === "trip_experience_parallel") {
          runOneShotTripExperiencePrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
            userLat,
            userLng,
          });
          if (await tryExecuteTripExperienceParallelScout(text)) {
            return;
          }
        }

        if (plan.tool === "scout") {
          if (plan.reason !== "trip_experience_parallel") {
            runOneShotLodgingPrepClient({
              message: text,
              contextEventId,
              event: operatorEvent,
              userLat,
              userLng,
            });
          }
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
            clearComposerMessage();
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
          clearComposerMessage();
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
    tryExecuteTripExperienceParallelScout,
    lastSpec,
    lastRecommendations,
    onUserCompose,
    operatorBlueprint,
    resolveAndMaybeExecute,
    runPalantirRefine,
    tryOpenIntakeForMessage,
    tryPublishActionInjection,
    userLat,
    userLng,
    readComposerMessage,
    clearComposerMessage,
  ]);

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;
  const onComposeSubmit = useCallback(() => {
    void handleSubmitRef.current();
  }, []);

  const submitTrigger = useCallback(
    async (
      triggerMessage: string,
      options?: { expressReady?: boolean },
    ) => {
      const text = triggerMessage.trim();
      if (!text || busy) {
        return;
      }
      onUserCompose?.(text);
      setBusy(true);
      beginContextAgentWork("analyzing", copy.globe.contextAgentStatusBusy);
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
          blueprint: operatorBlueprint,
          userLat,
          userLng,
          expressReady: options?.expressReady === true,
        });
        if (plan.tool === "ask_chips") {
          const chipDomain = resolveOperatorAskChipDomain({
            pendingTrigger: text,
            planReason: plan.reason,
          });
          const stayHint =
            chipDomain === "lodging_stay_revise"
              ? readLodgingStayRevisePending(contextEventId)?.confirmHintKo ??
                copy.globe.lodgingStayReviseAskHint
              : null;
          appendOperatorAskChipsComposeTurn(contextEventId, {
            chipDomain,
            hint:
              stayHint ??
              (chipDomain === "trip_experience"
                ? copy.globe.tripExperienceAskHint
                : chipDomain === "flight_prep"
                  ? copy.globe.flightPrepAskHint
                  : chipDomain === "transit_prep"
                    ? copy.globe.transitPrepAskHint
                    : chipDomain === "finance_prep"
                      ? copy.globe.financePrepAskHint
                      : copy.globe.tripIntakeAskHint),
            pendingTrigger: text,
            chips: plan.chips,
          });
          return;
        }
        if (
          !isLodgingPrepUtterance(text) &&
          !isFlightPrepUtterance(text) &&
          !isTransitPrepUtterance(text) &&
          !isFinancePrepUtterance(text) &&
          !isTripExperienceUtterance(text) &&
          tryOpenIntakeForMessage(text)
        ) {
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
        if (plan.tool === "graph_command") {
          const graphResult = await tryRunContextNlActionAsync({
            utterance: text,
            contextEventId,
            anchorLat,
            anchorLng,
            contextLabelKo: anchorPlaceName,
          });
          if (graphResult) {
            if (graphResult.via === "revise_confirm") {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "lodging_stay_revise",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.reviseChips,
              });
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (graphResult.via === "soft_confirm") {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "soft_graph_confirm",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.softConfirmChips,
              });
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (
              (graphResult.via === "clarify" || graphResult.via === "reason") &&
              graphResult.clarifyChips &&
              graphResult.clarifyChips.length > 0
            ) {
              appendOperatorAskChipsComposeTurn(contextEventId, {
                chipDomain: "clarify_less",
                hint: graphResult.assistantReplyKo,
                pendingTrigger: text,
                chips: graphResult.clarifyChips,
              });
              setContextAgentSessionPhase("awaiting_human");
              onQuestionsChange?.([]);
              return;
            }
            if (graphResult.via === "scout_handoff") {
              await resolveAndMaybeExecute(text);
              return;
            }
            appendContextAgentComposeTurn(contextEventId, {
              role: "assistant",
              kind: "text",
              text: graphResult.assistantReplyKo,
            });
            if (
              graphResult.via === "graph_command" &&
              graphResult.commands.some((c) => c.op === "search_project") &&
              hasProvisionalContextWorkspace(contextEventId)
            ) {
              appendWorkspacePreviewComposeTurn(contextEventId);
              dispatchContextWorkspaceExpand({
                contextEventId,
                source: "map_search_auto",
              });
            }
            if (
              graphResult.via === "graph_command" &&
              !hasProvisionalContextWorkspace(contextEventId)
            ) {
              flyGlobeToSessionGraphDiff(globeRef, contextEventId);
            }
            if (
              graphResult.via === "soft_command" &&
              graphResult.mapsUrl &&
              typeof window !== "undefined"
            ) {
              window.open(graphResult.mapsUrl, "_blank", "noopener,noreferrer");
            }
            if (
              graphResult.waitingCommit &&
              (graphResult.reservedOpIds?.length ?? 0) > 0
            ) {
              openFieldQueueOrDefer(contextEventId);
            }
            setContextAgentSessionPhase("awaiting_human");
            onQuestionsChange?.([]);
            return;
          }
          appendContextAgentComposeTurn(contextEventId, {
            role: "assistant",
            kind: "text",
            text: copy.globe.contextActionPinFirstHint,
          });
          setContextAgentSessionPhase("awaiting_human");
          return;
        }
        if (plan.tool === "scout" && plan.reason === "trip_experience_parallel") {
          runOneShotTripExperiencePrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
            userLat,
            userLng,
          });
          if (await tryExecuteTripExperienceParallelScout(text)) {
            return;
          }
        }
        if (plan.tool === "scout" && plan.reason === "instant_transit_navigate") {
          const completed = tryCompleteTransitPrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
          });
          if (completed.committed) {
            toast.success(copy.globe.transitPrepReady);
            return;
          }
        }
        if (plan.tool === "scout" && plan.reason === "instant_flight_search") {
          const completed = tryCompleteFlightPrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
            userLat,
            userLng,
          });
          if (completed.committed) {
            toast.success(copy.globe.flightPrepReady);
            return;
          }
        }
        if (plan.tool === "scout" && plan.reason === "instant_finance_payment") {
          const completed = tryCompleteFinancePrepClient({
            message: text,
            contextEventId,
            event: operatorEvent,
          });
          if (completed.committed) {
            toast.success(copy.globe.financePrepReady);
            return;
          }
        }
        if (
          (plan.tool === "scout" &&
            plan.reason !== "trip_experience_parallel" &&
            plan.reason !== "instant_flight_search" &&
            plan.reason !== "instant_transit_navigate" &&
            plan.reason !== "instant_finance_payment") ||
          isLodgingPrepUtterance(text)
        ) {
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
      tryExecuteTripExperienceParallelScout,
      lastSpec,
      onUserCompose,
      operatorBlueprint,
      resolveAndMaybeExecute,
      runLodgingStayDiffRescout,
      tryOpenIntakeForMessage,
      tryPublishActionInjection,
      anchorLat,
      anchorLng,
      anchorPlaceName,
      onQuestionsChange,
      userLat,
      userLng,
    ],
  );

  /** Gap 1 — system sequencer auto-scout → same Act path as user compose. */
  useEffect(() => {
    return subscribeOperatorAutoRun((detail) => {
      if (detail.contextEventId !== contextEventId.trim()) {
        return;
      }
      if (!claimOperatorAutoRun(detail)) {
        return;
      }
      const expressReady = detail.expressReady === true;
      const progressKo =
        detail.progressKo?.trim() || copy.globe.contextAgentStatusExplore;
      beginContextAgentWork("exploring", progressKo);
      // scout_retry already pushed the widen hint into the Narrator stream.
      if (detail.source !== "scout_retry") {
        const streamed = publishScoutNarrationLiveStep({
          contextEventId: detail.contextEventId,
          textKo: `› ${progressKo}`,
          stepId: `auto_${Date.now().toString(36)}`,
        });
        if (!streamed) {
          appendContextAgentComposeTurn(detail.contextEventId, {
            role: "assistant",
            kind: "build_log",
            text: progressKo,
          });
        }
      }
      const runWhenIdle = () => {
        if (busyRef.current) {
          window.setTimeout(runWhenIdle, 48);
          return;
        }
        void submitTrigger(detail.text, { expressReady });
      };
      window.setTimeout(runWhenIdle, 0);
    });
  }, [contextEventId, submitTrigger]);

  const submitRefinement = useCallback(
    async (refineMessage: string) => {
      const text = refineMessage.trim();
      if (!text || busy || !lastSpec) {
        return;
      }
      onUserCompose?.(text);
      setBusy(true);
      beginContextAgentWork("analyzing", copy.globe.contextAgentStatusAnalyze);
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
        choice.slot === "activityFocus" ? choice.value : pending?.triggerMessage ?? readComposerMessage().trim();
      if (!triggerMessage) {
        return;
      }
      const answers = applyQuestionChoice({
        answers: pending?.answers ?? {},
        choice,
      });
      setBusy(true);
      beginContextAgentWork("exploring", copy.globe.contextAgentStatusExplore);
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
      readComposerMessage,
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
    clearScoutTurnConstraints(contextEventId);
    setLastBatch(null);
    setLastSpec(null);
    setLastRecommendations([]);
    onRecommendationsChange?.([]);
    setContextAgentSessionPhase("briefing");
  }, [contextEventId, lastBatch, onRecommendationsChange]);

  const lodgingSlotDefaults = useMemo(
    () => readLodgingBookingSlots(findLifeEventCandidate(contextEventId)),
    [contextEventId],
  );
  const lodgingSlotChipLabels = useMemo(() => {
    if (!lodgingSlotDefaults.checkInIso || !lodgingSlotDefaults.checkOutIso) {
      return [];
    }
    return buildLodgingBookingSlotChipLabels(
      lodgingSlotDefaults,
      findLifeEventCandidate(contextEventId),
    );
  }, [contextEventId, lodgingSlotDefaults]);

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
      <GlobeContextConditionComposeInput
        ref={composeInputRef}
        busy={busy}
        placeholder={copy.globe.contextConditionPinPlaceholder}
        submitLabel={copy.globe.contextConditionPinSubmit}
        onSubmit={onComposeSubmit}
      />

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
}));

