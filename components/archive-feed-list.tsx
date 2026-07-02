"use client";

import Link from "next/link";
import { ActionCard } from "@/components/action-card";
import { useCopy } from "@/hooks/use-copy";
import { useRealtimeLinksOptional } from "@/hooks/use-realtime-links";
import {
  RIMVIO_TYPE,
  rimvioEmptyStateClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export function ArchiveFeedList() {
  const copy = useCopy();
  const realtime = useRealtimeLinksOptional();
  const archivedLinks = realtime?.archivedLinks ?? [];

  if (!archivedLinks.length) {
    return (
      <div className={cn(rimvioEmptyStateClass())}>
        <p className={RIMVIO_TYPE.body}>{copy.archive.emptyTitle}</p>
        <Link
          href="/"
          className="mt-3 inline-block text-xs text-muted-foreground/80 hover:text-muted-foreground"
        >
          ← {copy.archive.backHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {archivedLinks.map((link, index) => (
        <ActionCard key={link.id} link={link} index={index} />
      ))}
      <div className="pt-2 text-center">
        <Link
          href="/"
          className="text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        >
          ← {copy.archive.backHome}
        </Link>
      </div>
    </div>
  );
}
