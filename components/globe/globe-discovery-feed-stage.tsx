"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ImageIcon, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import {
  getInitialGlobeDiscoveryRevealCount,
  getNextGlobeDiscoveryRevealCount,
  hasMoreGlobeDiscoveryItems,
  resolveGlobeDiscoveryFeedStatus,
  type GlobeDiscoveryFeedStatus,
} from "@/lib/globe/discovery/globe-discovery-feed";
import { cn } from "@/lib/utils";

type DiscoveryAccent = "green" | "blue" | "orange" | "purple";

type GlobeDiscoveryFeedStageItem = {
  resourceId: string;
  title: string;
  score100: number;
  detailReasonLine: string;
  accent: DiscoveryAccent;
  thumbnailUrl: string | null;
};

type GlobeDiscoveryFeedStageAction = {
  label: string;
  href: string;
};

type GlobeDiscoveryFeedDataAttrs = {
  stage: string;
  header: string;
  chips: string;
  cards: string;
  footer: string;
  card: string;
};

type GlobeDiscoveryFeedStageProps<T extends GlobeDiscoveryFeedStageItem> = {
  areaLabel: string;
  areaSubtitle?: string | null;
  radiusM: number;
  searching: boolean;
  signalChips: readonly string[];
  items: readonly T[];
  activeResourceId?: string | null;
  onItemPress: (item: T) => void;
  onDismiss: () => void;
  getItemMeta: (item: T) => string | null;
  getItemSecondaryLine?: (item: T) => string | null;
  getItemAction?: (item: T) => GlobeDiscoveryFeedStageAction | null;
  radiusLabel: (radiusM: number) => string;
  footerRadiusLabel: (radiusM: number) => string;
  footerFoundLabel: (count: number) => string;
  searchBadgeLabel: string;
  searchingLabel: string;
  closeAriaLabel: string;
  dismissLabel: string;
  accentGlowClassName: string;
  searchBadgeClassName: string;
  dataAttrs: GlobeDiscoveryFeedDataAttrs;
  className?: string;
};

const ACCENT_DOT: Record<DiscoveryAccent, string> = {
  green: "bg-[#34c759]",
  blue: "bg-[#3182f6]",
  orange: "bg-[#ff9500]",
  purple: "bg-[#bf5af2]",
};

const ACCENT_RING: Record<DiscoveryAccent, string> = {
  green: "ring-[#34c759]/35",
  blue: "ring-[#3182f6]/35",
  orange: "ring-[#ff9500]/35",
  purple: "ring-[#bf5af2]/35",
};

function getFeedStatusCopy(
  status: GlobeDiscoveryFeedStatus,
  visibleCount: number,
  totalCount: number,
): string {
  switch (status) {
    case "loading_more":
      return copy.globe.discoveryFeedLoadingMore;
    case "more":
      return copy.globe.discoveryFeedShowing(visibleCount, totalCount);
    default:
      return copy.globe.discoveryFeedComplete;
  }
}

function DiscoveryFeedCard<T extends GlobeDiscoveryFeedStageItem>({
  item,
  meta,
  secondaryLine,
  action,
  onPress,
  dataAttr,
  active = false,
}: {
  item: T;
  meta: string | null;
  secondaryLine: string | null;
  action: GlobeDiscoveryFeedStageAction | null;
  onPress: () => void;
  dataAttr: string;
  active?: boolean;
}) {
  const cardDataProps = { [dataAttr]: true };

  return (
    <div
      className={cn(
        "w-full rounded-[1.05rem] bg-[#1c1c1e]/92 p-2.5 text-left ring-1 backdrop-blur-md",
        ACCENT_RING[item.accent],
        active && "bg-[#202228]/96 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_24px_rgba(0,0,0,0.2)]",
      )}
      {...cardDataProps}
    >
      <button
        type="button"
        onClick={onPress}
        aria-pressed={active}
        className="block w-full text-left transition-transform active:scale-[0.99]"
      >
        <div className="relative overflow-hidden rounded-[0.9rem] bg-[#101114]">
          <div className="aspect-[16/9]">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Places/Naver thumbnails are arbitrary remote URLs; lightweight lazy images keep this feed flexible.
              <img
                src={item.thumbnailUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_rgba(16,17,20,0.96))] text-white/32">
                <ImageIcon className="size-5" aria-hidden />
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/58 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
            <span
              className={cn("mt-0.5 inline-flex size-2 shrink-0 rounded-full", ACCENT_DOT[item.accent])}
              aria-hidden
            />
            <span className="rounded-full bg-black/48 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
              {item.score100}
              <span className="ml-0.5 text-white/58">/100</span>
            </span>
          </div>
        </div>
      </button>

      <div className="px-0.5 pb-0.5 pt-2">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onPress}
            aria-pressed={active}
            className="min-w-0 flex-1 text-left transition-transform active:scale-[0.99]"
          >
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
              {item.title}
            </p>
            {secondaryLine ? (
              <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-white/58">
                {secondaryLine}
              </p>
            ) : null}
            {meta ? <p className="mt-1 text-[11px] font-medium text-white/62">{meta}</p> : null}
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/78">
              {item.detailReasonLine}
            </p>
          </button>
          {action ? (
            <button
              type="button"
              onClick={() => window.open(action.href, "_blank", "noopener,noreferrer")}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/9 px-2.5 py-1.5 text-[10px] font-semibold text-white/82 ring-1 ring-white/12 active:bg-white/14"
              aria-label={action.label}
            >
              <span>{action.label}</span>
              <ArrowUpRight className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProgressiveDiscoveryFeedPanel<T extends GlobeDiscoveryFeedStageItem>({
  items,
  onItemPress,
  getItemMeta,
  getItemSecondaryLine,
  getItemAction,
  footerRadiusLabel,
  footerFoundLabel,
  radiusM,
  dataAttrs,
  activeResourceId,
  onDismiss,
  dismissLabel,
}: Pick<
  GlobeDiscoveryFeedStageProps<T>,
  | "items"
  | "onItemPress"
  | "getItemMeta"
  | "getItemSecondaryLine"
  | "getItemAction"
  | "footerRadiusLabel"
  | "footerFoundLabel"
  | "radiusM"
  | "dataAttrs"
  | "activeResourceId"
  | "onDismiss"
  | "dismissLabel"
>) {
  const cardsDataProps = { [dataAttrs.cards]: true };
  const footerDataProps = { [dataAttrs.footer]: true };
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreTimerRef = useRef<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(() =>
    getInitialGlobeDiscoveryRevealCount(items.length),
  );
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    return () => {
      if (loadMoreTimerRef.current != null) {
        window.clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, []);

  const hasMore = hasMoreGlobeDiscoveryItems(visibleCount, items.length);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const feedStatus = resolveGlobeDiscoveryFeedStatus({
    visibleCount,
    totalCount: items.length,
    loadingMore,
  });

  const requestMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    loadMoreTimerRef.current = window.setTimeout(() => {
      setVisibleCount((current) => getNextGlobeDiscoveryRevealCount(current, items.length));
      setLoadingMore(false);
      loadMoreTimerRef.current = null;
    }, 140);
  }, [hasMore, items.length, loadingMore]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          requestMore();
        }
      },
      {
        root,
        rootMargin: "0px 0px 240px 0px",
        threshold: 0.08,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, requestMore, visibleItems.length]);

  return (
    <div className="pointer-events-auto mx-3 overflow-hidden rounded-[1.25rem] bg-[#121316]/82 ring-1 ring-white/10 shadow-[0_14px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div
        ref={scrollRef}
        className="overflow-y-auto overscroll-contain px-3 pb-3 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maxHeight: "min(58svh, 36rem)" }}
        {...cardsDataProps}
      >
        <div className="space-y-2.5">
          {visibleItems.map((item) => (
            <DiscoveryFeedCard
              key={item.resourceId}
              item={item}
              meta={getItemMeta(item)}
              secondaryLine={getItemSecondaryLine?.(item) ?? null}
              action={getItemAction?.(item) ?? null}
              onPress={() => onItemPress(item)}
              dataAttr={dataAttrs.card}
              active={item.resourceId === activeResourceId}
            />
          ))}
        </div>
        <div
          ref={sentinelRef}
          className="flex min-h-12 items-center justify-center pb-1 pt-3 text-center text-[10px] font-medium text-white/55"
        >
          <span className={cn("rounded-full px-2.5 py-1", loadingMore ? "bg-white/8" : "bg-transparent")}>
            {getFeedStatusCopy(feedStatus, visibleItems.length, items.length)}
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-between border-t border-white/8 px-3 py-2 text-[10px] font-medium text-white/70"
        {...footerDataProps}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/82 ring-1 ring-white/10 active:bg-white/14"
        >
          {dismissLabel}
        </button>
        <span>
          {hasMore
            ? copy.globe.discoveryFeedShowing(visibleItems.length, items.length)
            : footerFoundLabel(items.length)}
        </span>
        <span>{footerRadiusLabel(radiusM)}</span>
      </div>
    </div>
  );
}

export function GlobeDiscoveryFeedStage<T extends GlobeDiscoveryFeedStageItem>({
  areaLabel,
  areaSubtitle = null,
  radiusM,
  searching,
  signalChips,
  items,
  onItemPress,
  onDismiss,
  getItemMeta,
  getItemSecondaryLine,
  getItemAction,
  radiusLabel,
  footerRadiusLabel,
  footerFoundLabel,
  searchBadgeLabel,
  searchingLabel,
  closeAriaLabel,
  dismissLabel,
  accentGlowClassName,
  searchBadgeClassName,
  dataAttrs,
  className,
  activeResourceId,
}: GlobeDiscoveryFeedStageProps<T>) {
  const stageDataProps = { [dataAttrs.stage]: true };
  const headerDataProps = { [dataAttrs.header]: true };
  const chipsDataProps = { [dataAttrs.chips]: true };
  const feedKey = useMemo(
    () => `${areaLabel}:${radiusM}:${items.map((item) => item.resourceId).join("|")}`,
    [areaLabel, items, radiusM],
  );

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[28] flex flex-col", className)}
      {...stageDataProps}
    >
      <div
        className="pointer-events-auto mx-3 mt-[max(0.35rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 rounded-[0.85rem] bg-[#121316]/88 px-3 py-2 ring-1 ring-white/10 backdrop-blur-xl"
        {...headerDataProps}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full self-start mt-1", accentGlowClassName)} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">{areaLabel}</p>
            {areaSubtitle?.trim() ? (
              <p className="truncate text-[10px] font-medium text-white/62">{areaSubtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
            {radiusLabel(radiusM)}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              searchBadgeClassName,
            )}
          >
            {searching ? searchingLabel : searchBadgeLabel}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/80 active:bg-white/20"
            aria-label={closeAriaLabel}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="pointer-events-auto mx-3 mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        {...chipsDataProps}
      >
        {signalChips.map((chip) => (
          <span
            key={chip}
            className="shrink-0 rounded-full bg-[#121316]/78 px-2.5 py-1 text-[10px] font-medium text-white/82 ring-1 ring-white/10 backdrop-blur-md"
          >
            {chip}
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.35rem)",
        }}
      >
        <ProgressiveDiscoveryFeedPanel
          key={feedKey}
          items={items}
          onItemPress={onItemPress}
          getItemMeta={getItemMeta}
          getItemSecondaryLine={getItemSecondaryLine}
          getItemAction={getItemAction}
          footerRadiusLabel={footerRadiusLabel}
          footerFoundLabel={footerFoundLabel}
          radiusM={radiusM}
          dataAttrs={dataAttrs}
          activeResourceId={activeResourceId}
          onDismiss={onDismiss}
          dismissLabel={dismissLabel}
        />
      </div>
    </div>
  );
}
