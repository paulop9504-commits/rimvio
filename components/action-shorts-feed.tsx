"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import { ActionChatFeed } from "@/components/action-chat-feed";
import { FeedUndoBar, FEED_UNDO_MS } from "@/components/feed-undo-bar";
import { useContextRemote } from "@/hooks/use-context-remote";
import { useLocateFromImage } from "@/hooks/use-locate-from-image";
import { FeedLinkAddSheet } from "@/components/feed-link-add-sheet";
import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { toastNextLinkSuggestion } from "@/lib/links/next-link-toast";
import { FeedGestureCoach } from "@/components/feed-gesture-coach";
import { runContainerMaintenance } from "@/lib/containers/context-containers";
import { PwaInstallNudge } from "@/components/pwa-install-nudge";
import { GlangoLogo } from "@/components/glango-logo";
import { useCopy } from "@/hooks/use-copy";
import { addLinkToRoom } from "@/lib/rooms/client";
import { readPinnedUrl } from "@/lib/local-links/pinned-link";
import { persistDismissedLink } from "@/lib/links/dismiss-link";
import {
  isSampleFeedLink,
  maybeDismissSampleFeedAfterSwipe,
} from "@/lib/onboarding/sample-feed";
import { readDismissedLinkIds } from "@/lib/local-links/store";
import type { LinkRow } from "@/types/database";
import { GRID } from "@/lib/ui/responsive-grid";
import { ingestCaptureToken, ingestScreenshot } from "@/lib/share/ingest-screenshot";
import { cn } from "@/lib/utils";

function filterFeedLinks(activeLinks: LinkRow[]) {
  return activeLinks;
}

type PendingDismiss = {
  link: LinkRow;
  index: number;
};

/** Full slide height — categories overlay on card 1; desktop omits bottom nav inset. */
const FEED_VIEWPORT_CLASS = GRID.feedViewport;

/** IG-style bottom tab bar */
export const FEED_BOTTOM_NAV_OFFSET =
  "max(3.25rem,calc(env(safe-area-inset-bottom)+2.85rem))";

export function ActionShortsFeed() {
  const copy = useCopy();
  const router = useRouter();
  const { activeLinks, archivedLinks, dismissLink, restoreLink } = useRealtimeLinks();
  const searchParams = useSearchParams();
  const pendingDismissRef = useRef<PendingDismiss | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingDismiss, setPendingDismiss] = useState<PendingDismiss | null>(
    null
  );
  const [linkAddOpen, setLinkAddOpen] = useState(false);
  const [linkAddClipboard, setLinkAddClipboard] = useState(false);
  const captureHandledRef = useRef(false);
  const quickCameraRef = useRef<HTMLInputElement>(null);
  const quickCaptureBusyRef = useRef(false);
  const pendingCaptureScrollRef = useRef(false);

  const openLinkAdd = useCallback((options?: { requestClipboard?: boolean }) => {
    setLinkAddClipboard(Boolean(options?.requestClipboard));
    setLinkAddOpen(true);
  }, []);

  const links = useMemo(
    () => filterFeedLinks(activeLinks),
    [activeLinks]
  );
  const linksLengthRef = useRef(links.length);

  const activeLink = activeIndex >= 0 ? links[activeIndex] ?? null : null;
  const {
    loading: locateLoading,
    result: locateResult,
    locateFromFile,
  } = useLocateFromImage();
  const showLocateOnFeed = Boolean(locateLoading || locateResult);
  const { remote } = useContextRemote(activeLink);
  const feedRemote = showLocateOnFeed ? null : remote;

  useEffect(() => {
    runContainerMaintenance();
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (index < 0) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex(Math.min(Math.max(index, 0), Math.max(links.length - 1, 0)));
    },
    [links.length]
  );

  useEffect(() => {
    if (!pendingCaptureScrollRef.current) {
      linksLengthRef.current = links.length;
      return;
    }

    if (links.length <= linksLengthRef.current) {
      return;
    }

    pendingCaptureScrollRef.current = false;
    linksLengthRef.current = links.length;
    requestAnimationFrame(() => {
      scrollToIndex(0);
    });
  }, [links.length, scrollToIndex]);

  const clearPendingDismiss = useCallback(() => {
    pendingDismissRef.current = null;
    setPendingDismiss(null);
  }, []);

  const commitPendingDismiss = useCallback((link: LinkRow) => {
    void persistDismissedLink(link);
    if (isSampleFeedLink(link)) {
      const dismissed = readDismissedLinkIds();
      dismissed.add(link.id);
      maybeDismissSampleFeedAfterSwipe(dismissed);
    }
    clearPendingDismiss();
  }, [clearPendingDismiss]);

  const handleUndo = useCallback(() => {
    const pending = pendingDismissRef.current;
    if (!pending) {
      return;
    }

    restoreLink(pending.link);
    clearPendingDismiss();
    requestAnimationFrame(() => scrollToIndex(pending.index));
  }, [clearPendingDismiss, restoreLink, scrollToIndex]);

  useEffect(() => {
    if (searchParams.get("paste") !== "1") {
      return;
    }

    openLinkAdd({ requestClipboard: true });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("paste");
    const next = params.toString();
    router.replace(next ? `/?${next}` : "/", { scroll: false });
  }, [openLinkAdd, router, searchParams]);

  useEffect(() => {
    const captureToken = searchParams.get("capture");
    const captureError = searchParams.get("capture_error");

    if (!captureToken && !captureError) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("capture");
    params.delete("capture_error");
    const next = params.toString();
    router.replace(next ? `/?${next}` : "/", { scroll: false });

    if (captureError) {
      toast.error(
        captureError === "too_large"
          ? "스크린샷 용량이 너무 커요"
          : "스크린샷을 처리하지 못했어요"
      );
      return;
    }

    if (!captureToken || captureHandledRef.current) {
      return;
    }

    captureHandledRef.current = true;

    void ingestCaptureToken(captureToken)
      .then(() => {
        toast.success(copy.feed.newLinkSaved);
        requestAnimationFrame(() => scrollToIndex(0));
      })
      .catch(() => {
        toast.error(copy.feed.screenshotFailed);
      });
  }, [copy.feed.newLinkSaved, copy.feed.screenshotFailed, router, scrollToIndex, searchParams]);

  useEffect(() => {
    if (!readPinnedUrl() || links.length === 0) {
      return;
    }

    setActiveIndex(0);
  }, [links]);

  const handleDismiss = useCallback(
    (link: LinkRow, index: number) => {
      if (pendingDismissRef.current) {
        commitPendingDismiss(pendingDismissRef.current.link);
      }

      dismissLink(link);
      const pending = { link, index };
      pendingDismissRef.current = pending;
      setPendingDismiss(pending);

      requestAnimationFrame(() => {
        if (links.length <= 1) {
          return;
        }

        const nextIndex = Math.min(index, links.length - 2);
        scrollToIndex(nextIndex);
        toastNextLinkSuggestion(link, links, (next) => {
          const targetIndex = links.findIndex((item) => item.id === next.id);
          if (targetIndex >= 0) {
            scrollToIndex(targetIndex);
          }
        });
      });
    },
    [commitPendingDismiss, dismissLink, links.length, scrollToIndex]
  );

  const handleUndoExpire = useCallback(() => {
    const pending = pendingDismissRef.current;
    if (!pending) {
      return;
    }

    commitPendingDismiss(pending.link);
  }, [commitPendingDismiss]);

  const handleLinkSaved = useCallback(() => {
    pendingCaptureScrollRef.current = true;
  }, []);

  const handleLocateImage = useCallback(
    (file: File) => {
      const run = (coords?: { lat: number; lng: number }) => {
        void locateFromFile(file, coords);
      };

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            run({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            run();
          },
          { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4000 }
        );
        return;
      }

      run();
    },
    [locateFromFile]
  );

  const handlePaymentDetected = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  const handleQuickCaptureFile = useCallback(
    async (file: File | null) => {
      if (!file || quickCaptureBusyRef.current) {
        return;
      }

      quickCaptureBusyRef.current = true;
      const toastId = toast.loading(copy.feed.screenshotProcessing);

      try {
        await ingestScreenshot(file);
        handleLinkSaved();
        handleLocateImage(file);
        toast.success(copy.feed.captureIntentFound, { id: toastId });
      } catch (error) {
        if (error instanceof Error && error.message === "screenshot_no_intent") {
          toast.error(copy.feed.screenshotNoIntent, { id: toastId });
          return;
        }

        toast.error(copy.feed.screenshotFailed, { id: toastId });
      } finally {
        quickCaptureBusyRef.current = false;
      }
    },
    [
      copy.feed.captureIntentFound,
      copy.feed.screenshotFailed,
      copy.feed.screenshotNoIntent,
      handleLinkSaved,
      handleLocateImage,
      handlePaymentDetected,
    ]
  );

  const handleSendToRoom = useCallback(
    async (link: LinkRow, index: number) => {
      try {
        const { room } = await addLinkToRoom(link);
        toast.success(copy.room.addedToRoom, {
          description: copy.room.addedToRoomHint(room.name),
          action: {
            label: copy.room.openRoom,
            onClick: () => router.push(`/r/${room.slug}`),
          },
        });

        requestAnimationFrame(() => {
          if (links.length <= 1) {
            return;
          }

          const nextIndex = Math.min(index + 1, links.length - 1);
          if (nextIndex !== index) {
            scrollToIndex(nextIndex);
          }
        });
      } catch {
        toast.error(copy.room.createFail);
      }
    },
    [
      copy.room.addedToRoom,
      copy.room.addedToRoomHint,
      copy.room.createFail,
      copy.room.openRoom,
      links.length,
      router,
      scrollToIndex,
    ]
  );

  if (activeLinks.length === 0 && archivedLinks.length === 0) {
    return (
      <>
        <div className="flex h-[calc(100dvh-8rem)] flex-col items-center justify-center text-center">
          <GlangoLogo size="xl" framed className="mb-5" />
          <p className="text-lg font-medium">비었어요</p>
          <p className="mt-2 max-w-[18rem] text-sm text-muted-foreground">
            {copy.feed.emptyShareHint}
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => openLinkAdd({ requestClipboard: true })}
              className="rounded-[14px] bg-glango-neon-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
            >
              {copy.feed.capturePill}
            </button>
            <Link
              href="/welcome"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              시작하기 →
            </Link>
          </div>
          {archivedLinks.length > 0 ? (
            <Link
              href="/archive"
              className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              👀 보관함 {archivedLinks.length}개
            </Link>
          ) : null}
        </div>

        <FeedLinkAddSheet
          open={linkAddOpen}
          onOpenChange={setLinkAddOpen}
          onSaved={handleLinkSaved}
          onPaymentDetected={handlePaymentDetected}
          onLocateImage={handleLocateImage}
          requestClipboard={linkAddClipboard}
        />
      </>
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", GRID.feedStage, FEED_VIEWPORT_CLASS)}>

      <input
        ref={quickCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void handleQuickCaptureFile(file);
        }}
      />

      {links.length === 0 ? (
        <ActionChatFeed
          links={[]}
          activeIndex={0}
          onSelectIndex={() => {}}
          onOpenLinkPaste={() => openLinkAdd({ requestClipboard: true })}
          onOpenCapture={() => quickCameraRef.current?.click()}
          onQuickCapture={(file) => void handleQuickCaptureFile(file)}
          className="min-h-0 flex-1"
        />
      ) : (
        <ActionChatFeed
          links={links}
          activeIndex={activeIndex}
          onSelectIndex={scrollToIndex}
          contextRemote={feedRemote}
          locateResult={locateResult}
          locateLoading={locateLoading}
          onOpenLinkPaste={() => openLinkAdd({ requestClipboard: true })}
          onOpenCapture={() => quickCameraRef.current?.click()}
          onQuickCapture={(file) => void handleQuickCaptureFile(file)}
          className="min-h-0 flex-1"
        />
      )}

      <AnimatePresence>
        {pendingDismiss ? (
          <FeedUndoBar
            key={pendingDismiss.link.id}
            title={sanitizeLinkTitle({
              title: pendingDismiss.link.title,
              original_url: pendingDismiss.link.original_url,
              domain: pendingDismiss.link.domain,
              source_type: pendingDismiss.link.source_type,
              category: pendingDismiss.link.category,
            })}
            onUndo={handleUndo}
            onExpire={handleUndoExpire}
          />
        ) : null}
      </AnimatePresence>

      <FeedGestureCoach />

      <PwaInstallNudge />

      <FeedLinkAddSheet
        open={linkAddOpen}
        onOpenChange={setLinkAddOpen}
        onSaved={handleLinkSaved}
        onPaymentDetected={handlePaymentDetected}
        onLocateImage={handleLocateImage}
        requestClipboard={linkAddClipboard}
      />
    </div>
  );
}
