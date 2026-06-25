"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Handshake, Loader2, MapPin, Users, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import {
  acceptMarketHandshakeRemote,
  startMarketHandshakeChatRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";
import { peerRoomPath } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { GlobeDwellConfirmSheet } from "@/components/globe/globe-dwell-confirm-sheet";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import { attachMatchingPoolMediaAfterSeal } from "@/lib/globe/passive-context/attach-matching-pool-media-after-seal";
import { markGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import {
  canOfferGlobeLocationPrompt,
  markGlobeLocationPromptOffered,
} from "@/lib/globe/globe-location-prompt-budget";
import {
  groupNotificationsBySection,
  type RimvioNotification,
} from "@/lib/ontology";
import { useAuth } from "@/hooks/use-auth";
import { buildExperienceRoomHref } from "@/lib/globe/project-experience-conversation";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioEmptyStateClass,
  rimvioGhostCtaClass,
  rimvioHeroCtaClass,
  rimvioInboxItemCardClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type GlobeInboxTriggerProps = {
  count: number;
  onOpen: () => void;
  className?: string;
};

/** Always-visible globe inbox entry — badge when pending items exist. */
export function GlobeInboxTrigger({ count, onOpen, className }: GlobeInboxTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex size-10 items-center justify-center",
        rimvioSurfaceCardClass("rounded-full p-0 shadow-sm backdrop-blur-md"),
        className,
      )}
      aria-label={
        count > 0
          ? `${copy.globe.inboxTriggerAria} · ${count}건`
          : copy.globe.inboxTriggerAria
      }
      data-globe-inbox-trigger
    >
      <Inbox className="size-4 text-primary" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-bold leading-none text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

export type GlobeInboxSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: readonly RimvioNotification[];
  needsLogin?: boolean;
  loadError?: string | null;
  onBridgeAccepted?: (eventId: string) => void;
  onBridgeDeclined?: (eventId: string) => void;
  onNotificationDismissed?: (notificationId: string) => void;
  onLocationConfirmed?: (eventId: string) => void;
};

const SECTION_LABEL: Record<RimvioNotification["section"], string> = {
  share: copy.globe.inboxSectionShare,
  bridge_activity: copy.globe.inboxSectionBridgeActivity,
  location: copy.globe.inboxSectionLocation,
  market_align: copy.globe.inboxSectionMarketAlign,
};

/** Unified globe inbox — notification objects (single queue). */
export function GlobeInboxSheet({
  open,
  onOpenChange,
  notifications,
  needsLogin = false,
  loadError = null,
  onBridgeAccepted,
  onBridgeDeclined,
  onNotificationDismissed,
  onLocationConfirmed,
}: GlobeInboxSheetProps) {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [busyBridgeEventId, setBusyBridgeEventId] = useState<string | null>(null);
  const [busyMarketHandshakeId, setBusyMarketHandshakeId] = useState<string | null>(null);
  const [busyLocationEventId, setBusyLocationEventId] = useState<string | null>(null);
  const [dwellConfirmEventId, setDwellConfirmEventId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const grouped = groupNotificationsBySection(notifications);
  const empty = notifications.length === 0;

  const handleAcceptBridge = async (notification: RimvioNotification) => {
    const invite = notification.bridgeInvite;
    if (!invite) {
      return;
    }
    const eventId = invite.state.bridge.eventId;
    setBusyBridgeEventId(eventId);
    try {
      const data = await acceptExperienceBridgeRemote(eventId);
      await completeBridgeInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec.peerThreadId,
        viewerUserId: user?.id,
      });
      toast.success(copy.globe.bridgeInviteAccepted, {
        action: data.pinSpec.peerThreadId
          ? {
              label: copy.globe.bridgeTalkContinueCta,
              onClick: () => {
                router.push(
                  buildExperienceRoomHref({
                    peerThreadId: data.pinSpec.peerThreadId!,
                    eventId,
                    title: invite.state.bridge.title,
                    place: invite.state.bridge.placeLabel ?? "",
                  }),
                );
                onOpenChange(false);
              },
            }
          : undefined,
      });
      onBridgeAccepted?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyBridgeEventId(null);
    }
  };

  const handleDeclineBridge = async (notification: RimvioNotification) => {
    const invite = notification.bridgeInvite;
    if (!invite) {
      return;
    }
    const eventId = invite.state.bridge.eventId;
    setBusyBridgeEventId(eventId);
    try {
      const data = await declineExperienceBridgeRemote(eventId);
      writeLocalBridgeState(data.state);
      toast.message(copy.globe.bridgeInviteDeclined);
      onBridgeDeclined?.(eventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyBridgeEventId(null);
    }
  };

  const handleMarketAlign = async (notification: RimvioNotification) => {
    const offer = notification.marketAlignOffer;
    const handshakeId = offer?.handshakeId?.trim();
    if (!offer || !handshakeId) {
      return;
    }
    setBusyMarketHandshakeId(handshakeId);
    try {
      if (offer.viewerAction === "accept_listing") {
        const accepted = await acceptMarketHandshakeRemote({ handshakeId });
        toast.success(copy.globe.marketHandshakeListingAcceptedToast);
        router.push(peerRoomPath(accepted.threadId));
        onOpenChange(false);
        return;
      }
      if (offer.viewerAction === "open_preview") {
        const started = await startMarketHandshakeChatRemote({ handshakeId });
        router.push(peerRoomPath(started.threadId));
        onOpenChange(false);
        return;
      }
      if (offer.threadId && offer.viewerAction === "open_chat") {
        router.push(peerRoomPath(offer.threadId));
        onOpenChange(false);
      }
    } catch (caught) {
      const message = readMarketHandshakeUserError(
        caught instanceof Error ? caught.message : copy.globe.marketAlignBridgeFail,
      );
      toast.error(message);
    } finally {
      setBusyMarketHandshakeId(null);
    }
  };

  const handleConfirmLocation = (notification: RimvioNotification) => {
    const row = notification.locationConfirm;
    if (!row) {
      return;
    }
    if (!canOfferGlobeLocationPrompt()) {
      return;
    }
    markGlobeLocationPromptOffered();
    if (row.kind === "gps_dwell") {
      setDwellConfirmEventId(row.eventId);
      onOpenChange(false);
      return;
    }
    setBusyLocationEventId(row.eventId);
    const result = verifyFeedCaptureEvent(row.eventId);
    if (result.ok) {
      markGlobeLocationConfirmed(row.place, row.datetime);
      void attachMatchingPoolMediaAfterSeal(row.eventId).then((count) => {
        if (count > 0) {
          toast.success(copy.globe.inboxLocationMediaAttached(count));
        }
      });
      toast.success(copy.globe.inboxLocationConfirmed);
      onLocationConfirmed?.(row.eventId);
    } else {
      toast.error(copy.globe.inboxLocationConfirmFail);
    }
    setBusyLocationEventId(null);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <GlobeDwellConfirmSheet
        eventId={dwellConfirmEventId}
        open={Boolean(dwellConfirmEventId)}
        onOpenChange={(next) => {
          if (!next) {
            setDwellConfirmEventId(null);
          }
        }}
        onConfirmed={(eventId) => {
          setDwellConfirmEventId(null);
          onLocationConfirmed?.(eventId);
        }}
      />
      {createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(rimvioSheetBackdropClass(), "z-[10070]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.inboxTitle}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(rimvioBottomSheetClass(), "z-[10071]")}
            data-globe-inbox-sheet
          >
            <div className="shrink-0 border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("flex items-center gap-1.5", RIMVIO_TYPE.headline)}>
                    <Inbox className="size-4 text-primary" aria-hidden />
                    {copy.globe.inboxTitle}
                  </p>
                  <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
                    {copy.globe.inboxSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={rimvioSheetCloseBtnClass()}
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {needsLogin ? (
                <div className={rimvioEmptyStateClass()}>
                  <p className={RIMVIO_TYPE.body}>{copy.globe.inboxNeedsLogin}</p>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle("/?openGlobeInbox=1")}
                    className={cn(rimvioHeroCtaClass(), "mt-4 w-auto px-6")}
                  >
                    {copy.globe.inboxSignInCta}
                  </button>
                </div>
              ) : loadError ? (
                <p className={cn(rimvioEmptyStateClass(), RIMVIO_TYPE.body)}>
                  {copy.globe.inboxLoadFail}
                  <br />
                  <span className={RIMVIO_TYPE.eyebrow}>{loadError}</span>
                </p>
              ) : empty ? (
                <div className={rimvioEmptyStateClass()}>
                  <p className={RIMVIO_TYPE.body}>{copy.globe.inboxEmpty}</p>
                  <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                    {copy.globe.inboxEmptyHint}
                  </p>
                  <Link
                    href="/peers"
                    onClick={() => onOpenChange(false)}
                    className={cn(rimvioHeroCtaClass(), "mt-4 w-auto px-6")}
                  >
                    {copy.globe.inboxEmptyPeersCta}
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {(["market_align", "share", "bridge_activity", "location"] as const).map((section) => {
                    const rows = grouped[section];
                    if (rows.length === 0) {
                      return null;
                    }
                    return (
                      <section key={section}>
                        <p className={cn("mb-2 px-0.5", RIMVIO_TYPE.eyebrow)}>
                          {SECTION_LABEL[section]}
                        </p>
                        <ul className="space-y-3">
                          {rows.map((notification) => {
                            const busyBridge =
                              notification.kind === "bridge_invite" &&
                              busyBridgeEventId === notification.targetId;
                            const busyMarket =
                              notification.kind === "market_align" &&
                              busyMarketHandshakeId ===
                                notification.marketAlignOffer?.handshakeId;
                            const busyLocation =
                              notification.kind === "location_confirm" &&
                              busyLocationEventId === notification.targetId;

                            return (
                              <li
                                key={notification.id}
                                className={rimvioInboxItemCardClass()}
                                data-rimvio-notification={notification.kind}
                              >
                                {notification.kind === "bridge_invite" ? (
                                  <>
                                    <p className={RIMVIO_TYPE.eyebrow}>
                                      {copy.globe.bridgeInviteEyebrow}
                                    </p>
                                    <p className={cn("mt-0.5 font-semibold", RIMVIO_TYPE.body)}>
                                      {notification.title}
                                    </p>
                                    <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                                      {notification.body}
                                    </p>
                                    {notification.bridgeInvite ? (
                                      <div className="mt-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-black/[0.04]">
                                          <Users className="size-3" aria-hidden />
                                          {notification.bridgeInvite.state.bridge.placeLabel ||
                                            copy.globe.bridgeInvitePlaceFallback}
                                        </span>
                                      </div>
                                    ) : null}
                                    <div className="mt-3 flex gap-2">
                                      <button
                                        type="button"
                                        disabled={busyBridge}
                                        onClick={() => void handleAcceptBridge(notification)}
                                        className={rimvioCompactPrimaryCtaClass()}
                                      >
                                        {busyBridge ? (
                                          <Loader2 className="size-4 animate-spin" aria-hidden />
                                        ) : null}
                                        {notification.primaryCtaLabel}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busyBridge}
                                        onClick={() => void handleDeclineBridge(notification)}
                                        className={rimvioGhostCtaClass()}
                                      >
                                        {notification.dismissCtaLabel}
                                      </button>
                                    </div>
                                  </>
                                ) : notification.kind === "market_align" ? (
                                  <>
                                    <p
                                      className={cn(
                                        "flex items-center gap-1",
                                        RIMVIO_TYPE.eyebrow,
                                        "text-primary",
                                      )}
                                    >
                                      <Handshake className="size-3" aria-hidden />
                                      {copy.globe.inboxSectionMarketAlign}
                                    </p>
                                    <p className={cn("mt-0.5 font-semibold", RIMVIO_TYPE.body)}>
                                      {notification.title}
                                    </p>
                                    <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                                      {notification.body}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                      <button
                                        type="button"
                                        disabled={busyMarket}
                                        onClick={() => void handleMarketAlign(notification)}
                                        className={rimvioCompactPrimaryCtaClass()}
                                      >
                                        {busyMarket ? (
                                          <Loader2 className="size-4 animate-spin" aria-hidden />
                                        ) : null}
                                        {notification.primaryCtaLabel}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busyMarket}
                                        onClick={() => onNotificationDismissed?.(notification.id)}
                                        className={rimvioGhostCtaClass()}
                                      >
                                        {notification.dismissCtaLabel}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {notification.kind === "location_confirm" ? (
                                      <p
                                        className={cn(
                                          "flex items-center gap-1",
                                          RIMVIO_TYPE.eyebrow,
                                          "text-primary",
                                        )}
                                      >
                                        <MapPin className="size-3" aria-hidden />
                                        {SECTION_LABEL.location}
                                      </p>
                                    ) : null}
                                    <p className={cn("mt-0.5 font-semibold", RIMVIO_TYPE.body)}>
                                      {notification.title}
                                    </p>
                                    <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                                      {notification.body}
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                      {notification.primaryCtaHref ? (
                                        <Link
                                          href={notification.primaryCtaHref}
                                          onClick={() => onOpenChange(false)}
                                          className={rimvioCompactPrimaryCtaClass()}
                                        >
                                          {notification.primaryCtaLabel}
                                        </Link>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={busyLocation}
                                          onClick={() => handleConfirmLocation(notification)}
                                          className={rimvioCompactPrimaryCtaClass()}
                                        >
                                          {notification.primaryCtaLabel}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onNotificationDismissed?.(notification.id)
                                        }
                                        className={rimvioGhostCtaClass()}
                                      >
                                        {notification.dismissCtaLabel}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
      )}
    </>
  );
}
