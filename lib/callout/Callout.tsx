"use client";

/**
 * Object Callout — Agent Control Surface keyed by objectId only.
 * Modes: Observe · Explore · Simulate · Prepare · Commit (Field handoff).
 */

import { useMemo, useState } from "react";
import { CalloutAction } from "@/lib/callout/CalloutAction";
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
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-[#8b95a1]">
              객체 기준 Context 확장
            </p>
            <ul className="space-y-1.5">
              {model.explore.edges.map((edge) => (
                <li key={edge.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2.5 text-left ring-1 ring-black/[0.04]"
                    disabled={!edge.targetObjectId}
                    onClick={() => {
                      if (edge.targetObjectId) {
                        handlers.onFocusRelated?.(edge.targetObjectId);
                      }
                    }}
                  >
                    <span className="text-[12px] font-semibold text-[#191f28]">
                      {edge.labelKo}
                      {edge.count != null ? (
                        <span className="ml-1 text-[#3182f6]">+{edge.count}</span>
                      ) : null}
                    </span>
                    <span className="truncate text-[11px] text-[#8b95a1]">
                      {edge.hintKo ?? "연결 대기"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <p className="mb-1.5 text-[10px] font-semibold text-[#8b95a1]">
                연결하기
              </p>
              <div className="flex flex-wrap gap-1.5">
                {model.connectTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#4e5968]"
                    onClick={() => handlers.onConnect?.(objectId, t.id)}
                  >
                    + {t.labelKo}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {ui.mode === "simulate" ? (
          <CalloutSimulation
            model={model.simulate}
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
