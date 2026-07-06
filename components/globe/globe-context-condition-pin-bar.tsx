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
  clearContextConditionLastBatch,
  readContextConditionLastBatch,
  runContextConditionAnchorPin,
  dismissContextConditionPinBatch,
  type ContextConditionLastBatchWire,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import {
  clearContextConditionPending,
  readContextConditionPending,
  writeContextConditionPending,
} from "@/lib/globe/context-condition-ai/context-condition-pending-spec-store";
import type {
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  applyQuestionChoice,
  isLocalDiscoveryRefinement,
  refineLocalDiscoverySpec,
  resolveLocalDiscoveryAction,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import {
  beginContextAgentWork,
  finishContextAgentWork,
  setContextAgentProcessPhase,
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

  useEffect(() => {
    const batch = readContextConditionLastBatch(contextEventId);
    setLastBatch(batch);
    setLastSpec(batch?.spec ?? null);
    const pending = readContextConditionPending(contextEventId);
    onQuestionsChange?.(pending?.questions ?? []);
  }, [contextEventId, onQuestionsChange]);

  const executeWithSpec = useCallback(
    async (input: {
      triggerMessage: string;
      spec: ContextConditionAnchorPinOutcome["spec"];
    }) => {
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
        onProcessPhase: setContextAgentProcessPhase,
      });
      if (!outcome) {
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
          title: row.title,
          reasonKo: row.reasonKo,
        })),
      };
      setLastBatch(wire);
      setLastSpec(outcome.spec);
      setMessage("");
      onQuestionsChange?.([]);
      onRecommendationsChange?.(outcome.recommendations);
      clearContextConditionPending(contextEventId);
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
      if (lastSpec && isLocalDiscoveryRefinement(text)) {
        const nextSpec = refineLocalDiscoverySpec(lastSpec, text);
        await executeWithSpec({ triggerMessage: text, spec: nextSpec });
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
    message,
    resolveAndMaybeExecute,
  ]);

  const submitTrigger = useCallback(
    async (triggerMessage: string) => {
      const text = triggerMessage.trim();
      if (!text || busy) {
        return;
      }
      setBusy(true);
      try {
        await resolveAndMaybeExecute(text);
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, resolveAndMaybeExecute],
  );

  const submitRefinement = useCallback(
    async (refineMessage: string) => {
      const text = refineMessage.trim();
      if (!text || busy || !lastSpec) {
        return;
      }
      setBusy(true);
      try {
        const nextSpec = refineLocalDiscoverySpec(lastSpec, text);
        await executeWithSpec({ triggerMessage: text, spec: nextSpec });
      } finally {
        setBusy(false);
        finishContextAgentWork();
      }
    },
    [busy, executeWithSpec, lastSpec],
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
    onRecommendationsChange?.([]);
  }, [contextEventId, lastBatch, onRecommendationsChange]);

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
