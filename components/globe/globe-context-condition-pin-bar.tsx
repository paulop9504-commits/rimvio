"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { toast } from "sonner";
import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { copy } from "@/lib/copy/human-ko";
import {
  buildSpatialPatchPreview,
  planSpatialPatch,
  readContextConditionPinnedPlaceIds,
  clearContextConditionLastBatch,
  readContextConditionLastBatch,
  runContextConditionAnchorPin,
  dismissContextConditionPinBatch,
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
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  applyQuestionChoice,
  isLocalDiscoveryRefinement,
  resolveLocalDiscoveryAction,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import {
  beginContextAgentWork,
  finishContextAgentWork,
  setContextAgentProcessPhase,
  setContextAgentSessionPatchPreview,
  setContextAgentSessionPhase,
  setContextAgentSessionSpec,
} from "@/lib/globe/context-agent";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";
import { cn } from "@/lib/utils";

export type GlobeContextConditionPinBarHandle = {
  submitTrigger: (message: string) => Promise<void>;
  submitRefinement: (message: string) => Promise<void>;
  hasLastBatch: () => boolean;
  hasActiveSpec: () => boolean;
};

export type GlobeContextConditionPinBarProps = {
  contextEventId: string;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  onPinned?: (outcome: ContextConditionAnchorPinOutcome) => void;
  onQuestionsChange?: (questions: readonly LocalDiscoveryQuestion[]) => void;
  onRecommendationsChange?: (
    items: ContextConditionAnchorPinOutcome["recommendations"],
  ) => void;
  onPatchPreviewChange?: (
    preview: import("@/lib/globe/context-condition-ai/spatial-patch-types").SpatialPatchPreview | null,
  ) => void;
  onActionInjectionChange?: (injection: ContextActionInjection | null) => void;
  registerQuestionHandler?: (
    handler: (choice: LocalDiscoveryQuestionChoice) => void,
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
  anchorPlaceId,
  anchorPlaceName,
  anchorLat,
  anchorLng,
  anchorPriceKrw = null,
  onPinned,
  onQuestionsChange,
  onRecommendationsChange,
  onPatchPreviewChange,
  onActionInjectionChange,
  registerQuestionHandler,
  className,
  },
  ref,
) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastBatch, setLastBatch] = useState<ContextConditionLastBatchWire | null>(
    null,
  );
  const [lastSpec, setLastSpec] = useState<
    ContextConditionAnchorPinOutcome["spec"] | null
  >(null);

  const [lastRecommendations, setLastRecommendations] = useState<
    readonly ContextConditionRecommendation[]
  >([]);

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
    const batch = readContextConditionLastBatch(contextEventId);
    setLastBatch(batch);
    setLastSpec(batch?.spec ?? null);
    const wired = wireRecommendations(batch);
    setLastRecommendations(wired);
    onRecommendationsChange?.(wired);
    const pending = readContextConditionPending(contextEventId);
    onQuestionsChange?.(pending?.questions ?? []);
  }, [anchorLat, anchorLng, contextEventId, onQuestionsChange, onRecommendationsChange]);

  const tryPublishActionInjection = useCallback(
    async (triggerMessage: string): Promise<boolean> => {
      const event = findLifeEventCandidate(contextEventId);
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
      const built = buildContextActionInjection({ event, intent });
      if (!built) {
        toast.message(copy.globe.contextActionPinFirstHint);
        return true;
      }
      publishContextActionInjection(built);
      onActionInjectionChange?.(built);
      setMessage("");
      return true;
    },
    [contextEventId, onActionInjectionChange],
  );

  const executeWithSpec = useCallback(
    async (input: {
      triggerMessage: string;
      spec: ContextConditionAnchorPinOutcome["spec"];
      patchPlan?: ReturnType<typeof planSpatialPatch> | null;
      keptRecommendations?: readonly ContextConditionRecommendation[];
    }) => {
      setContextAgentSessionPhase("scouting");
      beginContextAgentWork("exploring");
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
        onProcessPhase: setContextAgentProcessPhase,
      });
      if (!outcome) {
        toast.message(copy.globe.contextConditionPinEmpty);
        setContextAgentSessionPatchPreview(null);
        onPatchPreviewChange?.(null);
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
      setContextAgentSessionPatchPreview(null);
      onPatchPreviewChange?.(null);
      toast.success(outcome.summaryKo);
      onPinned?.(outcome);
      return outcome;
    },
    [
      anchorLat,
      anchorLng,
      anchorPlaceId,
      anchorPlaceName,
      anchorPriceKrw,
      contextEventId,
      onPatchPreviewChange,
      onPinned,
      onQuestionsChange,
      onRecommendationsChange,
    ],
  );

  const resolveAndMaybeExecute = useCallback(
    async (triggerMessage: string, answers?: Record<string, string>) => {
      const event = findLifeEventCandidate(contextEventId);
      const travelBrain = event ? buildTravelBrainState(event) : null;
      const resolved = resolveLocalDiscoveryAction({
        message: triggerMessage,
        answers,
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

      return executeWithSpec({ triggerMessage, spec: resolved.spec });
    },
    [contextEventId, executeWithSpec, onQuestionsChange],
  );

  const handleSubmit = useCallback(async () => {
    if (busy) {
      return;
    }
    const text = message.trim();
    if (!text && !lastSpec) {
      return;
    }
    setBusy(true);
    try {
      if (text && (await tryPublishActionInjection(text))) {
        return;
      }
      if (lastSpec && (isLocalDiscoveryRefinement(text) || lastRecommendations.length > 0)) {
        const event = findLifeEventCandidate(contextEventId);
        const pinned = readContextConditionPinnedPlaceIds(event);
        const patchPlan = planSpatialPatch({
          message: text,
          currentSpec: lastSpec,
          previousRecommendations: lastRecommendations,
          pinnedPlaceIds: pinned,
        });
        const preview = buildSpatialPatchPreview({
          plan: patchPlan,
          previousRecommendations: lastRecommendations,
          pinnedPlaceIds: pinned,
        });
        setContextAgentSessionPhase("replanning");
        setContextAgentSessionPatchPreview(preview);
        onPatchPreviewChange?.(preview);
        await executeWithSpec({
          triggerMessage: text,
          spec: patchPlan.nextSpec,
          patchPlan,
          keptRecommendations: preview.kept,
        });
        return;
      }

      const pending = readContextConditionPending(contextEventId);
      await resolveAndMaybeExecute(
        text || pending?.triggerMessage || "",
        pending?.answers,
      );
    } finally {
      setBusy(false);
      finishContextAgentWork();
    }
  }, [
    busy,
    contextEventId,
    executeWithSpec,
    lastSpec,
    lastRecommendations,
    message,
    onPatchPreviewChange,
    resolveAndMaybeExecute,
    tryPublishActionInjection,
  ]);

  const submitTrigger = useCallback(
    async (triggerMessage: string) => {
      const text = triggerMessage.trim();
      if (!text || busy) {
        return;
      }
      setBusy(true);
      try {
        if (await tryPublishActionInjection(text)) {
          return;
        }
        await resolveAndMaybeExecute(text);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, resolveAndMaybeExecute, tryPublishActionInjection],
  );

  const submitRefinement = useCallback(
    async (refineMessage: string) => {
      const text = refineMessage.trim();
      if (!text || busy || !lastSpec) {
        return;
      }
      setBusy(true);
      try {
        const event = findLifeEventCandidate(contextEventId);
        const pinned = readContextConditionPinnedPlaceIds(event);
        const patchPlan = planSpatialPatch({
          message: text,
          currentSpec: lastSpec,
          previousRecommendations: lastRecommendations,
          pinnedPlaceIds: pinned,
        });
        const preview = buildSpatialPatchPreview({
          plan: patchPlan,
          previousRecommendations: lastRecommendations,
          pinnedPlaceIds: pinned,
        });
        setContextAgentSessionPhase("replanning");
        setContextAgentSessionPatchPreview(preview);
        onPatchPreviewChange?.(preview);
        await executeWithSpec({
          triggerMessage: text,
          spec: patchPlan.nextSpec,
          patchPlan,
          keptRecommendations: preview.kept,
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
      onPatchPreviewChange,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      submitTrigger,
      submitRefinement,
      hasLastBatch: () => lastBatch != null,
      hasActiveSpec: () => lastSpec != null,
    }),
    [lastBatch, lastSpec, submitRefinement, submitTrigger],
  );

  const handleQuestionChoice = useCallback(
    async (choice: LocalDiscoveryQuestionChoice) => {
      if (busy) {
        return;
      }
      const pending = readContextConditionPending(contextEventId);
      const triggerMessage = pending?.triggerMessage ?? message.trim();
      if (!triggerMessage) {
        return;
      }
      const answers = applyQuestionChoice({
        answers: pending?.answers ?? {},
        choice,
      });
      setBusy(true);
      try {
        await resolveAndMaybeExecute(triggerMessage, answers);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, contextEventId, message, resolveAndMaybeExecute],
  );

  useEffect(() => {
    registerQuestionHandler?.(handleQuestionChoice);
  }, [handleQuestionChoice, registerQuestionHandler]);

  const handleDismissBatch = useCallback(() => {
    if (!lastBatch) {
      return;
    }
    dismissContextConditionPinBatch({
      contextEventId,
      batchId: lastBatch.batchId,
    });
    clearContextConditionLastBatch(contextEventId);
    setLastBatch(null);
    setLastSpec(null);
    setLastRecommendations([]);
    onRecommendationsChange?.([]);
    onPatchPreviewChange?.(null);
    setContextAgentSessionPatchPreview(null);
    setContextAgentSessionPhase("briefing");
  }, [contextEventId, lastBatch, onPatchPreviewChange, onRecommendationsChange]);

  return (
    <div
      className={cn("space-y-2", className)}
      data-globe-context-condition-pin-bar
    >
      <div className="flex items-center gap-2 rounded-2xl bg-white/90 p-2 shadow-sm ring-1 ring-black/[0.04]">
        <GlobeContextConditionOrb size="sm" />
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
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
          disabled={busy}
          className="shrink-0 rounded-full bg-[#1d1d1f] px-3 py-1.5 text-[12px] font-semibold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {busy
            ? copy.globe.contextConditionPinBusy
            : copy.globe.contextConditionPinSubmit}
        </button>
      </div>

      {lastBatch ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] font-medium text-[#515154]">
            {lastBatch.summaryKo}
          </p>
          <button
            type="button"
            onClick={handleDismissBatch}
            className="shrink-0 text-[11px] font-semibold text-[#ff6b4a] active:opacity-70"
          >
            {copy.globe.contextConditionPinDismiss}
          </button>
        </div>
      ) : null}
    </div>
  );
});
