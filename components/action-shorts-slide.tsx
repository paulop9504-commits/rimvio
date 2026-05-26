"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  Copy,
  ExternalLink,
  RefreshCw,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDomainGradient,
  getDomainInitial,
} from "@/lib/utils/domain-gradient";
import { runAndTrackLinkAction, analyticsFromLink } from "@/lib/analytics/track-client";
import {
  shadowAction,
  triggerActionHaptic,
} from "@/lib/action-shadowing";
import type { LinkActionItem, LinkRow } from "@/types/database";
import { isPinnedLinkUrl } from "@/lib/local-links/pinned-link";
import { cn } from "@/lib/utils";

const actionIcons: Record<LinkActionItem["kind"], LucideIcon> = {
  open: ExternalLink,
  save: Bookmark,
  share: Share2,
  remind: Bell,
  copy: Copy,
  custom: Sparkles,
};

type ActionShortsSlideProps = {
  link: LinkRow;
  index: number;
  total: number;
};

function HeroVisual({ link }: { link: LinkRow }) {
  const gradient = getDomainGradient(link.domain);
  const initial = getDomainInitial(link.domain);
  const isYouTube = link.domain.includes("youtube");

  if (link.thumbnail_url) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
        <Image
          src={link.thumbnail_url}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 448px) 100vw, 448px"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br shadow-lg ring-1",
        gradient,
        isYouTube ? "ring-red-500/20" : "ring-black/5"
      )}
    >
      <span className="text-7xl font-semibold text-white/95">{initial}</span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}

async function runAction(action: LinkActionItem, link: LinkRow) {
  const { copiedText } = await runAndTrackLinkAction(
    action,
    analyticsFromLink(link, "feed")
  );
  if (copiedText) {
    toast.success(`"${copiedText}" 복사됨 — 붙여넣기 하세요`);
  }
}

function SlideActionRail({
  hasMultipleActions,
  onShare,
  onNextAction,
}: {
  hasMultipleActions: boolean;
  onShare: () => void;
  onNextAction: () => void;
}) {
  return (
    <div className="absolute right-1 top-[38%] z-20 flex -translate-y-1/2 flex-col items-center gap-4">
      <button
        type="button"
        aria-label="링크 공유"
        onClick={onShare}
        className="flex flex-col items-center gap-1 text-foreground/90 transition-transform active:scale-95"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-background/70 shadow-sm ring-1 ring-border/40 backdrop-blur-md">
          <Share2 className="size-5" strokeWidth={2.25} />
        </span>
        <span className="text-[10px] font-medium">공유</span>
      </button>

      {hasMultipleActions ? (
        <button
          type="button"
          aria-label="다음 행동"
          onClick={onNextAction}
          className="flex flex-col items-center gap-1 text-foreground/90 transition-transform active:scale-95"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-background/70 shadow-sm ring-1 ring-border/40 backdrop-blur-md">
            <RefreshCw className="size-5" strokeWidth={2.25} />
          </span>
          <span className="text-[10px] font-medium leading-tight text-center">
            다음
            <br />
            행동
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function ActionShortsSlide({
  link,
  index,
  total,
}: ActionShortsSlideProps) {
  const router = useRouter();
  const actions = useMemo(
    () =>
      link.actions.length > 0
        ? link.actions
        : [
            {
              id: "fallback-open",
              label: "원본 열기",
              kind: "open" as const,
              href: link.original_url,
            },
          ],
    [link.actions, link.original_url]
  );

  const [actionIndex, setActionIndex] = useState(0);
  const focused = actions[actionIndex % actions.length];
  const secondary = actions.filter((_, i) => i !== actionIndex % actions.length).slice(0, 3);
  const FocusIcon = actionIcons[focused.kind] ?? ExternalLink;
  const isPinned = isPinnedLinkUrl(link.original_url);

  const handleFocusedAction = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }

    shadowAction(focused, {
      router,
      fallbackHref: link.original_url,
      intent: "touch",
    });
    runAction(focused, link);
  };

  const handleShare = async () => {
    triggerActionHaptic();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: link.title,
          url: link.original_url,
        });
        return;
      } catch {
        // User cancelled or share failed.
      }
    }

    await navigator.clipboard.writeText(link.original_url);
    toast.success("링크 복사됨");
  };

  const handleNextAction = () => {
    triggerActionHaptic();
    setActionIndex((current) => (current + 1) % actions.length);
  };

  return (
    <section className="relative flex h-full min-h-full w-full shrink-0 snap-start snap-always flex-col justify-between px-5 py-3 pt-10">
      <SlideActionRail
        hasMultipleActions={actions.length > 1}
        onShare={handleShare}
        onNextAction={handleNextAction}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} / {total}
        </span>
        {link.category || isPinned ? (
          <div className="flex items-center gap-1.5">
            {isPinned ? (
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-primary/10 text-primary"
              >
                👀 방금 공유
              </Badge>
            ) : null}
            {link.category ? (
              <Badge variant="secondary" className="rounded-full border-0">
                {link.category}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 py-4 pr-10">
        <HeroVisual link={link} />

        <div>
          <h2 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight">
            {link.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{link.domain}</p>
        </div>

        <Button
          className={cn(
            "h-14 w-full rounded-full text-base font-semibold shadow-sm",
            link.domain.includes("youtube") &&
              "border-red-500/20 bg-red-500/10 hover:bg-red-500/15"
          )}
          onClick={handleFocusedAction}
        >
          <FocusIcon className="mr-2 size-5" strokeWidth={2.25} />
          {focused.label}
        </Button>

        {secondary.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {secondary.map((action) => {
              const Icon = actionIcons[action.kind];
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action, link)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 py-2.5 text-sm font-medium backdrop-blur-md"
                >
                  <Icon className="size-4" strokeWidth={2} />
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
