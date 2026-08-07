"use client";

/**
 * Agent Chat Card — single light-glass shell.
 * Collapse Thought Stream + Cursor-density message + chips + persistent input.
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { AudioLines, ChevronDown, ChevronRight, Mic, Plus, X } from "lucide-react";
import {
  formatAgentActivityElapsed,
  readAgentActivityTranscript,
  subscribeAgentActivityTranscript,
  type AgentActivityEvent,
  type AgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { getCollapseHeaderLabel } from "@/lib/context-run/build-agent-finish-surfaces";
import { cn } from "@/lib/utils";

export type AgentChatObjectChip = {
  readonly id: string;
  readonly title: string;
  readonly subtitleKo?: string | null;
};

export type AgentChatCardProps = {
  readonly contextEventId?: string | null;
  readonly placeholder?: string;
  readonly busy?: boolean;
  /** Final answer body (not collapse header). */
  readonly messageKo?: string | null;
  readonly sourceLabelKo?: string | null;
  readonly objects?: readonly AgentChatObjectChip[];
  readonly onSubmit: (text: string) => void;
  readonly onCloseMessage?: () => void;
  readonly onFocusObject?: (id: string) => void;
  readonly onPlus?: () => void;
  /** Near-full height sheet (top of screen). */
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
  readonly className?: string;
};

function formatAgentBody(text: string): readonly string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function isSectionLead(line: string): boolean {
  return /^·\s*(무엇을|왜|다음)/u.test(line) || /^(무엇을|왜|다음)/u.test(line);
}

function isRankedItem(line: string): boolean {
  return /^\d+\.\s/.test(line);
}

function kindMark(kind: AgentActivityEvent["kind"]): string {
  switch (kind) {
    case "thought":
      return "Thought";
    case "explore":
      return "Explored";
    case "tool":
      return "Tool";
    case "patch":
      return "Patched";
    case "verify":
      return "Verified";
    default:
      return "Status";
  }
}

function InCardActivityTerminal(input: {
  readonly activity: AgentActivityTranscript;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly objects: readonly AgentChatObjectChip[];
}): ReactElement {
  const { activity, collapsed, onToggle, objects } = input;
  const running = activity.running;
  const header = getCollapseHeaderLabel(activity, objects);
  const elapsed = formatAgentActivityElapsed(activity);

  if (!running && collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-2.5 flex w-full items-center gap-2 rounded-lg bg-[#eef1f4] px-2.5 py-1.5 text-left transition active:bg-[#e5e9ed]"
        data-agent-activity-collapse
      >
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dfe3e8] text-[9px] font-bold text-[#4e5968]"
          aria-hidden
        >
          ✓
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight tracking-[-0.01em] text-[#4e5968]">
          {header.replace(/^✓\s*/u, "")}
        </span>
        <ChevronRight className="h-3 w-3 shrink-0 text-[#b0b8c1]" />
      </button>
    );
  }

  return (
    <div
      className="mb-2.5 overflow-hidden rounded-lg bg-[#eef1f4]"
      data-agent-activity-terminal
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        {running ? (
          <span
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#3182f6]"
            aria-hidden
          />
        ) : (
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dfe3e8] text-[9px] font-bold text-[#4e5968]"
            aria-hidden
          >
            ✓
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[-0.01em] text-[#4e5968]">
          {running ? `작업 중 · ${elapsed || "…"}` : header.replace(/^✓\s*/u, "")}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-[#b0b8c1] transition",
            collapsed && "rotate-[-90deg]",
          )}
        />
      </button>
      {/* Steps live in the parent card scroller — no nested overflow. */}
      <ul className="space-y-1.5 border-t border-black/[0.04] px-2.5 py-2">
        {activity.events.map((ev, i) => {
          const isLatest = i === activity.events.length - 1;
          return (
            <li key={ev.id} className="min-w-0 pl-0.5">
              <p
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-[0.04em]",
                  isLatest && running ? "text-[#3182f6]" : "text-[#8b95a1]",
                )}
              >
                {kindMark(ev.kind)}
                {ev.metricKo ? (
                  <span className="ml-1 font-normal normal-case tracking-normal">
                    · {ev.metricKo}
                  </span>
                ) : null}
              </p>
              <p
                className={cn(
                  "mt-px text-[12px] leading-snug text-[#191f28]",
                  isLatest && running && "animate-pulse font-medium",
                )}
              >
                {ev.labelKo}
              </p>
              {ev.detailKo ? (
                <p className="mt-px text-[11px] leading-snug text-[#8b95a1]">
                  {ev.detailKo}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AgentChatCard({
  contextEventId = null,
  placeholder = "무엇이든 물어보세요",
  busy = false,
  messageKo = null,
  sourceLabelKo = null,
  objects = [],
  onSubmit,
  onCloseMessage,
  onFocusObject,
  onPlus,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: AgentChatCardProps) {
  const [text, setText] = useState("");
  const [activity, setActivity] = useState<AgentActivityTranscript | null>(
    null,
  );
  const [streamCollapsed, setStreamCollapsed] = useState(true);
  const [expandedLocal, setExpandedLocal] = useState(false);
  const expanded = expandedProp ?? expandedLocal;
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setExpandedLocal(next);
    onExpandedChange?.(next);
  };

  useEffect(() => {
    const id = contextEventId?.trim() ?? "";
    const refresh = () => {
      const t = readAgentActivityTranscript();
      const match = t && (!id || t.contextEventId === id) ? t : null;
      setActivity(match);
      if (match?.running) {
        setStreamCollapsed(false);
        if (expandedProp === undefined) setExpandedLocal(true);
        else onExpandedChange?.(true);
      } else if (match && !match.running) {
        setStreamCollapsed(true);
      }
    };
    refresh();
    return subscribeAgentActivityTranscript(refresh);
  }, [contextEventId]);

  const hasMessage = Boolean(messageKo?.trim());
  const hasActivity = Boolean(activity && activity.events.length > 0);
  const showBody = hasMessage || hasActivity || busy || expanded;
  const lines = hasMessage ? formatAgentBody(messageKo!) : [];
  const lead = lines[0] && !isSectionLead(lines[0]) ? lines[0] : null;
  const rest = lead ? lines.slice(1) : lines;

  const send = useCallback(() => {
    const t = text.trim();
    if (!t || busy) return;
    onSubmit(t);
    setText("");
  }, [text, busy, onSubmit]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-[min(100%,420px)]",
        expanded &&
          "fixed inset-x-2 z-[60] mx-auto max-w-lg top-[max(0.5rem,env(safe-area-inset-top))] bottom-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-agent-chat-card
      data-expanded={expanded ? "1" : "0"}
    >
      <div
        className={cn(
          "overflow-hidden rounded-[22px] bg-white/95 shadow-[0_10px_32px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.05] backdrop-blur-2xl transition-[max-height,height] duration-300 ease-out",
          showBody && "flex flex-col",
          showBody &&
            !expanded &&
            "max-h-[min(52dvh,460px)]",
          expanded && "h-full max-h-none",
        )}
      >
        {showBody ? (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <button
              type="button"
              className="flex w-full shrink-0 items-center justify-center gap-1.5 px-3 pt-2 pb-1"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "작업창 줄이기" : "작업창 크게"}
            >
              <span className="h-1 w-9 rounded-full bg-[#d1d6db]" aria-hidden />
            </button>
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rimvio-scroll-touch px-3.5 pb-1.5">
            {onCloseMessage ? (
              <button
                type="button"
                className="absolute right-2 top-0 flex h-7 w-7 items-center justify-center rounded-full text-[#8b95a1] transition hover:bg-black/[0.04]"
                onClick={onCloseMessage}
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            ) : null}

            <div className={cn(onCloseMessage && "pr-7")}>
              {activity && activity.events.length > 0 ? (
                <InCardActivityTerminal
                  activity={activity}
                  collapsed={streamCollapsed && !activity.running}
                  onToggle={() => setStreamCollapsed((v) => !v)}
                  objects={objects}
                />
              ) : null}

              {hasMessage ? (
                <>
                  {lead ? (
                    <p className="text-[14px] font-semibold leading-snug tracking-[-0.015em] text-[#191f28]">
                      {lead}
                    </p>
                  ) : null}
                  {sourceLabelKo ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#8b95a1]">
                      <span
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-[#eef1f4] text-[8px]"
                        aria-hidden
                      >
                        ◆
                      </span>
                      {sourceLabelKo}
                    </p>
                  ) : null}

                  {rest.length > 0 ? (
                    <div
                      className={cn(
                        "space-y-1 text-[12.5px] leading-snug",
                        lead ? "mt-2" : "mt-0",
                      )}
                    >
                      {rest.map((line) => {
                        if (
                          lead &&
                          /^·\s*무엇을 했는가:/u.test(line)
                        ) {
                          return null;
                        }
                        const section = isSectionLead(line);
                        const ranked = isRankedItem(line);
                        return (
                          <p
                            key={line}
                            className={cn(
                              section &&
                                "pt-0.5 text-[11px] font-semibold tracking-[-0.01em] text-[#191f28]",
                              ranked &&
                                "pl-1.5 font-medium text-[#4e5968]",
                              !section &&
                                !ranked &&
                                "font-medium text-[#4e5968]",
                            )}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : busy && !hasActivity ? (
                <p className="animate-pulse text-[13px] font-medium text-[#8b95a1]">
                  요청을 읽고 작업 중…
                </p>
              ) : null}

              {objects.length > 0 ? (
                <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {objects.slice(0, 4).map((obj) => (
                    <button
                      key={obj.id}
                      type="button"
                      className="min-w-[6.75rem] max-w-[8.5rem] shrink-0 rounded-xl bg-[#eef1f4] px-2.5 py-1.5 text-left transition active:scale-[0.98]"
                      onClick={() => onFocusObject?.(obj.id)}
                    >
                      <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[#191f28]">
                        {obj.title}
                      </p>
                      {obj.subtitleKo ? (
                        <p className="mt-px truncate text-[10px] text-[#8b95a1]">
                          {obj.subtitleKo}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5",
            showBody && "border-t border-black/[0.04]",
          )}
        >
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4e5968] transition hover:bg-black/[0.04]"
            onClick={onPlus}
            aria-label="추가"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] font-medium text-[#191f28] outline-none placeholder:text-[#8b95a1] disabled:opacity-50"
            aria-label={placeholder}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4e5968] transition hover:bg-black/[0.04]"
            aria-label="음성 입력"
            disabled={busy}
          >
            <Mic className="h-4 w-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#191f28] text-white transition",
              busy && "opacity-40",
            )}
            disabled={busy}
            onClick={() => {
              if (text.trim()) send();
            }}
            aria-label={text.trim() ? "보내기" : "음성 모드"}
          >
            {text.trim() ? (
              <span className="text-[14px] font-bold leading-none">↑</span>
            ) : (
              <AudioLines className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
