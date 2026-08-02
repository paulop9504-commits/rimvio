"use client";

/**
 * Object Callout — Agent Control Surface keyed by objectId only.
 * Modes: Observe · Explore · Simulate · Prepare (Commit = Field only).
 */

import { useMemo, useState } from "react";
import { CalloutAction } from "@/lib/callout/CalloutAction";
import { CalloutExplore } from "@/lib/callout/CalloutExplore";
import { CalloutHeader } from "@/lib/callout/CalloutHeader";
import { CalloutObserve } from "@/lib/callout/CalloutObserve";
import { CalloutFieldHandoff } from "@/lib/callout/CalloutFieldHandoff";
import { CalloutPrepare } from "@/lib/callout/CalloutPrepare";
import { CalloutScopedPromptStatus } from "@/lib/callout/CalloutScopedPrompt";
import { CalloutSimulation } from "@/lib/callout/CalloutSimulation";
import { CalloutTabs } from "@/lib/callout/CalloutTabs";
import { invokeRegisteredAction } from "@/lib/callout/action-registry";
import {
  useCalloutHandlers,
  useCalloutViewModel,
} from "@/lib/callout/callout-session";
import { useCalloutState } from "@/lib/callout/hooks/useCalloutState";
import type { ObjectRelationType } from "@/lib/callout/object-relation";
import type { ObjectScopedPromptResult } from "@/lib/callout/scoped-prompt/types";
import type {
  CalloutAction as CalloutActionModel,
  CalloutHandlers,
  CalloutMode,
  Evidence,
} from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export type CalloutProps = {
  objectId: string;
  /** Optional override when session provider is absent (tests / embeds). */
  handlers?: CalloutHandlers;
  className?: string;
  compact?: boolean;
  initialMode?: CalloutMode;
};

function ChangeIntentBar({
  axes,
  selected,
  onToggle,
  onApply,
}: {
  axes: readonly { id: string; labelKo: string; nudge: "up" | "down" | "neutral" }[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onApply: () => void;
}) {
  const nudgeMark = (nudge: "up" | "down" | "neutral") =>
    nudge === "up" ? "↑" : nudge === "down" ? "↓" : "·";

  return (
    <div className="space-y-2 rounded-[14px] bg-[#f9fafb] px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.02em] text-[#8b95a1]">
        Change Intent
      </p>
      <div className="flex flex-wrap gap-1.5">
        {axes.map((axis) => {
          const on = selected.includes(axis.id);
          return (
            <button
              key={axis.id}
              type="button"
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                on
                  ? "bg-[#191f28] text-white"
                  : "bg-white text-[#4e5968] ring-1 ring-black/[0.05]",
              )}
              onClick={() => onToggle(axis.id)}
            >
              {axis.labelKo} {nudgeMark(axis.nudge)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={selected.length === 0}
        className={cn(
          "w-full rounded-full px-3 py-2 text-[12px] font-semibold",
          selected.length > 0
            ? "bg-[#3182f6] text-white"
            : "cursor-not-allowed bg-[#e8ebef] text-[#c4c9d0]",
        )}
        onClick={onApply}
      >
        이 기준으로 다시 모으기
      </button>
    </div>
  );
}

export function Callout({
  objectId,
  handlers: handlersProp,
  className,
  compact = false,
  initialMode = "observe",
}: CalloutProps) {
  const model = useCalloutViewModel(objectId);
  const sessionHandlers = useCalloutHandlers();
  const handlers = handlersProp ?? sessionHandlers;
  const ui = useCalloutState(initialMode);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [exploreType, setExploreType] = useState<ObjectRelationType>("nearby");
  const [scopedResult, setScopedResult] =
    useState<ObjectScopedPromptResult | null>(null);

  const modeActions = useMemo(() => {
    if (!model) return [];
    // Buttons from Action Registry only — never hard-coded by object type here.
    return model.object.actions;
  }, [model]);

  if (!model) return null;

  const runAction = (action: CalloutActionModel) => {
    void invokeRegisteredAction(action.action, {
      objectId,
      objectType: model.object.type,
      contextId: model.object.contextId,
      object: model.object,
      handlers,
    });
  };

  const applyIntent = () => {
    const axes = model.intentAxes
      .filter((a) => ui.selectedAxes.includes(a.id))
      .map((a) => ({ id: a.id, nudge: a.nudge }));
    handlers.onChangeIntent?.(objectId, axes);
  };

  const submitAsk = () => {
    const text = ui.askText.trim();
    if (!text) return;
    const result = handlers.onAskObject?.(objectId, text);
    if (result && typeof result === "object" && "ok" in result && result.ok) {
      setScopedResult(result);
      if (result.intent.kind === "simulate" || result.intent.kind === "change") {
        ui.setMode("simulate");
      } else if (result.intent.kind === "prepare") {
        ui.setMode("prepare");
      }
    } else {
      setScopedResult(null);
    }
    ui.clearAsk();
  };

  return (
    <div
      className={cn(
        "space-y-3",
        compact ? "max-h-[min(52vh,420px)] overflow-y-auto" : null,
        className,
      )}
      data-rimvio-object-callout
      data-object-id={objectId}
    >
      <CalloutHeader model={model} />
      <CalloutTabs
        modes={model.modes}
        active={ui.mode}
        onChange={ui.setMode}
      />

      <CalloutAction actions={modeActions} onAction={runAction} />

      <div className="min-h-[120px]">
        {ui.mode === "observe" ? (
          <div className="space-y-3">
            <CalloutObserve
              model={model.observe}
              activeEvidenceId={activeEvidenceId}
              onSelectEvidence={(ev: Evidence) => {
                setActiveEvidenceId(ev.id);
                handlers.onHighlightEvidence?.(objectId, ev);
              }}
            />
          </div>
        ) : null}

        {ui.mode === "explore" ? (
          <CalloutExplore
            model={model.explore}
            activeRelationType={exploreType}
            onSelectRelationType={(type) => {
              setExploreType(type);
              handlers.onExploreRelationType?.(
                objectId,
                type,
                model.explore.buckets[type] ?? [],
              );
            }}
            onSelectRelation={(rel) => {
              handlers.onExploreRelation?.(objectId, rel);
            }}
            onConnect={(targetId) => handlers.onConnect?.(objectId, targetId)}
          />
        ) : null}

        {ui.mode === "simulate" ? (
          <CalloutSimulation
            model={model.simulate}
            onPreview={(altId) =>
              handlers.onPreviewSimulation?.(objectId, altId)
            }
            onApply={(altId) => handlers.onApplySimulation?.(objectId, altId)}
          />
        ) : null}

        {ui.mode === "prepare" ? (
          <div className="space-y-3">
            <CalloutPrepare
              model={model.prepare}
              onCreateDraft={() => handlers.onCreatePrepareDraft?.(objectId)}
              onHandoffCommit={() => handlers.onHandoffField?.(objectId)}
            />
            <CalloutFieldHandoff
              summaryKo={model.fieldHandoff.summaryKo}
              ctaKo={model.fieldHandoff.ctaKo}
              enabled={model.fieldHandoff.enabled}
              onFieldAction={() => handlers.onHandoffField?.(objectId)}
            />
          </div>
        ) : null}
      </div>

      {ui.mode === "observe" || ui.mode === "explore" ? (
        <ChangeIntentBar
          axes={model.intentAxes}
          selected={ui.selectedAxes}
          onToggle={ui.toggleAxis}
          onApply={applyIntent}
        />
      ) : null}

      {scopedResult ? (
        <CalloutScopedPromptStatus result={scopedResult} />
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitAsk();
        }}
      >
        <input
          value={ui.askText}
          onChange={(e) => ui.setAskText(e.target.value)}
          placeholder={model.askPlaceholderKo}
          className="min-w-0 flex-1 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] text-[#191f28] outline-none ring-1 ring-transparent placeholder:text-[#c4c9d0] focus:bg-white focus:ring-[#3182f6]/30"
          aria-label="Object scoped prompt"
          data-object-scoped-prompt-input
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#191f28] px-3 py-2 text-[11px] font-semibold text-white"
        >
          이 객체에게
        </button>
      </form>
    </div>
  );
}
