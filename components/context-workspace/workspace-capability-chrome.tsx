"use client";

/**
 * Web Capability Workspace chrome — Intent opens Objects, not fixed tabs.
 * Map fills the surface; Day/Timeline/Agent float over it (no layout band).
 * CapCard: internal scroll + corner resize (no content clip).
 */

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CloudSun, Navigation, X } from "lucide-react";
import {
  applyWorkspaceCapabilityOp,
  isCapabilityOpen,
  type WorkspaceCapabilityLayout,
  type WorkspaceCapabilityViewModel,
} from "@/lib/workspace-capability";
import { openWorkspaceItineraryRoute } from "@/lib/context-workspace/map/open-workspace-itinerary-route";
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

const CAP_CARD_MIN_H = 120;
const CAP_CARD_DEFAULT_MAX_H = 280;

function CapCard({
  title,
  onClose,
  children,
  className,
  defaultMaxH = CAP_CARD_DEFAULT_MAX_H,
  resizable = true,
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  defaultMaxH?: number;
  resizable?: boolean;
}) {
  const [maxH, setMaxH] = useState(defaultMaxH);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onResizeDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startH: maxH };
    },
    [maxH],
  );

  const onResizeMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const next = Math.min(
      Math.max(CAP_CARD_MIN_H, d.startH + (e.clientY - d.startY)),
      Math.round(window.innerHeight * 0.62),
    );
    setMaxH(next);
  }, []);

  const onResizeUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  }, []);

  return (
    <section
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-2xl bg-white/96 shadow-[0_8px_28px_rgba(25,31,40,0.1)] ring-1 ring-black/[0.05]",
        className,
      )}
      style={{ maxHeight: maxH }}
      data-capability-card={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.04] px-3 py-2">
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
        {children}
      </div>
      {resizable ? (
        <button
          type="button"
          className="absolute bottom-0.5 right-0.5 z-[1] flex h-4 w-4 cursor-se-resize items-end justify-end rounded-sm"
          aria-label={`${title} 크기 조절`}
          data-capability-resize-handle
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
        >
          <span
            className="pointer-events-none mb-0.5 mr-0.5 h-2 w-2 border-b-2 border-r-2 border-[#c4c4c4]"
            aria-hidden
          />
        </button>
      ) : null}
    </section>
  );
}

function WeatherChip({
  weatherKo,
  large,
  onClose,
  className,
}: {
  weatherKo: string;
  large?: boolean;
  onClose: () => void;
  className?: string;
}) {
  const tempMatch = weatherKo.match(/(-?\d+)\s*°\s*C/i);
  const dateMatch = weatherKo.match(
    /(\d{1,2})\s*[/.月]\s*(\d{1,2})|(오늘|내일|모레)/u,
  );
  const tempC = tempMatch?.[1] ?? null;
  const dateBit =
    dateMatch?.[0]?.replace(/\s+/g, "") ??
    (weatherKo.includes("/") ? weatherKo.split(/\s+/).find((s) => /\d/.test(s)) : null);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/96 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]",
        large ? "px-3.5 py-2.5" : "px-3 py-2",
        className,
      )}
      data-capability-weather-chip
    >
      <CloudSun
        className={cn(
          "shrink-0 text-[#f5a524]",
          large ? "h-5 w-5" : "h-4 w-4",
        )}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {tempC ? (
          <p
            className={cn(
              "font-extrabold tabular-nums tracking-tight text-[#191f28]",
              large ? "text-[15px]" : "text-[13px]",
            )}
          >
            {tempC}°C
            {dateBit ? (
              <span className="ml-1.5 text-[11px] font-semibold text-[#8b95a1]">
                {dateBit}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-[11px] font-semibold leading-snug text-[#191f28]">
            {weatherKo}
          </p>
        )}
        {tempC && weatherKo.replace(tempMatch![0], "").trim() ? (
          <p className="mt-0.5 truncate text-[10px] text-[#8b95a1]">
            {weatherKo.replace(/\s*-?\d+\s*°\s*C/i, "").trim()}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 text-[#8b95a1]"
        aria-label="날씨 닫기"
        onClick={onClose}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function looksLikePrice(label: string | null | undefined): boolean {
  return Boolean(label && /[₩￥$€]|원|\d{3,}/u.test(label));
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

        {showDayRail && view.days.length > 0 ? (
          <div
            className={cn(
              "pointer-events-none absolute top-3 z-[5] flex max-w-[min(100%,calc(100%-1rem))] justify-center px-2",
              leftOpen
                ? "left-[calc(min(220px,28%)+0.5rem)] right-2"
                : "inset-x-2",
            )}
          >
            <div className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto rounded-full bg-white/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.06] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {view.days.map((d) => {
                const active = view.focusedDay === d.day;
                return (
                  <button
                    key={d.day}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                      active
                        ? "bg-[#191f28] text-white"
                        : "bg-white text-[#191f28] ring-1 ring-black/[0.08] hover:bg-[#f7f7f7]",
                    )}
                    onClick={() =>
                      applyWorkspaceCapabilityOp({
                        contextEventId,
                        op: { type: "set_focused_day", day: d.day },
                      })
                    }
                    data-workspace-day-tab={d.day}
                  >
                    {copy.globe.dayTabLabel(d.day)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {leftOpen ? (
          <aside className="pointer-events-none absolute bottom-20 left-2 top-2 z-[4] flex w-[min(220px,28%)] flex-col">
            <div className="pointer-events-auto flex max-h-full min-h-0 flex-col gap-2 overflow-y-auto">
              {showDayRail ? (
                <CapCard
                  title={copy.globe.workspaceCapabilityDayRail}
                  onClose={() => closeCap("day_rail")}
                  defaultMaxH={360}
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
                  defaultMaxH={340}
                >
                  <div className="space-y-1.5">
                    {view.discoverPlaces.length > 0
                      ? view.discoverPlaces.map((row) => (
                          <button
                            key={row.nodeId}
                            type="button"
                            className="flex w-full items-start gap-2.5 rounded-[14px] bg-[#f7f8fa] px-2.5 py-2 text-left ring-1 ring-black/[0.04] hover:bg-[#f2f4f6]"
                            onClick={() => onSelectNode(row.nodeId)}
                          >
                            <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#e8ebef]">
                              {row.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={row.thumbnailUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#8b95a1]">
                                  {row.kindLabelKo.slice(0, 2)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#4e5968] ring-1 ring-black/[0.04]">
                                  {row.kindLabelKo}
                                </span>
                                {row.rating != null ? (
                                  <span className="text-[10px] font-semibold tabular-nums text-[#8b95a1]">
                                    ★ {row.rating.toFixed(1)}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px] font-bold text-[#191f28]">
                                {row.title}
                              </span>
                              <span className="block truncate text-[10px] text-[#8b95a1]">
                                {row.amountLabel ?? row.summaryKo}
                              </span>
                            </span>
                          </button>
                        ))
                      : view.timeline.length === 0 ? (
                          <p className="px-1 text-[11px] text-[#8b95a1]">
                            맛집·장소 후보가 아직 없어요
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
          <WeatherChip
            weatherKo={weatherKo}
            large={weatherSize === "lg" || weatherSize === "xl"}
            onClose={() => closeCap("weather")}
            className={cn(
              "absolute top-3 z-[4]",
              leftOpen
                ? "left-[calc(min(220px,28%)+0.75rem)]"
                : "left-1/2 -translate-x-1/2",
            )}
          />
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
                  defaultMaxH={420}
                >
                  {(() => {
                    const focused =
                      view.days.find((d) => d.day === view.focusedDay) ??
                      view.days[0] ??
                      null;
                    const grouped = view.timeline.reduce<
                      Array<{ label: string; rows: typeof view.timeline }>
                    >((acc, row) => {
                      const bucket = acc.find((g) => g.label === row.timeOfDayKo);
                      if (bucket) {
                        bucket.rows = [...bucket.rows, row];
                        return acc;
                      }
                      return [...acc, { label: row.timeOfDayKo, rows: [row] }];
                    }, []);

                    return (
                      <div className="space-y-3">
                        {focused ? (
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-[#8b95a1]">
                              {copy.globe.dayTabLabel(focused.day)}
                            </p>
                            <p className="text-[15px] font-bold leading-snug text-[#191f28]">
                              {focused.labelKo}
                            </p>
                            <p className="line-clamp-3 text-[11px] leading-relaxed text-[#8b95a1]">
                              {focused.lineKo}
                            </p>
                          </div>
                        ) : null}

                        {view.timeline.length >= 2 ? (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#191f28] px-4 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98]"
                            onClick={() => openWorkspaceItineraryRoute(view.timeline)}
                          >
                            <Navigation className="size-4" aria-hidden />
                            {copy.globe.itineraryOpenRoute}
                          </button>
                        ) : null}

                        {grouped.map((group) => (
                          <div key={group.label} className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-[#8b95a1]">
                              {group.label}
                            </p>
                            {group.rows.map((row) => (
                              <button
                                key={row.nodeId}
                                type="button"
                                className="flex w-full items-start gap-2.5 rounded-[14px] bg-[#f7f8fa] px-2.5 py-2 text-left ring-1 ring-black/[0.04] hover:bg-[#f2f4f6]"
                                onClick={() => onSelectNode(row.nodeId)}
                              >
                                <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[#e8ebef]">
                                  {row.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={row.thumbnailUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#8b95a1]">
                                      {row.kindLabelKo.slice(0, 2)}
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#4e5968] ring-1 ring-black/[0.04]">
                                      {row.kindLabelKo}
                                    </span>
                                    {row.rating != null ? (
                                      <span className="text-[10px] font-semibold tabular-nums text-[#8b95a1]">
                                        ★ {row.rating.toFixed(1)}
                                        {row.reviewCount != null
                                          ? ` (${row.reviewCount.toLocaleString("ko-KR")})`
                                          : ""}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[13px] font-bold text-[#191f28]">
                                    {row.title}
                                  </span>
                                  <span className="block truncate text-[10px] text-[#8b95a1]">
                                    {row.summaryKo || row.amountLabel}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}

                        {view.timeline.length === 0 ? (
                          <p className="px-1 text-[11px] text-[#8b95a1]">
                            이 Day에 일정이 없어요
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
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
                  defaultMaxH={300}
                >
                  <div className="space-y-2">
                    {view.bookings.length === 0 ? (
                      <p className="text-[11px] text-[#8b95a1]">
                        예약 가능 후보가 아직 없어요
                      </p>
                    ) : (
                      view.bookings.map((b) => {
                        const priced = looksLikePrice(b.amountLabel);
                        const showCta = b.ctaKo === "예약하기" || priced;
                        return (
                          <button
                            key={b.nodeId}
                            type="button"
                            className="flex w-full flex-col gap-1.5 rounded-[14px] bg-[#f7f8fa] px-2.5 py-2 text-left ring-1 ring-black/[0.04] hover:bg-[#f2f4f6]"
                            onClick={() => onSelectNode(b.nodeId)}
                            data-capability-booking-offer
                          >
                            <span className="flex w-full items-start justify-between gap-2">
                              <span className="min-w-0 flex-1">
                                <span className="mb-0.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#3182f6] ring-1 ring-black/[0.04]">
                                  {b.bookableRoleKo}
                                </span>
                                <span className="block truncate text-[12px] font-bold text-[#191f28]">
                                  {b.title}
                                </span>
                              </span>
                              {priced ? (
                                <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#191f28]">
                                  {b.amountLabel}
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#8b95a1] ring-1 ring-black/[0.04]">
                                  {b.amountLabel ?? b.ctaKo}
                                </span>
                              )}
                            </span>
                            {showCta ? (
                              <span className="inline-flex h-8 w-full items-center justify-center rounded-full bg-[#3182f6] text-[11px] font-bold text-white">
                                {b.ctaKo}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}                  </div>
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
