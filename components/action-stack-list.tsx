"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, Inbox } from "lucide-react";
import { toast } from "sonner";
import { ActionCard } from "@/components/action-card";
import {
  RIMVIO_TYPE,
  rimvioHeroCtaClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";
import { useGlobeInbox } from "@/hooks/use-globe-inbox";
import { resolveLinkMainOffer } from "@/lib/action-chat/resolve-link-main-offer";
import {
  foldSurfaceLinkLearning,
  recordSurfaceLinkActionTelemetry,
} from "@/lib/archive/record-surface-link-telemetry";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import {
  dismissLinkId,
  readDismissedIds,
} from "@/lib/local-links/now-session";
import { copy } from "@/lib/copy/human-ko";
import { PulseMainActionSurface } from "@/components/pulse/pulse-main-action-surface";
import { MarketAlignmentSummary } from "@/components/market/market-alignment-summary";
import { StackGlobePickupCard } from "@/components/stack/stack-globe-pickup-card";

export function ActionStackList() {
  const { activeLinks, archivedLinks } = useRealtimeLinks();
  const [dismissed, setDismissed] = useState(() => readDismissedIds());
  const { notifications, totalCount: inboxCount } = useGlobeInbox(true);
  const topInboxNotification = notifications[0] ?? null;

  const stackLinks = useMemo(
    () => activeLinks.filter((link) => !dismissed.has(link.id)),
    [activeLinks, dismissed],
  );

  const topLink = stackLinks[0];
  const ghostLinks = stackLinks.slice(1, 3);
  const remaining = stackLinks.length - 1;

  const handleDone = () => {
    if (!topLink) {
      return;
    }

    const offer = resolveLinkMainOffer({ link: topLink, surface: "stack" });
    if (offer.primary) {
      recordSurfaceLinkActionTelemetry({
        link: topLink,
        action: offer.primary,
        kind: "dismissed",
        surface: "stack",
      });
      foldSurfaceLinkLearning({ linkId: topLink.id, link: topLink });
    }

    dismissLinkId(topLink.id);
    setDismissed((current) => new Set([...current, topLink.id]));
    toast("👀 Done", { description: topLink.title });
  };

  if (!topLink && !topInboxNotification) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
        <StackGlobePickupCard className="mb-4 text-left" />
        <PulseMainActionSurface
          enabled
          className="mb-6 w-full max-w-sm text-left"
        />
        <MarketAlignmentSummary enabled className="mb-4 w-full max-w-sm text-left" />
        <p className="text-4xl">👀</p>
        <p className={cn("mt-4", RIMVIO_TYPE.headline)}>All clear</p>
        <p className={cn("mt-2 max-w-[16rem]", RIMVIO_TYPE.caption)}>
          Share a link from another app — your next action appears here.
        </p>
        {archivedLinks.length > 0 ? (
          <Link
            href="/archive"
            className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            👀 보관함 {archivedLinks.length}개
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <StackGlobePickupCard className="px-4 pt-2" />
      {!topLink && topInboxNotification ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <article
            className={cn(rimvioSurfaceCardClass("w-full max-w-sm p-4"), "text-left")}
            data-rimvio-stack-inbox-hint
          >
            <p className={cn(RIMVIO_TYPE.eyebrow, "text-primary")}>
              {copy.globe.inboxTitle}
            </p>
            <p className={cn("mt-1 font-semibold", RIMVIO_TYPE.body)}>
              {topInboxNotification.title}
            </p>
            <p className={cn("mt-1", RIMVIO_TYPE.caption)}>{topInboxNotification.body}</p>
            <Link
              href="/?openGlobeInbox=1"
              className={cn(rimvioHeroCtaClass(), "mt-4 inline-flex w-full gap-2")}
            >
              <Inbox className="size-4" aria-hidden />
              {inboxCount > 1
                ? `${copy.globe.bridgeStackPrepInviteCta} · ${inboxCount}건`
                : copy.globe.bridgeStackPrepInviteCta}
            </Link>
          </article>
        </div>
      ) : null}

      {topLink ? (
        <>
          <div className="px-4 pt-3">
            <PulseMainActionSurface enabled className="mb-3 w-full max-w-md mx-auto" />
            <MarketAlignmentSummary enabled className="mb-3 w-full max-w-md mx-auto" />
          </div>
          <div className="relative flex-1 pt-1">
            {ghostLinks
              .slice()
              .reverse()
              .map((link, index) => (
                <div
                  key={link.id}
                  className="pointer-events-none absolute inset-x-4 opacity-[0.35]"
                  style={{
                    top: `${(ghostLinks.length - 1 - index) * 10}px`,
                    transform: `scale(${0.96 - index * 0.02})`,
                    zIndex: index,
                  }}
                >
                  <div className="rounded-[1.25rem] bg-muted/80 p-4 shadow-sm">
                    <p className="line-clamp-1 text-sm font-semibold text-muted-foreground">
                      {link.title}
                    </p>
                  </div>
                </div>
              ))}
            <motion.div layout className="relative z-10 px-4">
              <ActionCard link={topLink} index={0} />
            </motion.div>
          </div>

          {inboxCount > 0 ? (
            <Link
              href="/?openGlobeInbox=1"
              className={cn(
                "mx-4 mb-2 flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-semibold text-primary active:bg-muted",
              )}
            >
              <Inbox className="size-3.5" aria-hidden />
              {copy.globe.inboxTitle} · {inboxCount}건
            </Link>
          ) : null}

          <button
            type="button"
            onClick={handleDone}
            className={cn(rimvioHeroCtaClass(), "mx-4 mt-2 shrink-0")}
          >
            <ChevronUp className="mr-2 size-4" strokeWidth={2.5} aria-hidden />
            Done · next
          </button>

          <div className="mt-3 flex items-center justify-between px-5 text-xs text-muted-foreground">
            {remaining > 0 ? (
              <span>{remaining} more in stack</span>
            ) : (
              <span>Stack clear after this</span>
            )}
            <Link
              href="/inbox"
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              All links →
            </Link>
          </div>

          {archivedLinks.length > 0 ? (
            <p className="mt-2 text-center text-xs text-muted-foreground/80">
              <Link href="/archive" className="hover:underline">
                👀 보관함 {archivedLinks.length}개
              </Link>
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}