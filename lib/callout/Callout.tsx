"use client";

/**
 * Object Callout — Agent Control Surface keyed by objectId only.
 * Modes: Observe · Explore · Simulate · Prepare · Commit (Field handoff).
 */

import { useMemo, useState } from "react";
import { CalloutAction } from "@/lib/callout/CalloutAction";
import { CalloutExplore } from "@/lib/callout/CalloutExplore";
import { CalloutHeader } from "@/lib/callout/CalloutHeader";
import { CalloutObserve } from "@/lib/callout/CalloutObserve";
import { CalloutPrepare } from "@/lib/callout/CalloutPrepare";
import { CalloutSimulation } from "@/lib/callout/CalloutSimulation";
import { CalloutTabs } from "@/lib/callout/CalloutTabs";
import {
  useCalloutHandlers,
  useCalloutViewModel,
} from "@/lib/callout/callout-session";
import { useCalloutState } from "@/lib/callout/hooks/useCalloutState";
import type { ObjectRelationType } from "@/lib/callout/object-relation";
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

  const modeActions = useMemo(() => {
    if (!model) return [];
    return model.object.actions;
  }, [model]);

  if (!model) return null;

  const runAction = (action: CalloutActionModel) => {
    const id = objectId;
    switch (action.kind) {
      case "select":
        handlers.onSelect?.(id);
        break;
      case "compare":
        handlers.onCompare?.(id);
        break;
      case "bookmark":
        handlers.onBookmark?.(id);
        break;
      case "focus_related":
        if (action.targetId) handlers.onFocusRelated?.(action.targetId);
        break;
      case "create_prepare_draft":
        handlers.onCreatePrepareDraft?.(id);
        break;
      case "handoff_field":
        handlers.onHandoffField?.(id);
        break;
      case "connect":
        if (action.targetId) handlers.onConnect?.(id, action.targetId);
        break;
      default:
        break;
    }
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
    handlers.onAskObject?.(objectId, text);
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
            <CalloutAction actions={modeActions.slice(0, 3)} onAction={runAction} />
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
          <CalloutPrepare
            model={model.prepare}
            onCreateDraft={() => handlers.onCreatePrepareDraft?.(objectId)}
          />
        ) : null}

        {ui.mode === "commit" ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-snug text-[#4e5968]">
              {model.commit.summaryKo}
            </p>
            <button
              type="button"
              disabled={!model.commit.enabled}
              className={cn(
                "w-full rounded-full px-3 py-2.5 text-[12px] font-semibold",
                model.commit.enabled
                  ? "bg-[#191f28] text-white"
                  : "cursor-not-allowed bg-[#e8ebef] text-[#c4c9d0]",
              )}
              onClick={() => handlers.onHandoffField?.(objectId)}
            >
              {model.commit.ctaKo}
            </button>
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
          aria-label="Ask this object"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#191f28] px-3 py-2 text-[11px] font-semibold text-white"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
