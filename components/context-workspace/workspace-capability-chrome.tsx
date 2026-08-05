"use client";

/**
 * Web Capability Workspace chrome — Intent opens Objects, not fixed tabs.
 * Map fills the surface; Day/Timeline/Agent float over it (no layout band).
 */

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  applyWorkspaceCapabilityOp,
  isCapabilityOpen,
  type WorkspaceCapabilityLayout,
  type WorkspaceCapabilityViewModel,
} from "@/lib/workspace-capability";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceCapabilityChromeProps = {
  readonly contextEventId: string;
  readonly layout: WorkspaceCapabilityLayout;
  readonly view: WorkspaceCapabilityViewModel;
  readonly title: string;
  readonly progress: number;
  readonly agentStatusKo: string;
  readonly map: ReactNode;
  readonly agentDock: ReactNode | null;
  readonly onClose: () => void;
  readonly onCommit: () => void;
  readonly commitDisabled: boolean;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onOpenCompare?: () => void;
  readonly weatherKo?: string | null;
};

function CapCard({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-white/95 shadow-[0_8px_28px_rgba(25,31,40,0.08)] ring-1 ring-black/[0.04]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-black/[0.04] px-3 py-2">
        <p className="text-[11px] font-bold tracking-tight text-[#191f28]">
          {title}
        </p>
        {onClose ? (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
            aria-label={`${title} 닫기`}
            onClick={onClose}
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

export function WorkspaceCapabilityChrome({
  contextEventId,
  layout,
  view,
  title,
  progress,
  agentStatusKo: _agentStatusKo,
  map,
  agentDock,
  onClose,
  onCommit,
  commitDisabled,
  onSelectNode,
  onOpenCompare,
  weatherKo = null,
}: WorkspaceCapabilityChromeProps) {
  void _agentStatusKo;
  const showOverview =
    isCapabilityOpen(layout, "trip_overview") ||
    isCapabilityOpen(layout, "search_summary");
  const showDayRail = isCapabilityOpen(layout, "day_rail");
  const showCandidates = isCapabilityOpen(layout, "candidate_list");
  const showTimeline = isCapabilityOpen(layout, "timeline");
  const showBudget = isCapabilityOpen(layout, "budget");
  const showBooking = isCapabilityOpen(layout, "booking");
  const showInspector = isCapabilityOpen(layout, "inspector");
  const showDecision = isCapabilityOpen(layout, "ai_decision");
  const showWeather = isCapabilityOpen(layout, "weather");
  const showMembers = isCapabilityOpen(layout, "members");
  const showPermission = isCapabilityOpen(layout, "permission");
  const showSuggestion = isCapabilityOpen(layout, "suggestion");
  const showComments = isCapabilityOpen(layout, "comments");
  const showPayment = isCapabilityOpen(layout, "payment");
  const showCancellation = isCapabilityOpen(layout, "cancellation");
  const showCommit = isCapabilityOpen(layout, "commit_gate");
  const showCompare = isCapabilityOpen(layout, "compare");
  const showMap = isCapabilityOpen(layout, "map");

  const weatherSize =
    layout.items.find((i) => i.id === "weather")?.size ?? "sm";

  const closeCap = (
    id:
      | "day_rail"
      | "candidate_list"
      | "weather"
      | "ai_decision"
      | "timeline"
      | "budget"
      | "booking"
      | "payment"
      | "cancellation"
      | "members"
      | "permission"
      | "suggestion"
      | "comments"
      | "inspector",
  ) => {
    applyWorkspaceCapabilityOp({
      contextEventId,
      op: { type: "close", id },
    });
  };

  const leftOpen = showDayRail || showCandidates;
  const rightOpen =
    showTimeline ||
    showBudget ||
    showBooking ||
    showInspector ||
    showDecision ||
    showMembers ||
    showPermission ||
    showSuggestion ||
    showComments ||
    showPayment ||
    showCancellation;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-[#eef1f5]">
      <header className="relative z-[6] flex shrink-0 items-center gap-2 border-b border-black/[0.04] bg-white/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#191f28]"
          onClick={onClose}
          aria-label={copy.globe.workspaceCollapse}
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-bold tracking-tight text-[#191f28]">
            {title}
          </p>
          {showOverview ? (
            <p className="truncate text-[10px] tabular-nums text-[#8b95a1]">
              {view.overviewLineKo}
              {progress > 0 ? ` · ${progress}%` : ""}
            </p>
          ) : (
            <p className="truncate text-[10px] text-[#8b95a1]">
              {copy.globe.workspaceCapabilityIntentHint(layout.intentId)}
            </p>
          )}
        </div>
        {showCompare ? (
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#f2f4f6] px-2.5 py-2 text-[10px] font-bold text-[#191f28]"
            onClick={onOpenCompare}
          >
            Compare
          </button>
        ) : null}
        {showCommit ? (
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-40"
            onClick={onCommit}
            disabled={commitDisabled}
            data-workspace-commit
          >
            {copy.globe.workspaceCommitCta}
          </button>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden">
          {showMap ? (
            map
          ) : (
            <div className="flex h-full items-center justify-center bg-[#eef1f5] text-[12px] text-[#8b95a1]">
              지도 Capability가 꺼져 있어요
            </div>
          )}
        </div>

        {leftOpen ? (
          <aside className="pointer-events-none absolute bottom-20 left-2 top-2 z-[4] flex w-[min(220px,28%)] flex-col">
            <div className="pointer-events-auto flex max-h-full min-h-0 flex-col gap-2 overflow-y-auto">
              {showDayRail ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityDayRail}
                  onClose={() => closeCap("day_rail")}
                >
                  <div className="space-y-1.5">
                    {view.days.map((d) => {
                      const active = view.focusedDay === d.day;
                      return (
                        <button
                          key={d.day}
                          type="button"
                          className={cn(
                            "w-full rounded-xl px-2.5 py-2 text-left transition",
                            active
                              ? "bg-[#e8f3ff] ring-1 ring-[#3182f6]/30"
                              : "hover:bg-[#f9fafb]",
                          )}
                          onClick={() =>
                            applyWorkspaceCapabilityOp({
                              contextEventId,
                              op: { type: "set_focused_day", day: d.day },
                            })
                          }
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: d.accent }}
                            />
                            <span className="text-[12px] font-bold text-[#191f28]">
                              {d.labelKo}
                            </span>
                            <span className="ml-auto text-[10px] tabular-nums text-[#8b95a1]">
                              {d.placeCount}
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#8b95a1]">
                            {d.lineKo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CapCard>
              ) : null}

              {showCandidates ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityCandidates}
                  onClose={() => closeCap("candidate_list")}
                >
                  <div className="space-y-1">
                    {view.timeline.length === 0 ? (
                      <p className="px-1 text-[11px] text-[#8b95a1]">
                        후보가 아직 없어요
                      </p>
                    ) : (
                      view.timeline.map((row, index) => (
                        <button
                          key={row.nodeId}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[#f9fafb]"
                          onClick={() => onSelectNode(row.nodeId)}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[10px] font-bold text-[#191f28]">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-[#191f28]">
                              {row.title}
                            </span>
                            <span className="block truncate text-[10px] text-[#8b95a1]">
                              {row.amountLabel ?? row.summaryKo}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </CapCard>
              ) : null}
            </div>
          </aside>
        ) : null}

        {showWeather && weatherKo ? (
          <div
            className={cn(
              "pointer-events-auto absolute top-3 z-[4] rounded-2xl bg-white/96 px-3 py-2 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]",
              weatherSize === "lg" || weatherSize === "xl"
                ? "max-w-[240px] text-[13px]"
                : "max-w-[180px] text-[11px]",
              leftOpen
                ? "left-[calc(min(220px,28%)+0.75rem)]"
                : "left-1/2 -translate-x-1/2",
            )}
          >
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 font-semibold text-[#191f28]">
                {weatherKo}
              </p>
              <button
                type="button"
                className="text-[#8b95a1]"
                aria-label="날씨 닫기"
                onClick={() => closeCap("weather")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : null}

        {rightOpen ? (
          <aside className="pointer-events-none absolute bottom-20 right-2 top-2 z-[4] flex w-[min(280px,32%)] flex-col">
            <div className="pointer-events-auto flex max-h-full min-h-0 flex-col gap-2 overflow-y-auto">
              {showDecision ? (
                <CapCard
                  title="AI Decision"
                  onClose={() => closeCap("ai_decision")}
                >
                  <p className="text-[12px] font-semibold leading-snug text-[#191f28]">
                    {view.decisionLineKo}
                  </p>
                </CapCard>
              ) : null}

              {showTimeline ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityTimeline}
                  onClose={() => closeCap("timeline")}
                >
                  <ol className="space-y-1.5">
                    {view.timeline.map((row, index) => (
                      <li key={row.nodeId}>
                        <button
                          type="button"
                          className="flex w-full gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-[#f9fafb]"
                          onClick={() => onSelectNode(row.nodeId)}
                        >
                          <span className="mt-0.5 text-[10px] font-bold tabular-nums text-[#8b95a1]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-[#191f28]">
                              {row.title}
                            </span>
                            <span className="block truncate text-[10px] text-[#8b95a1]">
                              {row.summaryKo}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                    {view.timeline.length === 0 ? (
                      <p className="px-1 text-[11px] text-[#8b95a1]">
                        이 Day에 일정이 없어요
                      </p>
                    ) : null}
                  </ol>
                </CapCard>
              ) : null}

              {showBudget ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityBudget}
                  onClose={() => closeCap("budget")}
                >
                  <p className="text-[12px] font-bold text-[#191f28]">
                    {view.budget.labelKo}
                  </p>
                  <p className="mt-1 text-[10px] text-[#8b95a1]">
                    {view.budget.placeCount}곳 · 가격표기 {view.budget.withPrice}
                  </p>
                  {view.budget.sampleLabels.length > 0 ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-[#4e5968]">
                      {view.budget.sampleLabels.join(" · ")}
                    </p>
                  ) : null}
                </CapCard>
              ) : null}

              {showBooking ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityBooking}
                  onClose={() => closeCap("booking")}
                >
                  <div className="space-y-1">
                    {view.bookings.length === 0 ? (
                      <p className="text-[11px] text-[#8b95a1]">
                        예약 가능 후보가 아직 없어요
                      </p>
                    ) : (
                      view.bookings.map((b) => (
                        <button
                          key={b.nodeId}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[#f9fafb]"
                          onClick={() => onSelectNode(b.nodeId)}
                        >
                          <span className="truncate text-[12px] font-semibold text-[#191f28]">
                            {b.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-[#8b95a1]">
                            {b.amountLabel ?? "준비"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </CapCard>
              ) : null}

              {showPayment ? (
                <CapCard
                  title="Payment"
                  onClose={() => closeCap("payment")}
                >
                  <p className="text-[11px] leading-snug text-[#4e5968]">
                    Commit 전에는 prepare만 · 결제는 사람 승인 후
                  </p>
                </CapCard>
              ) : null}

              {showCancellation ? (
                <CapCard
                  title="Cancellation"
                  onClose={() => closeCap("cancellation")}
                >
                  <p className="text-[11px] leading-snug text-[#4e5968]">
                    숙소별 취소 정책을 Inspector에서 확인하세요
                  </p>
                </CapCard>
              ) : null}

              {showMembers ? (
                <CapCard
                  title="Members"
                  onClose={() => closeCap("members")}
                >
                  <p className="text-[11px] text-[#4e5968]">
                    {copy.globe.workspaceSharePeople}
                  </p>
                </CapCard>
              ) : null}

              {showPermission ? (
                <CapCard
                  title="Permission"
                  onClose={() => closeCap("permission")}
                >
                  <p className="text-[11px] text-[#4e5968]">
                    {copy.globe.workspaceShareSubtitle}
                  </p>
                </CapCard>
              ) : null}

              {showSuggestion ? (
                <CapCard
                  title="Suggestion"
                  onClose={() => closeCap("suggestion")}
                >
                  <p className="text-[11px] text-[#4e5968]">
                    친구 제안이 오면 여기에 모여요
                  </p>
                </CapCard>
              ) : null}

              {showComments ? (
                <CapCard
                  title="Comments"
                  onClose={() => closeCap("comments")}
                >
                  <p className="text-[11px] text-[#4e5968]">댓글은 곧 연결돼요</p>
                </CapCard>
              ) : null}

              {showInspector ? (
                <CapCard
                  title="Inspector"
                  onClose={() => closeCap("inspector")}
                >
                  <p className="text-[11px] leading-snug text-[#4e5968]">
                    핀을 고르면 장소 상세가 열려요 · Capability로 켜진 도구만
                    보입니다
                  </p>
                </CapCard>
              ) : null}
            </div>
          </aside>
        ) : null}

        {agentDock ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[5] flex justify-center px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto w-full max-w-[min(380px,92%)] drop-shadow-[0_10px_28px_rgba(25,31,40,0.18)]">
              {agentDock}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
