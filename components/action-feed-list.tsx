"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionCard } from "@/components/action-card";
import { InboxFilter } from "@/components/inbox-filter";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import { shareDemoHref } from "@/lib/share/share-demo";
import {
  normalizeLinkCategory,
  type InboxFilterValue,
} from "@/lib/categories/types";

function countByCategory(links: { category: string | null }[]) {
  const counts: Partial<Record<InboxFilterValue, number>> = { all: links.length };

  for (const link of links) {
    const category = normalizeLinkCategory(link.category);
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return counts;
}

export function ActionFeedList() {
  const { activeLinks, archivedLinks } = useRealtimeLinks();
  const [filter, setFilter] = useState<InboxFilterValue>("all");
  const archivedCount = archivedLinks.length;

  const counts = useMemo(() => countByCategory(activeLinks), [activeLinks]);

  const filteredLinks = useMemo(() => {
    if (filter === "all") {
      return activeLinks;
    }

    return activeLinks.filter(
      (link) => normalizeLinkCategory(link.category) === filter
    );
  }, [activeLinks, filter]);

  if (!activeLinks.length) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            아직 링크가 없어요. 공유하면 카테고리별로 모여요.
          </p>
          <Link
            href={shareDemoHref()}
            className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            공유 흐름 체험 →
          </Link>
        </div>
        {archivedCount > 0 ? <ArchiveHint count={archivedCount} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <InboxFilter value={filter} onChange={setFilter} counts={counts} />

      <AnimatePresence mode="popLayout" initial={false}>
        {filteredLinks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-3xl bg-card p-6 text-center shadow-sm"
          >
            <p className="text-sm text-muted-foreground">
              이 카테고리에 링크가 없어요.
            </p>
          </motion.div>
        ) : (
          filteredLinks.map((link, index) => (
            <motion.div
              key={link.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <ActionCard link={link} index={index} />
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {archivedCount > 0 ? <ArchiveHint count={archivedCount} /> : null}
    </div>
  );
}

function ArchiveHint({ count }: { count: number }) {
  return (
    <div className="pt-2 text-center">
      <Link
        href="/archive"
        className="text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground"
      >
        👀 보관함으로 이동된 링크 {count}개
      </Link>
    </div>
  );
}
