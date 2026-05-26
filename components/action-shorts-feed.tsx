"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import { FeedCategoryPills } from "@/components/feed-category-pills";
import { readPinnedUrl } from "@/lib/local-links/pinned-link";
import { shareDemoHref } from "@/lib/share/share-demo";
import {
  normalizeLinkCategory,
  type FeedCategoryFilter,
} from "@/lib/categories/types";
import { ActionShortsSlide } from "@/components/action-shorts-slide";
import { cn } from "@/lib/utils";

function filterFeedLinks(
  links: ReturnType<typeof useRealtimeLinks>["activeLinks"],
  filter: FeedCategoryFilter
) {
  if (filter === "all") {
    return links;
  }

  return links.filter(
    (link) => normalizeLinkCategory(link.category) === filter
  );
}

export function ActionShortsFeed() {
  const { activeLinks, archivedLinks } = useRealtimeLinks();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<FeedCategoryFilter>("all");

  const links = useMemo(
    () => filterFeedLinks(activeLinks, filter),
    [activeLinks, filter]
  );

  useEffect(() => {
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [filter]);

  useEffect(() => {
    if (!readPinnedUrl() || links.length === 0) {
      return;
    }

    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setActiveIndex(0);
  }, [links]);

  const onScroll = useCallback(() => {
    const node = containerRef.current;
    if (!node || links.length === 0) {
      return;
    }

    const slideHeight = node.clientHeight;
    if (slideHeight <= 0) {
      return;
    }

    const index = Math.round(node.scrollTop / slideHeight);
    setActiveIndex(Math.min(Math.max(index, 0), links.length - 1));
  }, [links.length]);

  if (activeLinks.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] flex-col items-center justify-center text-center">
        <p className="text-4xl">👀</p>
        <p className="mt-4 text-lg font-medium">비었어요</p>
        <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">
          다른 앱에서 링크를 공유하면 다음 행동이 바로 떠요.
        </p>
        <Link
          href={shareDemoHref()}
          className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-transform active:scale-[0.98]"
        >
          공유 흐름 체험 →
        </Link>
        {archivedLinks.length > 0 ? (
          <Link
            href="/archive"
            className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            👀 보관함 {archivedLinks.length}개
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative -mx-5 h-[calc(100dvh-7.5rem)]">
      <FeedCategoryPills value={filter} onChange={setFilter} />

      {links.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 pt-12 text-center">
          <p className="text-sm text-muted-foreground">
            이 카테고리에 링크가 없어요.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-4 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            전체 보기
          </button>
        </div>
      ) : (
        <>
          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
            {links.map((link, index) => (
              <button
                key={link.id}
                type="button"
                aria-label={`Slide ${index + 1}`}
                onClick={() => {
                  const node = containerRef.current;
                  if (!node) {
                    return;
                  }
                  node.scrollTo({
                    top: index * node.clientHeight,
                    behavior: "smooth",
                  });
                }}
                className={cn(
                  "rounded-full transition-all",
                  index === activeIndex
                    ? "size-2 bg-foreground"
                    : "size-1.5 bg-muted-foreground/35"
                )}
              />
            ))}
          </div>

          <div
            ref={containerRef}
            onScroll={onScroll}
            className="h-full overflow-y-auto scroll-smooth snap-y snap-mandatory overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {links.map((link, index) => (
              <div
                key={link.id}
                className="h-full min-h-full snap-start snap-always"
              >
                <ActionShortsSlide
                  link={link}
                  index={index}
                  total={links.length}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] tracking-wide text-muted-foreground/60">
        ↑ ↓ 스와이프
      </p>
    </div>
  );
}
